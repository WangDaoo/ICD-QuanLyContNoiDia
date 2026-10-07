import { Logger } from '@nestjs/common';
import { ContainerInspectionService } from './container-inspection.service';
import { ContainerInspectionPolicy } from '../policies/container-inspection.policy';
import { ContainerInspectionResult } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';

const actor = { id: 'yard-user', icdId: 'icd-1' } as AuthenticatedUser;
function fixture() {
  let committed = false;
  const inspection = {
    id: 'inspection-1',
    containerVisitId: 'visit-1',
    status: 'IN_PROGRESS',
    inspectionType: 'CUSTOMS',
    notes: 'Original',
    startedAt: new Date(),
  };
  const tx = {
    $queryRaw: jest.fn(async () => []),
    containerInspection: {
      findFirst: jest.fn(async () => inspection),
      update: jest.fn(async ({ data }) => ({ ...inspection, ...data })),
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
        return [{ id: 'operator-1' }, { id: 'operator-2' }];
      }),
    },
    containerVisit: {
      findFirst: jest.fn(async () => {
        expect(committed).toBe(true);
        return { container: { containerNumber: 'QAOU5007550' } };
      }),
    },
  };
  const notifications = {
    triggerInspectionHoldNotification: jest.fn(async () => {
      expect(committed).toBe(true);
      return 'notification';
    }),
  };
  const service = Reflect.construct(ContainerInspectionService, [
    prisma,
    new ContainerInspectionPolicy(),
    { record: jest.fn() },
    notifications,
  ]) as ContainerInspectionService;
  return { service, notifications, prisma };
}

describe('inspection HOLD notifications', () => {
  it('notifies active same-ICD operators with yard.read only after HOLD completion commits', async () => {
    const f = fixture();
    await f.service.completeInspection(
      'inspection-1',
      { result: ContainerInspectionResult.HOLD, notes: 'Cần kiểm tra hải quan' },
      actor,
    );
    expect(f.prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        icdId: 'icd-1',
        active: true,
        AND: [
          { roles: { some: { role: { code: 'OPERATOR', active: true } } } },
          {
            roles: {
              some: {
                role: {
                  active: true,
                  permissions: { some: { permission: { code: 'yard.read', active: true } } },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    expect(f.prisma.containerVisit.findFirst).toHaveBeenCalledWith({
      where: { id: 'visit-1', icdId: 'icd-1' },
      select: { container: { select: { containerNumber: true } } },
    });
    expect(f.notifications.triggerInspectionHoldNotification).toHaveBeenCalledTimes(2);
    for (const userId of ['operator-1', 'operator-2'])
      expect(f.notifications.triggerInspectionHoldNotification).toHaveBeenCalledWith({
        icdId: 'icd-1',
        inspectionId: 'inspection-1',
        containerNo: 'QAOU5007550',
        inspectorUserId: userId,
        reason: 'Cần kiểm tra hải quan',
      });
  });

  it.each([ContainerInspectionResult.PASS, ContainerInspectionResult.FAIL])(
    'does not emit a HOLD notification for %s',
    async (result) => {
      const f = fixture();
      await f.service.completeInspection(
        'inspection-1',
        { result, notes: 'Kết luận kiểm tra' },
        actor,
      );
      expect(f.notifications.triggerInspectionHoldNotification).not.toHaveBeenCalled();
      expect(f.prisma.user.findMany).not.toHaveBeenCalled();
    },
  );

  it('does not emit a HOLD notification after a rollback', async () => {
    const f = fixture();
    f.prisma.$transaction.mockRejectedValueOnce(new Error('completion rolled back'));
    await expect(
      f.service.completeInspection(
        'inspection-1',
        { result: ContainerInspectionResult.HOLD, notes: 'Cần kiểm tra' },
        actor,
      ),
    ).rejects.toThrow('rolled back');
    expect(f.notifications.triggerInspectionHoldNotification).not.toHaveBeenCalled();
  });

  it('logs notification failure without changing the committed HOLD result', async () => {
    const f = fixture();
    f.notifications.triggerInspectionHoldNotification.mockRejectedValueOnce(
      new Error('notification unavailable'),
    );
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      await expect(
        f.service.completeInspection(
          'inspection-1',
          { result: ContainerInspectionResult.HOLD, notes: 'Cần kiểm tra' },
          actor,
        ),
      ).resolves.toMatchObject({ status: 'COMPLETED', result: 'HOLD' });
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
