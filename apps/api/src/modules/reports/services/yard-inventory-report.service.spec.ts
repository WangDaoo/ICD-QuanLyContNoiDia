import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerSize,
  ContainerType,
  ContainerVisitStatus,
} from '../../../generated/prisma/client';
import { ReportTimeService } from './report-time.service';
import { YardInventoryReportService } from './yard-inventory-report.service';

describe('YardInventoryReportService', () => {
  let service: YardInventoryReportService;

  const mockPrisma = {
    containerLocationLog: {
      findMany: jest.fn(),
    },
    yardSlot: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YardInventoryReportService,
        ReportTimeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<YardInventoryReportService>(YardInventoryReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return current inventory and occupancy rate', async () => {
    mockPrisma.containerLocationLog.findMany.mockResolvedValue([
      {
        id: 'loc-1',
        containerVisitId: 'v-1',
        startedAt: new Date('2026-03-10T00:00:00.000Z'),
        yardSlot: {
          slotCode: 'A-01-01-1',
          rowNo: 1,
          bayNo: 1,
          tierNo: 1,
          yardBlock: {
            blockCode: 'A',
          },
        },
        containerVisit: {
          status: ContainerVisitStatus.STACKED,
          container: {
            containerNumber: 'TGHU1234567',
            type: ContainerType.DRY,
            size: ContainerSize.SIZE_20,
          },
          houseBl: {
            consignee: {
              name: 'Samsung',
            },
          },
        },
      },
    ]);

    mockPrisma.yardSlot.count.mockResolvedValue(10);

    const result = await service.getCurrent('icd-1');

    expect(result.summary.occupiedSlots).toBe(1);
    expect(result.summary.operationalSlots).toBe(10);
    expect(result.summary.availableSlots).toBe(9);
    expect(result.summary.occupancyRate).toBe(0.1);
    expect(result.byBlock[0]?.blockCode).toBe('A');
    expect(result.byBlock[0]?.count).toBe(1);
  });

  it('should return EOD historical inventory accurately', async () => {

    mockPrisma.containerLocationLog.findMany.mockResolvedValue([
      {
        id: 'loc-1',
        containerVisitId: 'v-1',
        startedAt: new Date('2026-03-09T00:00:00.000Z'),
        endedAt: new Date('2026-03-11T00:00:00.000Z'),
        yardSlot: {
          slotCode: 'A-01-01-1',
          yardBlock: {
            blockCode: 'A',
          },
        },
        containerVisit: {
          container: {
            containerNumber: 'TGHU1234567',
            type: ContainerType.DRY,
          },
        },
      },
    ]);

    const result = await service.getEod('icd-1', {
      date: '2026-03-10',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    expect(result.date).toBe('2026-03-10');
    expect(result.total).toBe(1);
    expect(result.data[0]?.containerNumber).toBe('TGHU1234567');
  });
});
