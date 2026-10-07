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

  describe('assertIcdConfirmable', () => {
    it('allows PARTNER_CONFIRMED and DISPUTED', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertIcdConfirmable(
          TransportHandoverStatus.PARTNER_CONFIRMED,
        ),
      ).not.toThrow();
      expect(() =>
        TransportHandoverStatePolicy.assertIcdConfirmable(
          TransportHandoverStatus.DISPUTED,
        ),
      ).not.toThrow();
    });

    it('rejects other states', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertIcdConfirmable(
          TransportHandoverStatus.IN_TRANSIT,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        TransportHandoverStatePolicy.assertIcdConfirmable(
          TransportHandoverStatus.READY_FOR_HANDOVER,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertDisputable', () => {
    it('allows IN_TRANSIT, PARTNER_CONFIRMED, DELIVERY_FAILED, ICD_CONFIRMED', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.IN_TRANSIT,
        ),
      ).not.toThrow();
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.PARTNER_CONFIRMED,
        ),
      ).not.toThrow();
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.DELIVERY_FAILED,
        ),
      ).not.toThrow();
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.ICD_CONFIRMED,
        ),
      ).not.toThrow();
    });

    it('rejects terminal or initial states', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.DRAFT,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        TransportHandoverStatePolicy.assertDisputable(
          TransportHandoverStatus.COMPLETED,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertPartnerRejectable', () => {
    it('allows READY_FOR_HANDOVER', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertPartnerRejectable(
          TransportHandoverStatus.READY_FOR_HANDOVER,
        ),
      ).not.toThrow();
    });

    it('rejects non-ready states', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertPartnerRejectable(
          TransportHandoverStatus.PARTNER_ACCEPTED,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertDeliveryFailAllowed', () => {
    it('allows IN_TRANSIT', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertDeliveryFailAllowed(
          TransportHandoverStatus.IN_TRANSIT,
        ),
      ).not.toThrow();
    });

    it('rejects non-transit states', () => {
      expect(() =>
        TransportHandoverStatePolicy.assertDeliveryFailAllowed(
          TransportHandoverStatus.READY_FOR_HANDOVER,
        ),
      ).toThrow(BadRequestException);
    });
  });
});

