import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertType,
  EdiOutboxStatus,
  EdiTransport,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { EdiConfigService } from './edi-config.service';
import { EdiAlertService } from './edi-alert.service';
import { EdiMockTransport } from '../transports/edi-mock.transport';
import { EdiHttpsTransport } from '../transports/edi-https.transport';
import { EdiSftpTransport } from '../transports/edi-sftp.transport';
import {
  EdiDeliveryInput,
  EdiDeliveryResult,
} from '../transports/edi-transport.interface';
import { EdiRoutingSnapshot } from '../schemas/edi-routing-snapshot.schema';
import { EDI_DEFAULT_CONFIG } from '../constants/edi-settings.constants';

@Injectable()
export class EdiDispatcherService {
  private readonly logger = new Logger(EdiDispatcherService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: EdiConfigService,
    private readonly alertService: EdiAlertService,
    private readonly mockTransport: EdiMockTransport,
    private readonly httpsTransport: EdiHttpsTransport,
    private readonly sftpTransport: EdiSftpTransport,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleScheduledDispatch() {
    if (this.isProcessing) {
      this.logger.debug('EDI Dispatcher is already running, skipping cycle.');
      return;
    }

    try {
      this.isProcessing = true;
      await this.recoverStaleProcessing();
      await this.dispatchPendingBatch();
    } catch (error) {
      this.logger.error('Error during scheduled EDI dispatch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async triggerManualDispatch() {
    await this.recoverStaleProcessing();
    return this.dispatchPendingBatch();
  }

  async recoverStaleProcessing() {
    const staleSeconds = EDI_DEFAULT_CONFIG.processingStaleSeconds;
    const staleThreshold = new Date(Date.now() - staleSeconds * 1000);

    const staleResult = await this.prisma.ediOutboxMessage.updateMany({
      where: {
        status: EdiOutboxStatus.PROCESSING,
        processingStartedAt: {
          lt: staleThreshold,
        },
      },
      data: {
        status: EdiOutboxStatus.PENDING,
      },
    });

    if (staleResult.count > 0) {
      this.logger.warn(`Recovered ${staleResult.count} stale PROCESSING EDI messages back to PENDING`);
    }
  }

  async dispatchPendingBatch(limit = 50) {
    const now = new Date();

    const messages = await this.prisma.ediOutboxMessage.findMany({
      where: {
        status: EdiOutboxStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    this.logger.log(`Dispatching ${messages.length} EDI messages`);

    let sentCount = 0;
    let failedCount = 0;

    for (const msg of messages) {
      const lockAcquired = await this.prisma.ediOutboxMessage.updateMany({
        where: {
          id: msg.id,
          status: EdiOutboxStatus.PENDING,
        },
        data: {
          status: EdiOutboxStatus.PROCESSING,
          processingStartedAt: now,
          lastAttemptAt: now,
        },
      });

      if (lockAcquired.count === 0) {
        continue;
      }

      const routingSnapshot = msg.routingSnapshot as unknown as EdiRoutingSnapshot;
      const payloadSnapshot = msg.payloadSnapshot as unknown;

      const input: EdiDeliveryInput = {
        messageId: msg.id,
        messageType: msg.messageType,
        idempotencyKey: msg.idempotencyKey,
        requestId: msg.requestId,
        payload: payloadSnapshot,
        routing: routingSnapshot,
      };

      let deliveryResult: EdiDeliveryResult | null = null;
      let deliveryError: string | null = null;

      try {
        deliveryResult = await this.sendViaTransport(routingSnapshot.transport, input);
      } catch (err: unknown) {
        deliveryError = err instanceof Error ? err.message : 'Unknown dispatch exception';
      }

      if (deliveryResult) {
        await this.prisma.ediOutboxMessage.update({
          where: { id: msg.id },
          data: {
            status: EdiOutboxStatus.SENT,
            sentAt: new Date(),
            externalReference: deliveryResult.externalReference ?? null,
            lastError: null,
          },
        });
        sentCount++;
      } else {
        const nextAttemptCount = msg.retryCount + 1;
        const config = await this.configService.getConfig(routingSnapshot.icdId);
        const maxRetries = config.maxRetries;

        const isDead = nextAttemptCount >= maxRetries;
        const nextStatus = isDead ? EdiOutboxStatus.DEAD : EdiOutboxStatus.FAILED;

        let nextRetryAt: Date | null = null;
        if (!isDead) {
          const backoffSec =
            config.baseBackoffSeconds *
            Math.pow(2, nextAttemptCount - 1);
          const cappedBackoffSec = Math.min(backoffSec, config.maxBackoffSeconds);
          nextRetryAt = new Date(Date.now() + cappedBackoffSec * 1000);
        }

        await this.prisma.ediOutboxMessage.update({
          where: { id: msg.id },
          data: {
            status: nextStatus,
            retryCount: nextAttemptCount,
            nextRetryAt,
            lastError: deliveryError ?? 'Unknown error',
          },
        });

        try {
          await this.alertService.createOrUpdateAlert({
            icdId: routingSnapshot.icdId,
            sourceType: EdiAlertSourceType.OUTBOX,
            sourceId: msg.id,
            alertType: EdiAlertType.DELIVERY_FAILURE,
            severity: isDead
              ? EdiAlertSeverity.CRITICAL
              : EdiAlertSeverity.ERROR,
            title: `Lỗi truyền tin EDI (${nextStatus}) - ${msg.messageType}`,
            message: `Thông điệp ${msg.id} gặp lỗi khi gửi: ${deliveryError ?? 'Không xác định'}. Lần thử: ${nextAttemptCount}/${maxRetries}.`,
          });
        } catch (alertErr) {
          this.logger.error(`Failed to create alert for message ${msg.id}:`, alertErr);
        }

        failedCount++;
      }
    }

    return {
      processed: messages.length,
      sent: sentCount,
      failed: failedCount,
    };
  }

  private async sendViaTransport(
    transport: EdiTransport,
    input: EdiDeliveryInput,
  ): Promise<EdiDeliveryResult> {
    switch (transport) {
      case EdiTransport.MOCK:
        return this.mockTransport.deliver(input);
      case EdiTransport.HTTPS:
        return this.httpsTransport.deliver(input);
      case EdiTransport.SFTP:
        return this.sftpTransport.deliver(input);
      default:
        throw new Error(`Unsupported transport type: ${transport}`);
    }
  }
}
