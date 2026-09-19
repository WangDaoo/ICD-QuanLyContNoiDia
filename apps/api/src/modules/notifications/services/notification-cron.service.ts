import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  GatePassStatus,
  NotificationDeliveryStatus,
  NotificationType,
} from '../../../generated/prisma/client';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationTriggerService } from './notification-trigger.service';

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly triggerService: NotificationTriggerService,
  ) {}

  @Cron('*/15 * * * * *') // Run every 15 seconds
  async handleDispatcherCron() {
    try {
      const processed = await this.dispatcher.processPendingDeliveries(50);
      if (processed > 0) {
        this.logger.debug(`Dispatched ${processed} notification deliveries.`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error in dispatcher cron: ${errMsg}`, stack);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleGatePassExpiringCheck() {
    try {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hourSlot = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH

      const expiringPasses = await this.prisma.gatePass.findMany({
        where: {
          status: GatePassStatus.ACTIVE,
          expiresAt: {
            gte: now,
            lte: twoHoursLater,
          },
        },
        include: {
          containerVisit: {
            include: {
              container: true,
            },
          },
          issuedByUser: true,
        },
        take: 100,
      });

      for (const pass of expiringPasses) {
        const dedupeKey = `GATE_PASS_EXPIRING:${pass.id}:${hourSlot}`;
        const containerNo = pass.containerVisit?.container?.containerNumber || 'Unknown';
        const icdId = pass.containerVisit?.icdId;
        if (!icdId) continue;

        await this.triggerService.emitNotification({
          type: NotificationType.GATE_PASS_EXPIRING,
          icdId,
          recipientUserId: pass.issuedById || undefined,
          title: `Gate Pass Expiring Soon: ${pass.code}`,
          body: `Gate Pass ${pass.code} for container ${containerNo} will expire at ${pass.expiresAt.toISOString()}.`,
          deepLink: `/gate-passes/${pass.id}`,
          sourceType: 'GatePass',
          sourceId: pass.id,
          dedupeKey,
          dataJson: {
            passId: pass.id,
            passNumber: pass.code,
            expiresAt: pass.expiresAt,
            containerNo,
          },
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error in Gate Pass expiring check: ${errMsg}`, stack);
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async handleFreeStorageExpiringCheck() {
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // Look for containers in yard for > 5 days without billing
      const thresholdDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const candidateVisits = await this.prisma.containerVisit.findMany({
        where: {
          status: {
            in: [ContainerVisitStatus.IN_YARD, ContainerVisitStatus.STACKED],
          },
          gateInAt: {
            lte: thresholdDate,
          },
        },
        include: {
          container: true,
        },
        take: 100,
      });

      for (const visit of candidateVisits) {
        const dedupeKey = `FREE_STORAGE_EXPIRING:${visit.id}:${today}`;
        const containerNo = visit.container?.containerNumber || 'Unknown';

        await this.triggerService.emitNotification({
          type: NotificationType.FREE_STORAGE_EXPIRING,
          icdId: visit.icdId,
          title: `Free Storage Expiring Warning: ${containerNo}`,
          body: `Container ${containerNo} has been in yard since ${visit.gateInAt?.toISOString().slice(0, 10)}. Free storage period is nearing expiry.`,
          deepLink: `/containers/${visit.id}`,
          sourceType: 'ContainerVisit',
          sourceId: visit.id,
          dedupeKey,
          dataJson: {
            containerVisitId: visit.id,
            containerNo,
            gateInAt: visit.gateInAt,
          },
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error in Free Storage expiring check: ${errMsg}`, stack);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleStalledDeliveriesReconciliation() {
    try {
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes in processing

      const result = await this.prisma.notificationDelivery.updateMany({
        where: {
          status: NotificationDeliveryStatus.PROCESSING,
          processingStartedAt: {
            lte: staleThreshold,
          },
        },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          lastError: 'Delivery processing timeout. Recovered by reconciliation.',
          nextRetryAt: new Date(Date.now() + 30 * 1000), // Retry in 30 seconds
        },
      });

      if (result.count > 0) {
        this.logger.warn(`Recovered ${result.count} stalled notification deliveries.`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Error reconciling stalled deliveries: ${errMsg}`, stack);
    }
  }
}
