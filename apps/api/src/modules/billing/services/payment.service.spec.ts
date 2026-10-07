import { ConflictException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InvoiceStatus, PaymentMethod, Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import type { ContainerEventService } from '../../containers/services/container-event.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';

function duplicateError(meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Duplicate constraint', { code: 'P2002', clientVersion: 'test', meta });
}
function fixture(error: Error) {
  const invoice = { id: 'invoice-1', invoiceNo: 'INV-QA', status: InvoiceStatus.UNPAID, totalAmount: 100, paidAmount: 0, serviceOrder: { icdId: 'icd-1', consigneeId: 'consignee-1', containerVisitId: 'visit-1' } };
  const tx = {
    consignee: { findUnique: jest.fn(async () => ({ id: 'consignee-1' })) },
    invoice: { findUnique: jest.fn(async () => invoice), update: jest.fn() },
    payment: { create: jest.fn().mockRejectedValue(error), findUniqueOrThrow: jest.fn() },
    paymentAllocation: { create: jest.fn() },
  };
  const prisma = { invoice: { findFirst: jest.fn(async () => invoice) }, $transaction: jest.fn(async (action) => action(tx)) };
  const events = { record: jest.fn() };
  const service = new PaymentService(prisma as unknown as PrismaService, events as unknown as ContainerEventService);
  const pay = () => service.createForInvoice('invoice-1', { amount: 100, method: PaymentMethod.CASH, paidAt: '2026-10-02T01:30:00Z', referenceNo: 'LOCAL-QA-DUPLICATE' }, { id: 'admin-1', icdId: 'icd-1' } as AuthenticatedUser);
  return { tx, events, pay };
}

describe('duplicate payment reference', () => {
  it.each([
    { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index: 'payment_payment_ref_key' } } } },
    { target: ['payment_ref'] },
    { target: ['paymentRef'] },
    { target: 'payment_payment_ref_key' },
  ])('returns a business 409 for the reference constraint without allocating or updating the invoice (%j)', async (meta) => {
    const f = fixture(duplicateError(meta));
    try {
      await f.pay();
      throw new Error('Expected duplicate reference refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as ConflictException).getResponse()).toEqual({ code: 'PAYMENT_REFERENCE_DUPLICATE', message: 'Mã tham chiếu thanh toán đã được sử dụng.' });
    }
    expect(f.tx.paymentAllocation.create).not.toHaveBeenCalled();
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
    expect(f.events.record).not.toHaveBeenCalled();
  });

  it.each([
    new Error('Database unavailable'),
    duplicateError({ target: ['id'] }),
    duplicateError({ driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index: 'PRIMARY' } } } }),
  ])('preserves unrelated persistence errors instead of reporting a duplicate reference (%s)', async (error) => {
    const f = fixture(error);
    await expect(f.pay()).rejects.toBe(error);
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
    expect(f.events.record).not.toHaveBeenCalled();
  });
});
