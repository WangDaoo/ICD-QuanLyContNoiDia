import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  EdiAlertSeverity,
  EdiAlertStatus,
} from '../../../generated/prisma/client';

@Injectable()
export class EdiHealthReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(icdId: string) {
    const alerts = await this.prisma.ediAlert.findMany({
      where: {
        icdId,
        status: {
          in: [EdiAlertStatus.OPEN, EdiAlertStatus.ACKNOWLEDGED],
        },
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        status: true,
        title: true,
        occurrenceCount: true,
        lastOccurredAt: true,
      },
      orderBy: {
        lastOccurredAt: 'desc',
      },
    });

    const openCount = alerts.filter((a) => a.status === EdiAlertStatus.OPEN).length;
    const acknowledgedCount = alerts.filter(
      (a) => a.status === EdiAlertStatus.ACKNOWLEDGED,
    ).length;

    const criticalCount = alerts.filter(
      (a) => a.severity === EdiAlertSeverity.CRITICAL,
    ).length;
    const errorCount = alerts.filter(
      (a) => a.severity === EdiAlertSeverity.ERROR,
    ).length;
    const warningCount = alerts.filter(
      (a) => a.severity === EdiAlertSeverity.WARNING,
    ).length;

    // Outbox status summary for container visits in this ICD
    const outboxCounts = await this.prisma.ediOutboxMessage.groupBy({
      by: ['status'],
      where: {
        containerVisit: {
          icdId,
        },
      },
      _count: {
        id: true,
      },
    });

    const outboxSummary: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      DEAD: 0,
    };

    for (const group of outboxCounts) {
      outboxSummary[group.status] = group._count.id;
    }

    return {
      activeAlertsCount: alerts.length,
      openCount,
      acknowledgedCount,
      bySeverity: {
        critical: criticalCount,
        error: errorCount,
        warning: warningCount,
      },
      outboxSummary,
      recentAlerts: alerts.slice(0, 10),
    };
  }
}
