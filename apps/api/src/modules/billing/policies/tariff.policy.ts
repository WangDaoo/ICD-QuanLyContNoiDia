import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  ContainerSize,
  ContainerType,
  Tariff,
  TariffRule,
  TariffStatus,
} from '../../../generated/prisma/client';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';

@Injectable()
export class TariffPolicy {
  canTransition(
    currentStatus: TariffStatus,
    targetStatus: TariffStatus,
  ): boolean {
    if (currentStatus === targetStatus) return true;

    if (currentStatus === TariffStatus.DRAFT) {
      return (
        targetStatus === TariffStatus.ACTIVE ||
        targetStatus === TariffStatus.RETIRED
      );
    }

    if (currentStatus === TariffStatus.ACTIVE) {
      return targetStatus === TariffStatus.RETIRED;
    }

    return false;
  }

  assertCanTransition(
    currentStatus: TariffStatus,
    targetStatus: TariffStatus,
  ): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.TARIFF_INVALID_STATE,
        message: `Cannot transition tariff from ${currentStatus} to ${targetStatus}`,
      });
    }
  }

  assertCanModify(tariff: Tariff): void {
    if (tariff.status !== TariffStatus.DRAFT) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.TARIFF_INVALID_STATE,
        message: `Cannot modify tariff in status ${tariff.status}. Only DRAFT tariffs can be modified.`,
      });
    }
  }

  assertCanAddRule(
    existingRules: TariffRule[],
    serviceTypeId: string,
    containerSize?: ContainerSize | null,
    containerType?: ContainerType | null,
  ): void {
    const isDuplicate = existingRules.some(
      (rule) =>
        rule.serviceTypeId === serviceTypeId &&
        (rule.containerSize ?? null) === (containerSize ?? null) &&
        (rule.containerType ?? null) === (containerType ?? null),
    );

    if (isDuplicate) {
      throw new ConflictException({
        code: BILLING_ERROR_CODES.TARIFF_RULE_DUPLICATE,
        message: 'A tariff rule with matching service type, size, and type already exists.',
      });
    }
  }

  /**
   * Rule resolution hierarchy:
   * 1. Exact match (size + type)
   * 2. Size match (type is null)
   * 3. Generic fallback (size is null and type is null)
   */
  findMatchingRule(
    rules: TariffRule[],
    serviceTypeId: string,
    containerSize?: ContainerSize | null,
    containerType?: ContainerType | null,
  ): TariffRule | null {
    const serviceRules = rules.filter(
      (r) => r.serviceTypeId === serviceTypeId,
    );

    if (serviceRules.length === 0) {
      return null;
    }

    // 1. Exact match (size + type)
    if (containerSize && containerType) {
      const exact = serviceRules.find(
        (r) =>
          r.containerSize === containerSize &&
          r.containerType === containerType,
      );
      if (exact) return exact;
    }

    // 2. Size match (type null)
    if (containerSize) {
      const sizeMatch = serviceRules.find(
        (r) =>
          r.containerSize === containerSize &&
          r.containerType === null,
      );
      if (sizeMatch) return sizeMatch;
    }

    // 3. Generic fallback
    const genericMatch = serviceRules.find(
      (r) =>
        r.containerSize === null &&
        r.containerType === null,
    );

    return genericMatch ?? serviceRules[0] ?? null;
  }
}
