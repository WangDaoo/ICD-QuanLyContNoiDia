import { GateOutService } from './gate-out.service';
import { ContainerVisitStatus, GatePassStatus } from '../../../generated/prisma/client';

describe('GateOutService expiry rejection', () => {
  it('rejects expired passes without attempting writes that would be rolled back', async () => {
    const transitions = {
      lockAndGetOrThrow: jest
        .fn()
        .mockResolvedValue({
          id: 'pass',
          status: GatePassStatus.ACTIVE,
          expiresAt: new Date(0),
          code: 'GP',
        }),
      markExpired: jest.fn(),
    };
    const containers = {
      lockForGateOut: jest
        .fn()
        .mockResolvedValue({ id: 'visit', state: ContainerVisitStatus.GATE_PASS_ISSUED }),
      restoreInYardAfterGatePassClosed: jest.fn(),
    };
    const events = { record: jest.fn() };
    const service = new GateOutService(
      { $transaction: async (callback: (tx: object) => unknown) => callback({}) } as never,
      {
        findTargetByQrTokenOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'pass', containerVisitId: 'visit' }),
      } as never,
      transitions as never,
      containers as never,
      {} as never,
      {} as never,
      events as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.confirmGateOut({ visitId: 'visit', qrToken: 'qr' }, {
        icdId: 'icd',
        id: 'actor',
      } as never),
    ).rejects.toMatchObject({ response: { code: 'GATE_PASS_EXPIRED' } });
    expect(transitions.markExpired).not.toHaveBeenCalled();
    expect(containers.restoreInYardAfterGatePassClosed).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });
});
