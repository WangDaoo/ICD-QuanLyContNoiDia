import { Invoice, InvoiceStatus, Prisma } from '../../../generated/prisma/client';

export const INVOICE_DETAIL_INCLUDE = {
  serviceOrder: {
    include: {
      containerVisit: {
        include: {
          container: true,
        },
      },
      consignee: true,
      items: {
        include: {
          serviceType: true,
        },
      },
    },
  },
  allocations: {
    include: {
      payment: {
        include: {
          consignee: true,
          recordedByUser: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      },
    },
  },
} as const;

export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_DETAIL_INCLUDE;
}>;

export function mapInvoice(invoice: InvoiceWithDetails) {
  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.paidAmount);
  const outstandingAmount = Math.max(0, total - paid);
  const isOverdue =
    invoice.dueAt !== null &&
    new Date(invoice.dueAt).getTime() < Date.now() &&
    invoice.status !== InvoiceStatus.PAID &&
    invoice.status !== InvoiceStatus.VOID;

  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    serviceOrderId: invoice.serviceOrderId,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    totalAmount: total,
    paidAmount: paid,
    outstandingAmount,
    status: invoice.status,
    isOverdue,
    serviceOrder: invoice.serviceOrder,
    allocations: invoice.allocations.map((a: {
      id: string;
      paymentId: string;
      amount: Prisma.Decimal | number;
      createdAt: Date;
      payment?: unknown;
    }) => {
      const p = a.payment as
        | {
            id: string;
            paymentRef: string;
            amount: Prisma.Decimal | number;
            method: string;
            paidAt: Date;
            consignee: unknown;
            recordedByUser: unknown;
          }
        | null
        | undefined;
      return {
        id: a.id,
        paymentId: a.paymentId,
        amount: Number(a.amount),
        createdAt: a.createdAt,
        payment: p
          ? {
              id: p.id,
              paymentRef: p.paymentRef,
              amount: Number(p.amount),
              method: p.method,
              paidAt: p.paidAt,
              consignee: p.consignee,
              recordedByUser: p.recordedByUser,
            }
          : null,
      };
    }),
  };
}
