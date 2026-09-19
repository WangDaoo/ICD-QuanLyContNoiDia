import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { YardInventoryEodDto } from '../dto/yard-inventory-eod.dto';
import { ReportTimeService } from './report-time.service';

@Injectable()
export class YardInventoryReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportTime: ReportTimeService,
  ) {}

  async getCurrent(icdId: string) {
    const locations = await this.prisma.containerLocationLog.findMany({
      where: {
        endedAt: null,
        yardSlot: {
          yardBlock: {
            icdId,
          },
        },
      },
      include: {
        yardSlot: {
          include: {
            yardBlock: true,
          },
        },
        containerVisit: {
          include: {
            container: true,
            houseBl: {
              include: {
                consignee: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          yardSlot: {
            yardBlock: {
              blockCode: 'asc',
            },
          },
        },
        {
          yardSlot: {
            rowNo: 'asc',
          },
        },
        {
          yardSlot: {
            bayNo: 'asc',
          },
        },
        {
          yardSlot: {
            tierNo: 'asc',
          },
        },
      ],
    });

    const byBlock = new Map<string, number>();
    const byContainerType = new Map<string, number>();

    for (const location of locations) {
      const blockCode = location.yardSlot.yardBlock.blockCode;
      const containerType = String(location.containerVisit.container.type);

      byBlock.set(blockCode, (byBlock.get(blockCode) ?? 0) + 1);
      byContainerType.set(
        containerType,
        (byContainerType.get(containerType) ?? 0) + 1,
      );
    }

    const operationalSlotCount = await this.prisma.yardSlot.count({
      where: {
        operational: true,
        yardBlock: {
          icdId,
          operational: true,
        },
      },
    });

    return {
      generatedAt: new Date(),
      summary: {
        occupiedSlots: locations.length,
        operationalSlots: operationalSlotCount,
        availableSlots: Math.max(0, operationalSlotCount - locations.length),
        occupancyRate:
          operationalSlotCount > 0
            ? Number((locations.length / operationalSlotCount).toFixed(4))
            : 0,
      },
      byBlock: [...byBlock.entries()].map(([blockCode, count]) => ({
        blockCode,
        count,
      })),
      byContainerType: [...byContainerType.entries()].map(
        ([containerType, count]) => ({
          containerType,
          count,
        }),
      ),
      data: locations.map((location) => ({
        locationId: location.id,
        containerVisitId: location.containerVisitId,
        containerNumber: location.containerVisit.container.containerNumber,
        containerType: String(location.containerVisit.container.type),
        state: location.containerVisit.status,
        consignee: location.containerVisit.houseBl?.consignee ?? null,
        blockCode: location.yardSlot.yardBlock.blockCode,
        slotCode: location.yardSlot.slotCode,
        rowNo: location.yardSlot.rowNo,
        bayNo: location.yardSlot.bayNo,
        tierNo: location.yardSlot.tierNo,
        startedAt: location.startedAt,
      })),
    };
  }

  async getEod(icdId: string, query: YardInventoryEodDto) {
    const point = this.reportTime.resolveEod(query.date, query.timeZone);

    const locations = await this.prisma.containerLocationLog.findMany({
      where: {
        startedAt: {
          lte: point.asOfAt,
        },
        OR: [
          {
            endedAt: null,
          },
          {
            endedAt: {
              gt: point.asOfAt,
            },
          },
        ],
        yardSlot: {
          yardBlock: {
            icdId,
          },
        },
      },
      include: {
        yardSlot: {
          include: {
            yardBlock: true,
          },
        },
        containerVisit: {
          include: {
            container: true,
            houseBl: {
              include: {
                consignee: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          yardSlot: {
            yardBlock: {
              blockCode: 'asc',
            },
          },
        },
        {
          yardSlot: {
            slotCode: 'asc',
          },
        },
      ],
    });

    const byBlock = new Map<string, number>();

    for (const location of locations) {
      const code = location.yardSlot.yardBlock.blockCode;
      byBlock.set(code, (byBlock.get(code) ?? 0) + 1);
    }

    return {
      date: point.date,
      asOfAt: point.asOfAt,
      timeZone: point.timeZone,
      isFinalized: point.isFinalized,
      total: locations.length,
      byBlock: [...byBlock.entries()].map(([blockCode, count]) => ({
        blockCode,
        count,
      })),
      data: locations.map((location) => ({
        containerVisitId: location.containerVisitId,
        containerNumber: location.containerVisit.container.containerNumber,
        containerType: String(location.containerVisit.container.type),
        blockCode: location.yardSlot.yardBlock.blockCode,
        slotCode: location.yardSlot.slotCode,
        locationStartedAt: location.startedAt,
        locationEndedAt: location.endedAt,
      })),
    };
  }
}
