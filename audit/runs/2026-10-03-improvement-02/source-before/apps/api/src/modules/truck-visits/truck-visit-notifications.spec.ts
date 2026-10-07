import { Logger } from '@nestjs/common';
import { TruckVisitService } from './truck-visit.service';
import { TruckVisitStatePolicy } from './policies/truck-visit-state.policy';

function fixture(visitType = 'GATE_IN') {
  let committed = false;
  const updated = {
    id: 'truck-1',
    status: 'ARRIVED',
    visitType,
    containers: [{ containerVisitId: 'visit-1' }],
  };
  const tx = {
    truckVisit: {
      findFirst: jest.fn(async () => ({ ...updated, status: 'SCHEDULED' })),
      update: jest.fn(async () => updated),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (action) => {
      const result = await action(tx);
      committed = true;
      return result;
    }),
    user: {
      findMany: jest.fn(async () => {
        expect(committed).toBe(true);
        return [{ id: 'gate-1' }, { id: 'gate-2' }];
      }),
    },
    containerVisit: {
      findMany: jest.fn(async () => {
        expect(committed).toBe(true);
        return [{ id: 'visit-1', container: { containerNumber: 'QAOU5007550' } }];
      }),
    },
  };
  const notifications = {
    triggerGateInWorkQueueNotification: jest.fn(async () => {
      expect(committed).toBe(true);
      return 'notification';
    }),
  };
  const events = { record: jest.fn() };
  const service = Reflect.construct(TruckVisitService, [
    prisma,
    new TruckVisitStatePolicy(),
    events,
    notifications,
  ]) as TruckVisitService;
  return { prisma, notifications, service, updated };
}

describe('truck arrival notifications', () => {
  it('creates each gate-staff task only after arrival commits, using current eligible visits and scoped recipients', async () => {
    const f = fixture();
    await expect(f.service.arrive('icd-1', 'truck-1', 'actor-1', {})).resolves.toBe(f.updated);
    expect(f.prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        icdId: 'icd-1',
        active: true,
        AND: [
          { roles: { some: { role: { code: 'GATE_STAFF', active: true } } } },
          {
            roles: {
              some: {
                role: {
                  active: true,
                  permissions: { some: { permission: { code: 'gate_in.create', active: true } } },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    expect(f.prisma.containerVisit.findMany).toHaveBeenCalledWith({
      where: {
        icdId: 'icd-1',
        state: 'AUTHORIZED',
        reception: null,
        truckVisitLinks: { some: { truckVisitId: 'truck-1' } },
      },
      select: { id: true, container: { select: { containerNumber: true } } },
    });
    expect(f.notifications.triggerGateInWorkQueueNotification).toHaveBeenCalledTimes(2);
    for (const userId of ['gate-1', 'gate-2'])
      expect(f.notifications.triggerGateInWorkQueueNotification).toHaveBeenCalledWith({
        icdId: 'icd-1',
        containerVisitId: 'visit-1',
        containerNo: 'QAOU5007550',
        operatorUserId: userId,
      });
  });

  it('does not create gate-in tasks for a GATE_OUT truck arrival', async () => {
    const f = fixture('GATE_OUT');
    await f.service.arrive('icd-1', 'truck-1', 'actor-1', {});
    expect(f.notifications.triggerGateInWorkQueueNotification).not.toHaveBeenCalled();
    expect(f.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('does not create a notification when arrival rolls back', async () => {
    const f = fixture();
    f.prisma.$transaction.mockRejectedValueOnce(new Error('transaction rolled back'));
    await expect(f.service.arrive('icd-1', 'truck-1', 'actor-1', {})).rejects.toThrow(
      'rolled back',
    );
    expect(f.notifications.triggerGateInWorkQueueNotification).not.toHaveBeenCalled();
  });

  it('logs notification failure while returning the committed arrival', async () => {
    const f = fixture();
    f.notifications.triggerGateInWorkQueueNotification.mockRejectedValueOnce(
      new Error('notification unavailable'),
    );
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      await expect(f.service.arrive('icd-1', 'truck-1', 'actor-1', {})).resolves.toBe(f.updated);
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
