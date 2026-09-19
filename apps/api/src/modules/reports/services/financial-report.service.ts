import { Injectable } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';

import { PrismaService } from '../../../database/prisma.service';
import { InvoiceStatus, Prisma } from '../../../generated/prisma/client';
import { REPORT_GROUP_BY, type ReportGroupBy } from '../constants/report.constants';
import type { RevenueReportDto } from '../dto/revenue-report.dto';
import { ReportTimeService } from './report-time.service';

function formatBucketKey(date: Date, timeZone: string, groupBy: ReportGroupBy): string {
  if (groupBy === REPORT_GROUP_BY.MONTH) {
    return formatInTimeZone(date, timeZone, 'yyyy-MM');
  }

  if (groupBy === REPORT_GROUP_BY.QUARTER) {
    const year = formatInTimeZone(date, timeZone, 'yyyy');
    const month = Number(formatInTimeZone(date, timeZone, 'MM'));
    const quarter = Math.ceil(month / 3);

    return `${year}-Q${quarter}`;
  }

  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

@Injectable()
export class FinancialReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportTime: ReportTimeService,
  ) {}

  async getRevenueReport(icdId: string, query: RevenueReportDto) {
    const range = this.reportTime.resolveRange(query);
    const groupBy = query.groupBy ?? REPORT_GROUP_BY.DAY;

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: {
        createdAt: {
          gte: range.fromAt,
          lt: range.toAtExclusive,
        },
        invoice: {
          serviceOrder: {
            icdId,
          },
        },
      },
      include: {
        payment: true,
        invoice: {
          include: {
            serviceOrder: {
              include: {
                consignee: true,
                items: {
                  include: {
                    serviceType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const series = new Map<string, Prisma.Decimal>();
    const byConsignee = new Map<
      string,
      {
        consigneeId: string;
        consigneeName: string;
        amount: Prisma.Decimal;
      }
    >();
    const byMethod = new Map<string, Prisma.Decimal>();
    const byServiceType = new Map<
      string,
      {
        serviceTypeId: string;
        serviceTypeName: string;
        amount: Prisma.Decimal;
      }
    >();

    let totalRevenue = new Prisma.Decimal(0);

    for (const alloc of allocations) {
      const amount = new Prisma.Decimal(alloc.amount);
      totalRevenue = totalRevenue.plus(amount);

      const bucket = formatBucketKey(alloc.createdAt, range.timeZone, groupBy);
      series.set(bucket, (series.get(bucket) ?? new Prisma.Decimal(0)).plus(amount));

      const consignee = alloc.invoice.serviceOrder.consignee;
      const consigneeKey = consignee.id;
      const currentConsignee = byConsignee.get(consigneeKey) ?? {
        consigneeId: consignee.id,
        consigneeName: consignee.name,
        amount: new Prisma.Decimal(0),
      };
      currentConsignee.amount = currentConsignee.amount.plus(amount);
      byConsignee.set(consigneeKey, currentConsignee);

      const method = alloc.payment.method;
      byMethod.set(method, (byMethod.get(method) ?? new Prisma.Decimal(0)).plus(amount));

      const orderTotal = new Prisma.Decimal(alloc.invoice.serviceOrder.totalAmount);
      const items = alloc.invoice.serviceOrder.items;

      if (items.length > 0 && orderTotal.gt(0)) {
        for (const item of items) {
          const itemAmount = new Prisma.Decimal(item.amount);
          const ratio = itemAmount.dividedBy(orderTotal);
          const allocatedItemAmount = amount.times(ratio);

          const serviceTypeId = item.serviceTypeId;
          const currentType = byServiceType.get(serviceTypeId) ?? {
            serviceTypeId,
            serviceTypeName: item.serviceType.name,
            amount: new Prisma.Decimal(0),
          };
          currentType.amount = currentType.amount.plus(allocatedItemAmount);
          byServiceType.set(serviceTypeId, currentType);
        }
      }
    }

    return {
      period: {
        fromDate: range.fromDate,
        toDate: range.toDate,
        timeZone: range.timeZone,
        groupBy,
      },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        allocationCount: allocations.length,
      },
      series: [...series.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([bucket, amount]) => ({
          bucket,
          amount: Number(amount.toFixed(2)),
        })),
      byConsignee: [...byConsignee.values()]
        .map((entry) => ({
          consigneeId: entry.consigneeId,
          consigneeName: entry.consigneeName,
          amount: Number(entry.amount.toFixed(2)),
        }))
        .sort((left, right) => right.amount - left.amount),
      byMethod: [...byMethod.entries()].map(([method, amount]) => ({
        method,
        amount: Number(amount.toFixed(2)),
      })),
      byServiceType: [...byServiceType.values()]
        .map((entry) => ({
          serviceTypeId: entry.serviceTypeId,
          serviceTypeName: entry.serviceTypeName,
          amount: Number(entry.amount.toFixed(2)),
        }))
        .sort((left, right) => right.amount - left.amount),
    };
  }

  async getOutstandingDebtReport(icdId: string) {
    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
        },
        serviceOrder: {
          icdId,
        },
      },
      include: {
        serviceOrder: {
          include: {
            consignee: true,
          },
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    });

    const consignees = new Map<
      string,
      {
        consigneeId: string;
        consigneeName: string;
        taxCode: string | null;
        totalOutstanding: Prisma.Decimal;
        overdueAmount: Prisma.Decimal;
        invoiceCount: number;
      }
    >();

    let totalOutstanding = new Prisma.Decimal(0);
    let totalOverdue = new Prisma.Decimal(0);

    const rows = invoices.map((inv) => {
      const totalAmount = new Prisma.Decimal(inv.totalAmount);
      const paidAmount = new Prisma.Decimal(inv.paidAmount);
      const outstanding = totalAmount.minus(paidAmount);
      const isOverdue = inv.dueAt !== null && inv.dueAt < now;
      const daysOverdue =
        isOverdue && inv.dueAt
          ? Math.floor((now.getTime() - inv.dueAt.getTime()) / 86_400_000)
          : 0;

      totalOutstanding = totalOutstanding.plus(outstanding);
      if (isOverdue) {
        totalOverdue = totalOverdue.plus(outstanding);
      }

      const consignee = inv.serviceOrder.consignee;
      const entry = consignees.get(consignee.id) ?? {
        consigneeId: consignee.id,
        consigneeName: consignee.name,
        taxCode: consignee.taxCode ?? null,
        totalOutstanding: new Prisma.Decimal(0),
        overdueAmount: new Prisma.Decimal(0),
        invoiceCount: 0,
      };

      entry.totalOutstanding = entry.totalOutstanding.plus(outstanding);
      if (isOverdue) {
        entry.overdueAmount = entry.overdueAmount.plus(outstanding);
      }
      entry.invoiceCount += 1;
      consignees.set(consignee.id, entry);

      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        consignee: {
          id: consignee.id,
          name: consignee.name,
          taxCode: consignee.taxCode,
        },
        issuedAt: inv.issuedAt,
        dueAt: inv.dueAt,
        totalAmount: Number(totalAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        outstandingAmount: Number(outstanding.toFixed(2)),
        isOverdue,
        daysOverdue,
      };
    });

    return {
      asOfAt: now,
      summary: {
        invoiceCount: invoices.length,
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        totalOverdue: Number(totalOverdue.toFixed(2)),
      },
      byConsignee: [...consignees.values()]
        .map((entry) => ({
          consigneeId: entry.consigneeId,
          consigneeName: entry.consigneeName,
          taxCode: entry.taxCode,
          totalOutstanding: Number(entry.totalOutstanding.toFixed(2)),
          overdueAmount: Number(entry.overdueAmount.toFixed(2)),
          invoiceCount: entry.invoiceCount,
        }))
        .sort((left, right) => right.totalOutstanding - left.totalOutstanding),
      data: rows,
    };
  }
}
