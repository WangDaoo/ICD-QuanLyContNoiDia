import { BadRequestException } from '@nestjs/common';

import { TruckVisitStatus } from '../../../generated/prisma/client';
import { TruckVisitStatePolicy } from './truck-visit-state.policy';

describe('TruckVisitStatePolicy', () => {
  let policy: TruckVisitStatePolicy;

  beforeEach(() => {
    policy = new TruckVisitStatePolicy();
  });

  describe('assertCanArrive', () => {
    it('should allow transition when status is SCHEDULED', () => {
      expect(() =>
        policy.assertCanArrive(TruckVisitStatus.SCHEDULED),
      ).not.toThrow();
    });

    it('should throw BadRequestException when status is not SCHEDULED', () => {
      expect(() => policy.assertCanArrive(TruckVisitStatus.ARRIVED)).toThrow(
        BadRequestException,
      );
      expect(() => policy.assertCanArrive(TruckVisitStatus.IN_PROGRESS)).toThrow(
        BadRequestException,
      );
      expect(() => policy.assertCanArrive(TruckVisitStatus.COMPLETED)).toThrow(
        BadRequestException,
      );
      expect(() => policy.assertCanArrive(TruckVisitStatus.CANCELLED)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertCanCancel', () => {
    it('should allow cancellation when SCHEDULED or ARRIVED', () => {
      expect(() =>
        policy.assertCanCancel(TruckVisitStatus.SCHEDULED),
      ).not.toThrow();
      expect(() =>
        policy.assertCanCancel(TruckVisitStatus.ARRIVED),
      ).not.toThrow();
    });

    it('should throw BadRequestException when IN_PROGRESS or COMPLETED', () => {
      expect(() => policy.assertCanCancel(TruckVisitStatus.IN_PROGRESS)).toThrow(
        BadRequestException,
      );
      expect(() => policy.assertCanCancel(TruckVisitStatus.COMPLETED)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertCanStartInProgress', () => {
    it('should allow starting in progress when ARRIVED', () => {
      expect(() =>
        policy.assertCanStartInProgress(TruckVisitStatus.ARRIVED),
      ).not.toThrow();
    });

    it('should throw BadRequestException when not ARRIVED', () => {
      expect(() =>
        policy.assertCanStartInProgress(TruckVisitStatus.SCHEDULED),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertCanComplete', () => {
    it('should allow completion when IN_PROGRESS', () => {
      expect(() =>
        policy.assertCanComplete(TruckVisitStatus.IN_PROGRESS),
      ).not.toThrow();
    });

    it('should throw BadRequestException when not IN_PROGRESS', () => {
      expect(() =>
        policy.assertCanComplete(TruckVisitStatus.SCHEDULED),
      ).toThrow(BadRequestException);
    });
  });
});
