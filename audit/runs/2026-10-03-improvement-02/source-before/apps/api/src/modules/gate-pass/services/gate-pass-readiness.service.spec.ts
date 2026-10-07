import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { PrismaService } from '../../../database/prisma.service';
import { ContainerVisitStatus, Prisma } from '../../../generated/prisma/client';
import type { BillingReadinessService } from '../../billing/services/billing-readiness.service';
import type { OperationalHoldReadService } from '../../operational-holds/services/operational-hold-read.service';
import type { YardReadinessService } from '../../yard/services/yard-readiness.service';
import { GATE_PASS_BLOCKER_CODES } from '../constants/gate-pass-blocker-codes.constants';
import { GatePassReadinessService } from './gate-pass-readiness.service';

function actor(permissionCodes: string[], roleCodes = ['GATE_STAFF']): AuthenticatedUser {
  return {
    id: 'user-1', sessionId: 'session-1', icdId: 'icd-1',
    name: 'Field Operator', email: 'field@icd.local', roleCodes, permissionCodes,
  };
}

function fixture(state: ContainerVisitStatus = ContainerVisitStatus.IN_YARD) {
  const db = { containerVisit: { findFirst: jest.fn().mockResolvedValue({ id: 'visit-1', state }) } };
  const yard = {
    checkWithDb: jest.fn().mockResolvedValue({
      currentLocation: { id: 'location-1', yardSlotId: 'slot-1' },
      activeOperations: { movementCount: 0, inspectionCount: 0, bookingCount: 0, hasActiveOperations: false },
      inspectionHoldCount: 0,
    }),
  };
  const holds = { findActiveWithDb: jest.fn().mockResolvedValue([]) };
  const billingData = {
    hasNoOrders: false,
    pendingOrders: [{ id: 'order-secret', orderNumber: 'SO-SECRET', status: 'DRAFT' }],
    unpaidInvoices: [{
      id: 'invoice-secret', invoiceNo: 'INV-SECRET', status: 'PARTIALLY_PAID',
      totalAmount: 1000000, paidAmount: 300000, outstandingAmount: 700000,
    }],
    unbilledServicesCount: 2,
    billingConfigMissing: false,
  };
  const billing = { checkWithDb: jest.fn().mockResolvedValue(billingData) };
  const service = new GatePassReadinessService(
    db as unknown as PrismaService,
    yard as unknown as YardReadinessService,
    holds as unknown as OperationalHoldReadService,
    billing as unknown as BillingReadinessService,
  );
  return { db, billingData, billing, service };
}

describe('Gate-pass readiness billing visibility', () => {
  it.each(['GATE_STAFF', 'YARD_STAFF', 'ADMIN'])('redacts financial records for %s without billing grants while retaining blocker data', async role => {
    const f = fixture();
    const result = await f.service.evaluateReadiness('visit-1', actor(['container.read'], [role]));
    expect(result.details.billing).toEqual({
      hasNoOrders: false,
      pendingOrders: [{ status: 'DRAFT' }],
      unpaidInvoices: [{ status: 'PARTIALLY_PAID' }],
      unbilledServicesCount: 2,
      billingConfigMissing: false,
    });
    expect(result.ready).toBe(false);
    expect(result.isReady).toBe(false);
    expect(result.blockers).toEqual([
      GATE_PASS_BLOCKER_CODES.BILLING_INCOMPLETE,
      GATE_PASS_BLOCKER_CODES.UNBILLED_SERVICES,
    ]);
    expect(f.billingData.unpaidInvoices[0]?.outstandingAmount).toBe(700000);
    expect(f.billingData.pendingOrders[0]?.orderNumber).toBe('SO-SECRET');
  });

  it.each(['billing.read', 'billing.manage'])('preserves full financial detail for an actor granted %s', async permission => {
    const f = fixture();
    const result = await f.service.evaluateReadiness('visit-1', actor([permission]));
    expect(result.details.billing).toEqual(f.billingData);
    expect(result.blockers).toContain(GATE_PASS_BLOCKER_CODES.BILLING_INCOMPLETE);
  });

  it('keeps the gate-out system recheck blocked after redacting its unused financial detail', async () => {
    const f = fixture(ContainerVisitStatus.GATE_PASS_ISSUED);
    const result = await f.service.checkWithDb(f.db as unknown as Prisma.TransactionClient, 'visit-1', 'icd-1');
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain(GATE_PASS_BLOCKER_CODES.BILLING_INCOMPLETE);
    expect(result.details.billing.unpaidInvoices).toEqual([{ status: 'PARTIALLY_PAID' }]);
    expect(f.billing.checkWithDb).toHaveBeenCalledWith(f.db, 'visit-1', expect.objectContaining({ icdId: 'icd-1' }));
  });
});
