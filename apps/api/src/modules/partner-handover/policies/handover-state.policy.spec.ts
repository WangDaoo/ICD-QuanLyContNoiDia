import { BadRequestException } from '@nestjs/common';
import { TransportHandoverStatus } from '../../../generated/prisma/client';
import { TransportHandoverStatePolicy } from './handover-state.policy';

describe('TransportHandoverStatePolicy', () => {
  it('allows valid DRAFT transitions', () => {
    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.DRAFT,
        TransportHandoverStatus.READY_FOR_HANDOVER,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.DRAFT,
        TransportHandoverStatus.CANCELLED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.DRAFT,
        TransportHandoverStatus.COMPLETED,
      ),
    ).toBe(false);
  });

  it('allows valid READY_FOR_HANDOVER transitions', () => {
    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.READY_FOR_HANDOVER,
        TransportHandoverStatus.PARTNER_ACCEPTED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.READY_FOR_HANDOVER,
        TransportHandoverStatus.PARTNER_REJECTED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.READY_FOR_HANDOVER,
        TransportHandoverStatus.IN_TRANSIT,
      ),
    ).toBe(false);
  });

  it('allows valid IN_TRANSIT transitions', () => {
    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.IN_TRANSIT,
        TransportHandoverStatus.PARTNER_CONFIRMED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.IN_TRANSIT,
        TransportHandoverStatus.DELIVERY_FAILED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.IN_TRANSIT,
        TransportHandoverStatus.DISPUTED,
      ),
    ).toBe(true);
  });

  it('allows valid confirmation and completion flow', () => {
    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.PARTNER_CONFIRMED,
        TransportHandoverStatus.ICD_CONFIRMED,
      ),
    ).toBe(true);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.ICD_CONFIRMED,
        TransportHandoverStatus.COMPLETED,
      ),
    ).toBe(true);
  });

  it('terminal states have no transitions', () => {
    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.COMPLETED,
        TransportHandoverStatus.DRAFT,
      ),
    ).toBe(false);

    expect(
      TransportHandoverStatePolicy.canTransition(
        TransportHandoverStatus.CANCELLED,
        TransportHandoverStatus.READY_FOR_HANDOVER,
      ),
    ).toBe(false);
  });

  it('throws BadRequestException on invalid assertion', () => {
    expect(() =>
      TransportHandoverStatePolicy.assertTransition(
        TransportHandoverStatus.DRAFT,
        TransportHandoverStatus.COMPLETED,
      ),
    ).toThrow(BadRequestException);
  });
});
