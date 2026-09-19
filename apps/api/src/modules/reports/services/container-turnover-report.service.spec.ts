import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma.service';
import { ContainerSize, ContainerType } from '../../../generated/prisma/client';
import { ContainerTurnoverReportService } from './container-turnover-report.service';
import { ReportTimeService } from './report-time.service';

describe('ContainerTurnoverReportService', () => {
  let service: ContainerTurnoverReportService;

  const mockPrisma = {
    containerVisit: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainerTurnoverReportService,
        ReportTimeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ContainerTurnoverReportService>(
      ContainerTurnoverReportService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate dwell hours and turnover metrics correctly', async () => {
    const gateInAt = new Date('2026-03-10T00:00:00.000Z');
    const gateOutAt = new Date('2026-03-12T12:00:00.000Z'); // 60 hours = 2.5 days

    mockPrisma.containerVisit.findMany.mockResolvedValue([
      {
        id: 'v-1',
        gateInAt,
        gateOutAt,
        container: {
          containerNumber: 'TGHU1234567',
          type: ContainerType.DRY,
          size: ContainerSize.SIZE_20,
          isoCode: '22G1',
        },
        houseBl: {
          consignee: {
            id: 'c-1',
            name: 'Company A',
          },
        },
      },
    ]);

    const result = await service.getReport('icd-1', {
      fromDate: '2026-03-01',
      toDate: '2026-03-15',
    });

    expect(result.summary.exitedCount).toBe(1);
    expect(result.summary.averageDwellHours).toBe(60);
    expect(result.summary.minimumDwellHours).toBe(60);
    expect(result.summary.maximumDwellHours).toBe(60);
    expect(result.data[0]?.dwellHours).toBe(60);
    expect(result.data[0]?.dwellDays).toBe(2.5);
    expect(result.byContainerType[0]?.containerType).toBe('DRY');
    expect(result.byContainerType[0]?.count).toBe(1);
  });
});
