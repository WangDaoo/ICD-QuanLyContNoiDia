import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { ReportRangeDto } from '../dto/report-range.dto';
import { ReportTimeService } from './report-time.service';

@Injectable()
export class GateActivityReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportTime: ReportTimeService,
  ) {}

  async getReport(icdId: string, query: ReportRangeDto) {
    const range = this.reportTime.resolveRange(query);

    const visits = await this.prisma.containerVisit.findMany({
      where: {
        icdId,
        OR: [
          {
            gateInAt: {
              gte: range.fromAt,
              lt: range.toAtExclusive,
            },
          },
          {
            gateOutAt: {
              gte: range.fromAt,
              lt: range.toAtExclusive,
            },
          },
        ],
      },
      select: {
        id: true,
        gateInAt: true,
        gateOutAt: true,
      },
    });

    const daily = new Map<
      string,
      {
        gateIn: number;
        gateOut: number;
      }
    >();

    const hourly = Array.from(
      {
        length: 24,
      },
      (_, hour) => ({
        hour,
        gateIn: 0,
        gateOut: 0,
      }),
    );

    let totalGateIn = 0;
    let totalGateOut = 0;

    for (const visit of visits) {
      if (
        visit.gateInAt &&
        visit.gateInAt >= range.fromAt &&
        visit.gateInAt < range.toAtExclusive
      ) {
        totalGateIn += 1;

        const date = this.reportTime.bucketDate(visit.gateInAt, range.timeZone);

        const value = daily.get(date) ?? {
          gateIn: 0,
          gateOut: 0,
        };

        value.gateIn += 1;
        daily.set(date, value);

        const hour = this.reportTime.bucketHour(visit.gateInAt, range.timeZone);
        hourly[hour]!.gateIn += 1;
      }

      if (
        visit.gateOutAt &&
        visit.gateOutAt >= range.fromAt &&
        visit.gateOutAt < range.toAtExclusive
      ) {
        totalGateOut += 1;

        const date = this.reportTime.bucketDate(visit.gateOutAt, range.timeZone);

        const value = daily.get(date) ?? {
          gateIn: 0,
          gateOut: 0,
        };

        value.gateOut += 1;
        daily.set(date, value);

        const hour = this.reportTime.bucketHour(visit.gateOutAt, range.timeZone);
        hourly[hour]!.gateOut += 1;
      }
    }

    return {
      period: {
        fromDate: range.fromDate,
        toDate: range.toDate,
        timeZone: range.timeZone,
      },
      summary: {
        gateIn: totalGateIn,
        gateOut: totalGateOut,
        netFlow: totalGateIn - totalGateOut,
      },
      daily: [...daily.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, value]) => ({
          date,
          ...value,
        })),
      /**
       * Phân bổ theo hour-of-day trong toàn khoảng đang xem.
       * Chọn 1 ngày ở UI sẽ cho đúng biểu đồ "theo giờ trong ngày".
       */
      hourly,
    };
  }
}
