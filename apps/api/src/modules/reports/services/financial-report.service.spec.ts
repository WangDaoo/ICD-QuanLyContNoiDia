import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { FinancialReportService } from './financial-report.service';
import { ReportTimeService } from './report-time.service';

describe('FinancialReportService', () => {
  let service: FinancialReportService;

  const mockPrisma = {
    paymentAllocation: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialReportService,
        ReportTimeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<FinancialReportService>(FinancialReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate revenue based on payment allocations, not invoice total', async () => {
    mockPrisma.paymentAllocation.findMany.mockResolvedValue([
      {
        id: 'alloc-1',
        amount: new Prisma.Decimal('500000.00'),
        createdAt: new Date('2026-03-10T08:00:00.000Z'),
        payment: {
          method: 'BANK_TRANSFER',
        },
        invoice: {
          serviceOrder: {
            totalAmount: new Prisma.Decimal('1000000.00'),
            consignee: {
              id: 'c-1',
              name: 'Samsung Vietnam',
            },
            items: [
              {
                serviceTypeId: 'st-lift',
                amount: new Prisma.Decimal('600000.00'),
                serviceType: {
                  name: 'Nâng hạ container',
                },
              },
              {
                serviceTypeId: 'st-storage',
                amount: new Prisma.Decimal('400000.00'),
                serviceType: {
                  name: 'Lưu bãi container',
                },
              },
            ],
          },
        },
      },
    ]);

    const result = await service.getRevenueReport('icd-1', {
      fromDate: '2026-03-01',
      toDate: '2026-03-15',
    });

    expect(result.summary.totalRevenue).toBe(500000);
    expect(result.summary.allocationCount).toBe(1);
    expect(result.byConsignee[0]?.consigneeName).toBe('Samsung Vietnam');
    expect(result.byConsignee[0]?.amount).toBe(500000);
    expect(result.byMethod[0]?.method).toBe('BANK_TRANSFER');
    expect(result.byServiceType).toHaveLength(2);
    expect(result.byServiceType[0]?.amount).toBe(300000); // 500k * (600k / 1000k)
    expect(result.byServiceType[1]?.amount).toBe(200000); // 500k * (400k / 1000k)
  });

  it('should calculate outstanding debt and overdue amounts correctly', async () => {
    const pastDate = new Date(Date.now() - 5 * 86_400_000); // 5 days ago
    const futureDate = new Date(Date.now() + 5 * 86_400_000); // 5 days from now

    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNo: 'INV-001',
        issuedAt: pastDate,
        dueAt: pastDate,
        totalAmount: new Prisma.Decimal('1000000.00'),
        paidAmount: new Prisma.Decimal('400000.00'),
        serviceOrder: {
          consignee: {
            id: 'c-1',
            name: 'LG Electronics',
            taxCode: '0101234567',
          },
        },
      },
      {
        id: 'inv-2',
        invoiceNo: 'INV-002',
        issuedAt: pastDate,
        dueAt: futureDate,
        totalAmount: new Prisma.Decimal('2000000.00'),
        paidAmount: new Prisma.Decimal('0.00'),
        serviceOrder: {
          consignee: {
            id: 'c-1',
            name: 'LG Electronics',
            taxCode: '0101234567',
          },
        },
      },
    ]);

    const result = await service.getOutstandingDebtReport('icd-1');

    expect(result.summary.invoiceCount).toBe(2);
    expect(result.summary.totalOutstanding).toBe(2600000);
    expect(result.summary.totalOverdue).toBe(600000);
    expect(result.byConsignee[0]?.consigneeName).toBe('LG Electronics');
    expect(result.byConsignee[0]?.totalOutstanding).toBe(2600000);
    expect(result.byConsignee[0]?.overdueAmount).toBe(600000);
  });
});
