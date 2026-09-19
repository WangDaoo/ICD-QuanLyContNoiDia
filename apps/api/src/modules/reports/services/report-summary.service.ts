import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  OperationalHoldStatus,
} from '../../../generated/prisma/client';
import { REPORT_GROUP_BY } from '../constants/report.constants';
import { EdiHealthReportService } from './edi-health-report.service';
import { FinancialReportService } from './financial-report.service';
import { GateActivityReportService } from './gate-activity-report.service';
import { ReportTimeService } from './report-time.service';

@Injectable()
export class ReportSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportTime: ReportTimeService,
    private readonly gateActivityReport: GateActivityReportService,
    private readonly financialReport: FinancialReportService,
    private readonly ediHealthReport: EdiHealthReportService,
  ) {}

  async getDashboardSummary(icdId: string, timeZoneInput?: string) {
    const todayInfo = this.reportTime.resolveToday(timeZoneInput);
    const timeZone = todayInfo.timeZone;
    const today = todayInfo.date;
    const monthStart = `${today.slice(0, 7)}-01`;
    const now = new Date();

    // 1. Containers currently in yard
    const activeVisits = await this.prisma.containerVisit.findMany({
      where: {
        icdId,
        status: {
          in: [
            ContainerVisitStatus.IN_YARD,
            ContainerVisitStatus.STACKED,
            ContainerVisitStatus.GATE_IN_CONFIRMED,
            ContainerVisitStatus.UNDER_CUSTOMS_HOLD,
            ContainerVisitStatus.CUSTOMS_CLEARED,
            ContainerVisitStatus.GATE_PASS_ISSUED,
          ],
        },
      },
      include: {
        container: true,
        houseBl: {
          include: {
            consignee: true,
          },
        },
      },
    });

    const inYardCount = activeVisits.length;
    const byCategory: Record<string, number> = {};
    const byHoldStatus: Record<string, number> = {};
    const byContainerType: Record<string, number> = {};

    // Get free storage days setting if configured
    const freeDaysSetting = await this.prisma.icdSetting.findUnique({
      where: {
        icdId_key: {
          icdId,
          key: 'BILLING_FREE_STORAGE_DAYS',
        },
      },
    });
    const freeDaysLimit = freeDaysSetting ? Number(freeDaysSetting.value) || 5 : 5;

    const freeDayWarnings: Array<{
      containerVisitId: string;
      containerNumber: string;
      consigneeName: string | null;
      gateInAt: Date | null;
      dwellDays: number;
      freeDaysLimit: number;
      isOverdue: boolean;
      daysRemaining: number;
    }> = [];

    for (const visit of activeVisits) {
      byCategory[visit.category] = (byCategory[visit.category] ?? 0) + 1;
      byHoldStatus[visit.holdStatus] = (byHoldStatus[visit.holdStatus] ?? 0) + 1;
      const cType = String(visit.container.type);
      byContainerType[cType] = (byContainerType[cType] ?? 0) + 1;

      if (visit.gateInAt) {
        const dwellDays = Math.floor(
          (now.getTime() - visit.gateInAt.getTime()) / 86_400_000,
        );
        const daysRemaining = freeDaysLimit - dwellDays;

        if (daysRemaining <= 2) {
          freeDayWarnings.push({
            containerVisitId: visit.id,
            containerNumber: visit.container.containerNumber,
            consigneeName: visit.houseBl?.consignee?.name ?? null,
            gateInAt: visit.gateInAt,
            dwellDays,
            freeDaysLimit,
            isOverdue: daysRemaining < 0,
            daysRemaining,
          });
        }
      }
    }

    freeDayWarnings.sort((a, b) => b.dwellDays - a.dwellDays);

    // 2. Gate activity today
    const gateToday = await this.gateActivityReport.getReport(icdId, {
      fromDate: today,
      toDate: today,
      timeZone,
    });

    // 3. Revenue this month
    const revenueMonth = await this.financialReport.getRevenueReport(icdId, {
      fromDate: monthStart,
      toDate: today,
      timeZone,
      groupBy: REPORT_GROUP_BY.DAY,
    });

    // 4. Outstanding Debt
    const outstandingDebt = await this.financialReport.getOutstandingDebtReport(icdId);

    // 5. Operational holds active
    const activeHoldsCount = await this.prisma.operationalHold.count({
      where: {
        status: OperationalHoldStatus.ACTIVE,
        containerVisit: {
          icdId,
        },
      },
    });

    // 6. EDI alerts
    const ediSummary = await this.ediHealthReport.getSummary(icdId);

    return {
      asOfAt: now,
      timeZone,
      yard: {
        inYardCount,
        byCategory,
        byHoldStatus,
        byContainerType,
      },
      gateToday: {
        gateIn: gateToday.summary.gateIn,
        gateOut: gateToday.summary.gateOut,
        netFlow: gateToday.summary.netFlow,
        hourly: gateToday.hourly,
      },
      freeDayWarnings: {
        freeDaysLimit,
        totalWarnings: freeDayWarnings.length,
        items: freeDayWarnings.slice(0, 15),
      },
      revenueMonth: {
        period: `${monthStart} to ${today}`,
        totalRevenue: revenueMonth.summary.totalRevenue,
        allocationCount: revenueMonth.summary.allocationCount,
        series: revenueMonth.series,
      },
      outstandingDebt: {
        totalOutstanding: outstandingDebt.summary.totalOutstanding,
        totalOverdue: outstandingDebt.summary.totalOverdue,
        invoiceCount: outstandingDebt.summary.invoiceCount,
      },
      operationalHolds: {
        activeCount: activeHoldsCount,
      },
      ediAlerts: {
        activeAlertsCount: ediSummary.activeAlertsCount,
        openCount: ediSummary.openCount,
        acknowledgedCount: ediSummary.acknowledgedCount,
        bySeverity: ediSummary.bySeverity,
      },
    };
  }
}
