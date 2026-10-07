import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { PrismaService } from '../../../database/prisma.service';
import { ContainerInspectionResult, InYardBookingType } from '../../../generated/prisma/client';
import type { ContainerEventService } from '../../containers/services/container-event.service';
import { ContainerInspectionPolicy } from '../policies/container-inspection.policy';
import { InYardBookingPolicy } from '../policies/in-yard-booking.policy';
import { ContainerInspectionService } from './container-inspection.service';
import { InYardBookingService } from './in-yard-booking.service';
import type { NotificationTriggerService } from '../../notifications/services/notification-trigger.service';

const actor = { id: 'operator', icdId: 'icd-1' } as AuthenticatedUser;

function fixture() {
  const visit = { id: 'visit-1', state: 'IN_YARD' };
  const operation = {
    id: 'operation-1', containerVisitId: visit.id, status: 'IN_PROGRESS',
    inspectionType: 'CUSTOMS', bookingType: 'STUFFING', notes: 'Inspection notes',
    scheduledAt: new Date('2026-10-02T02:30:00Z'), conditionNotes: 'Booking notes',
    result: null as string | null, actualPackageCount: null, actualWeight: null,
    startedAt: new Date('2026-10-02T02:00:00Z'),
  };
  const model = {
    findFirst: jest.fn(async () => ({ ...operation })),
    create: jest.fn(async ({ data }) => ({ ...operation, ...data })),
    update: jest.fn(async ({ data }) => Object.assign(operation, data)),
  };
  const tx = {
    $queryRaw: jest.fn(async (_sql: { values: unknown[] }) => []),
    containerVisit: { findFirst: jest.fn(async () => ({ ...visit })) },
    containerInspection: model,
    inYardBooking: model,
  };
  const prisma = { ...tx, user: { findMany: jest.fn(async () => []) }, $transaction: jest.fn(async (fn) => fn(tx)) };
  const events = { record: jest.fn() };
  const inspection = new ContainerInspectionService(
    prisma as unknown as PrismaService,
    new ContainerInspectionPolicy(),
    events as unknown as ContainerEventService,
    {} as NotificationTriggerService,
  );
  const booking = new InYardBookingService(
    prisma as unknown as PrismaService,
    new InYardBookingPolicy(),
    events as unknown as ContainerEventService,
  );
  return { visit, operation, model, tx, prisma, events, inspection, booking };
}

const cases = [
  {
    kind: 'inspection',
    create: (f: ReturnType<typeof fixture>) => f.inspection.requestInspection(
      'visit-1', { inspectionType: 'CUSTOMS', notes: 'Customs inspection' }, actor,
    ),
    start: (f: ReturnType<typeof fixture>) => f.inspection.startInspection('operation-1', actor),
    complete: (f: ReturnType<typeof fixture>) => f.inspection.completeInspection(
      'operation-1', { result: ContainerInspectionResult.HOLD, notes: 'Customs hold' }, actor,
    ),
    cancel: (f: ReturnType<typeof fixture>) => f.inspection.cancelInspection(
      'operation-1', { reason: 'Cancel request' }, actor,
    ),
  },
  {
    kind: 'booking',
    create: (f: ReturnType<typeof fixture>) => f.booking.createBooking(
      'visit-1', { bookingType: InYardBookingType.STUFFING, scheduledAt: '2026-10-02T02:30:00Z' }, actor,
    ),
    start: (f: ReturnType<typeof fixture>) => f.booking.startBooking('operation-1', actor),
    complete: (f: ReturnType<typeof fixture>) => f.booking.completeBooking(
      'operation-1', { actualPackageCount: 2, actualWeight: 100 }, actor,
    ),
    cancel: (f: ReturnType<typeof fixture>) => f.booking.cancelBooking(
      'operation-1', { reason: 'Cancel request' }, actor,
    ),
  },
];

describe.each(cases)('$kind operation serialization', (commands) => {
  it('rejects a create when gate-pass issuance changed the visit while waiting for its lock', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async () => { f.visit.state = 'GATE_PASS_ISSUED'; return []; });
    await expect(commands.create(f)).rejects.toThrow('IN_YARD');
    expect(f.model.create).not.toHaveBeenCalled();
    expect(f.events.record).not.toHaveBeenCalled();
  });

  it('rejects starting an operation cancelled while waiting for the visit lock', async () => {
    const f = fixture();
    f.operation.status = 'PENDING';
    f.tx.$queryRaw.mockImplementation(async () => { f.operation.status = 'CANCELLED'; return []; });
    await expect(commands.start(f)).rejects.toThrow('PENDING');
    expect(f.model.update).not.toHaveBeenCalled();
  });

  it('rejects completing an operation cancelled while waiting for the visit lock', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async () => { f.operation.status = 'CANCELLED'; return []; });
    await expect(commands.complete(f)).rejects.toThrow('IN_PROGRESS');
    expect(f.model.update).not.toHaveBeenCalled();
  });

  it('does not let cancellation overwrite a completion observed after the visit lock', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async () => {
      f.operation.status = 'COMPLETED'; f.operation.result = 'HOLD'; return [];
    });
    await expect(commands.cancel(f)).rejects.toThrow('COMPLETED');
    expect(f.model.update).not.toHaveBeenCalled();
    expect(f.operation.result).toBe('HOLD');
  });

  it('commits the operation and event in one transaction with a scoped visit lock', async () => {
    const f = fixture();
    await commands.complete(f);
    expect(f.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function), { isolationLevel: 'ReadCommitted' },
    );
    expect(f.tx.$queryRaw).toHaveBeenCalledWith(expect.objectContaining({ values: ['visit-1', 'icd-1'] }));
    expect(f.model.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'operation-1', containerVisit: { icdId: 'icd-1' } },
    }));
    expect(f.events.record).toHaveBeenCalledWith(f.tx, expect.objectContaining({ containerVisitId: 'visit-1' }));
  });
});
