import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { ContainerVisitStatus } from '../../../generated/prisma/client';
import type { ReportRangeDto } from '../dto/report-range.dto';
import { ReportTimeService } from './report-time.service';

@Injectable()
export class ContainerTurnoverReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportTime: ReportTimeService,
  ) {}

  async getReport(icdId: string, query: ReportRangeDto) {
    const range = this.reportTime.resolveRange(query);

    const visits = await this.prisma.containerVisit.findMany({
      where: {
        icdId,
        status: ContainerVisitStatus.EXITED,
        gateInAt: {
          not: null,
        },
        gateOutAt: {
          gte: range.fromAt,
          lt: range.toAtExclusive,
        },
      },
      select: {
        id: true,
        gateInAt: true,
        gateOutAt: true,
        container: {
          select: {
            containerNumber: true,
            type: true,
            size: true,
            isoCode: true,
          },
        },
        houseBl: {
          select: {
            consignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        gateOutAt: 'asc',
      },
    });

    const rows = visits.map((visit) => {
      const dwellHours =
        (visit.gateOutAt!.getTime() - visit.gateInAt!.getTime()) / 3_600_000;
      const containerType = String(visit.container.type);

      return {
        containerVisitId: visit.id,
        containerNumber: visit.container.containerNumber,
        containerType,
        consignee: visit.houseBl?.consignee ?? null,
        gateInAt: visit.gateInAt,
        gateOutAt: visit.gateOutAt,
        dwellHours: Number(dwellHours.toFixed(2)),
        dwellDays: Number((dwellHours / 24).toFixed(2)),
      };
    });

    const dwellValues = rows.map((row) => row.dwellHours);

    const byContainerType = new Map<string, number>();

    for (const row of rows) {
      byContainerType.set(
        row.containerType,
        (byContainerType.get(row.containerType) ?? 0) + 1,
      );
    }

    const sum = dwellValues.reduce((total, value) => total + value, 0);

    return {
      period: {
        fromDate: range.fromDate,
        toDate: range.toDate,
        timeZone: range.timeZone,
      },
      summary: {
        exitedCount: rows.length,
        averageDwellHours: rows.length
          ? Number((sum / rows.length).toFixed(2))
          : 0,
        minimumDwellHours: rows.length ? Math.min(...dwellValues) : 0,
        maximumDwellHours: rows.length ? Math.max(...dwellValues) : 0,
      },
      byContainerType: [...byContainerType.entries()].map(
        ([containerType, count]) => ({
          containerType,
          count,
        }),
      ),
      data: rows,
    };
  }
}
