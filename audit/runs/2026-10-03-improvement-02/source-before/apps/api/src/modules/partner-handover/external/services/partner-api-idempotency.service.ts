import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { IDEMPOTENCY_KEY_PATTERN } from '../constants/partner-api.constants';
import type { PartnerApiPrincipal } from '../types/partner-api.types';
import { redactPartnerApiPayload } from '../utils/partner-api-redaction.util';
import { hashPartnerRequest } from '../utils/partner-request-hash.util';

export type IdempotencyCheckResult =
  | {
      mode: 'EXECUTE';
      logId: string;
      requestHash: string;
    }
  | {
      mode: 'REPLAY';
      response: unknown;
      httpStatus: number;
    };

@Injectable()
export class PartnerApiIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  assertValidKey(idempotencyKey: string | undefined): string {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required for this operation.',
      });
    }

    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message:
          'Idempotency-Key format is invalid. Must be 8-200 characters matching [A-Za-z0-9._:-].',
      });
    }

    return idempotencyKey;
  }

  async reserveOrReplay(input: {
    principal: PartnerApiPrincipal;
    endpoint: string;
    method: string;
    idempotencyKey: string;
    body: unknown;
    requestId: string;
  }): Promise<IdempotencyCheckResult> {
    const {
      principal,
      endpoint,
      method,
      idempotencyKey,
      body,
      requestId,
    } = input;

    const requestHash = hashPartnerRequest(body);

    const existingLog = await this.prisma.partnerApiLog.findFirst({
      where: {
        partnerApiClientId: principal.clientId,
        endpoint,
        idempotencyKey,
      },
    });

    if (existingLog) {
      if (existingLog.requestHash && existingLog.requestHash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message:
            'Idempotency-Key reuse detected with different payload parameters.',
        });
      }

      if (!existingLog.completedAt || existingLog.responseBodyRedacted === null) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          message:
            'A request with this Idempotency-Key is currently being processed.',
        });
      }

      return {
        mode: 'REPLAY',
        response: existingLog.responseBodyRedacted,
        httpStatus: existingLog.httpStatus,
      };
    }

    const created = await this.prisma.partnerApiLog.create({
      data: {
        partnerApiClientId: principal.clientId,
        endpoint,
        method: method.toUpperCase(),
        idempotencyKey,
        requestHash,
        requestBodyRedacted: redactPartnerApiPayload(body),
        httpStatus: 0,
        requestId,
      },
      select: {
        id: true,
      },
    });

    return {
      mode: 'EXECUTE',
      logId: created.id,
      requestHash,
    };
  }
}
