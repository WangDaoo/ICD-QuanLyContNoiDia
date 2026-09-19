import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationProvider,
  Prisma,
} from '../../../generated/prisma/client';
import { TokenCipherService } from '../crypto/token-cipher.service';
import { SmtpEmailProvider } from '../providers/smtp-email.provider';
import { FcmPushProvider } from '../providers/fcm-push.provider';
import { ApnsPushProvider } from '../providers/apns-push.provider';

const MAX_RETRIES = 5;

type DeliveryWithRelations = Prisma.NotificationDeliveryGetPayload<{
  include: {
    notification: true;
    device: true;
  };
}>;

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCipher: TokenCipherService,
    private readonly smtpEmailProvider: SmtpEmailProvider,
    private readonly fcmPushProvider: FcmPushProvider,
    private readonly apnsPushProvider: ApnsPushProvider,
  ) {}

  async processPendingDeliveries(batchSize = 25): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }
    this.isProcessing = true;

    try {
      const now = new Date();

      // Find pending or retryable deliveries
      const deliveries = await this.prisma.notificationDelivery.findMany({
        where: {
          OR: [
            { status: NotificationDeliveryStatus.PENDING },
            {
              status: NotificationDeliveryStatus.FAILED,
              retryCount: { lt: MAX_RETRIES },
              nextRetryAt: { lte: now },
            },
          ],
        },
        include: {
          notification: true,
          device: true,
        },
        take: batchSize,
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (deliveries.length === 0) {
        return 0;
      }

      let processedCount = 0;

      for (const delivery of deliveries) {
        // Mark as PROCESSING
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.PROCESSING,
            processingStartedAt: new Date(),
            lastAttemptAt: new Date(),
          },
        });

        try {
          if (delivery.channel === NotificationChannel.EMAIL) {
            await this.dispatchEmail(delivery);
          } else if (delivery.channel === NotificationChannel.PUSH) {
            await this.dispatchPush(delivery);
          }
          processedCount++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await this.handleDeliveryError(delivery, errMsg || 'Unknown dispatch error');
        }
      }

      return processedCount;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error processing deliveries: ${errMsg}`, stack);
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchEmail(delivery: DeliveryWithRelations) {
    const emailTo = delivery.notification.recipientEmail;
    if (!emailTo) {
      await this.handleDeliveryError(delivery, 'No recipient email specified');
      return;
    }

    const result = await this.smtpEmailProvider.sendEmail({
      to: emailTo,
      subject: delivery.notification.title,
      text: delivery.notification.body,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${delivery.notification.title}</h2>
        <p>${delivery.notification.body.replace(/\n/g, '<br/>')}</p>
        ${
          delivery.notification.deepLink
            ? `<p><a href="${delivery.notification.deepLink}" style="display:inline-block;padding:10px 20px;background-color:#0066cc;color:#ffffff;text-decoration:none;border-radius:4px;">View Details</a></p>`
            : ''
        }
      </div>`,
    });

    if (result.success) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
          providerMessageId: result.messageId,
          lastError: null,
        },
      });
    } else {
      await this.handleDeliveryError(delivery, result.error || 'SMTP delivery failed');
    }
  }

  private async dispatchPush(delivery: DeliveryWithRelations) {
    const device = delivery.device;
    if (!device || !device.active) {
      await this.handleDeliveryError(delivery, 'Device not found or inactive', true);
      return;
    }

    let plainToken: string;
    try {
      plainToken = this.tokenCipher.decryptToken({
        tokenCiphertext: device.tokenCiphertext,
        tokenIv: device.tokenIv,
        tokenAuthTag: device.tokenAuthTag,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.handleDeliveryError(delivery, `Token decryption failed: ${errMsg}`, true);
      return;
    }

    const payload = {
      token: plainToken,
      title: delivery.notification.title,
      body: delivery.notification.body,
      deepLink: delivery.notification.deepLink || undefined,
      platform: device.platform,
      data: {
        notificationId: delivery.notification.id,
        type: delivery.notification.type,
        sourceType: delivery.notification.sourceType,
        sourceId: delivery.notification.sourceId,
        ...(delivery.notification.dataJson
          ? Object.fromEntries(
              Object.entries(delivery.notification.dataJson as Record<string, unknown>).map(
                ([k, v]) => [k, String(v)],
              ),
            )
          : {}),
      },
    };

    const provider =
      delivery.provider === NotificationProvider.APNS
        ? this.apnsPushProvider
        : this.fcmPushProvider;

    const result = await provider.sendPush(payload);

    if (result.success) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
          providerMessageId: result.messageId,
          lastError: null,
        },
      });
    } else {
      if (result.invalidToken) {
        // Deactivate device
        await this.prisma.notificationDevice.update({
          where: { id: device.id },
          data: { active: false },
        });
        this.logger.warn(`Device ${device.id} deactivated due to invalid push token`);
      }
      await this.handleDeliveryError(
        delivery,
        result.error || 'Push delivery failed',
        result.invalidToken,
      );
    }
  }

  private async handleDeliveryError(
    delivery: DeliveryWithRelations,
    errorMessage: string,
    isPermanent = false,
  ) {
    const nextRetryCount = delivery.retryCount + 1;
    const isDead = isPermanent || nextRetryCount >= MAX_RETRIES;

    let nextRetryAt: Date | null = null;
    if (!isDead) {
      // Exponential backoff: 10s, 20s, 40s, 80s, 160s (capped at 300s)
      const delaySeconds = Math.min(300, Math.pow(2, nextRetryCount) * 10);
      nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
    }

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: isDead
          ? NotificationDeliveryStatus.DEAD
          : NotificationDeliveryStatus.FAILED,
        retryCount: nextRetryCount,
        nextRetryAt,
        lastError: errorMessage.slice(0, 1000),
      },
    });

    this.logger.warn(
      `Delivery ${delivery.id} failed (${nextRetryCount}/${MAX_RETRIES}). Error: ${errorMessage}`,
    );
  }
}
