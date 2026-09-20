import { Prisma } from '../../../generated/prisma/client';

export const PAYMENT_DETAIL_INCLUDE = {
  consignee: true,
  recordedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  allocations: {
    include: {
      invoice: {
        include: {
          serviceOrder: {
            include: {
              containerVisit: {
                include: {
                  container: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type PaymentWithDetails = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_DETAIL_INCLUDE;
}>;

export function mapPayment(payment: PaymentWithDetails) {
  const totalAmount = Number(payment.amount);
  const allocatedAmount = payment.allocations.reduce((sum: number, a) => sum + Number(a.amount), 0);
  const unallocatedAmount = Math.max(0, totalAmount - allocatedAmount);

  return {
    id: payment.id,
    paymentRef: payment.paymentRef,
    consigneeId: payment.consigneeId,
    amount: totalAmount,
    allocatedAmount,
    unallocatedAmount,
    method: payment.method,
    paidAt: payment.paidAt,
    recordedById: payment.recordedById,
    consignee: payment.consignee,
    recordedByUser: payment.recordedByUser,
    allocations: payment.allocations.map((a) => ({
      id: a.id,
      invoiceId: a.invoiceId,
      amount: Number(a.amount),
      createdAt: a.createdAt,
      invoice: a.invoice
        ? {
            id: a.invoice.id,
            invoiceNo: a.invoice.invoiceNo,
            totalAmount: Number(a.invoice.totalAmount),
            paidAmount: Number(a.invoice.paidAmount),
            status: a.invoice.status,
            serviceOrder: a.invoice.serviceOrder,
          }
        : null,
    })),
  };
}
