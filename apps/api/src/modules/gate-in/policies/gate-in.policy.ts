import { BadRequestException, Injectable } from '@nestjs/common';

import { GATE_IN_ERROR_CODES } from '../constants/gate-in-error-codes.constants';

export type SealComparison = 'MATCH' | 'MISMATCH' | 'NO_REFERENCE';

export interface SealCheckResult {
  expectedSeal: string | null;
  actualSeal: string;
  comparison: SealComparison;
}

@Injectable()
export class GateInPolicy {
  checkSeal(expectedSeal: string | null, actualSeal: string): SealCheckResult {
    const normalizedActual = this.normalizeSeal(actualSeal);

    if (!expectedSeal) {
      return {
        expectedSeal: null,
        actualSeal: normalizedActual,
        comparison: 'NO_REFERENCE',
      };
    }

    const normalizedExpected = this.normalizeSeal(expectedSeal);

    return {
      expectedSeal: normalizedExpected,
      actualSeal: normalizedActual,
      comparison: normalizedExpected === normalizedActual ? 'MATCH' : 'MISMATCH',
    };
  }

  assertSealMismatchHasNote(result: SealCheckResult, conditionNotes?: string): void {
    if (result.comparison !== 'MISMATCH') {
      return;
    }

    if (!conditionNotes || conditionNotes.trim().length < 3) {
      throw new BadRequestException({
        code: GATE_IN_ERROR_CODES.SEAL_MISMATCH_NOTE_REQUIRED,
        message: 'Seal thực tế khác Seal hồ sơ. Bắt buộc nhập ghi chú bất thường.',
      });
    }
  }

  private normalizeSeal(value: string): string {
    return value.trim().toUpperCase();
  }
}
