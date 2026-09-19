import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma.service';
import { GateActivityReportService } from './gate-activity-report.service';
import { ReportTimeService } from './report-time.service';

describe('GateActivityReportService', () => {
  let service: GateActivityReportService;

  const mockPrisma = {
    containerVisit: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateActivityReportService,
        ReportTimeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<GateActivityReportService>(GateActivityReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should summarize gate in and out correctly', async () => {
    mockPrisma.containerVisit.findMany.mockResolvedValue([
      {
        id: 'v-1',
        gateInAt: new Date('2026-03-10T02:00:00.000Z'), // 09:00 VN
        gateOutAt: null,
      },
      {
        id: 'v-2',
        gateInAt: null,
        gateOutAt: new Date('2026-03-10T07:00:00.000Z'), // 14:00 VN
      },
      {
        id: 'v-3',
        gateInAt: new Date('2026-03-11T03:00:00.000Z'),
        gateOutAt: new Date('2026-03-11T10:00:00.000Z'),
      },
    ]);

    const result = await service.getReport('icd-1', {
      fromDate: '2026-03-10',
      toDate: '2026-03-11',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    expect(result.summary.gateIn).toBe(2);
    expect(result.summary.gateOut).toBe(2);
    expect(result.summary.netFlow).toBe(0);
    expect(result.daily.length).toBe(2);
    expect(result.hourly.length).toBe(24);
  });
});
