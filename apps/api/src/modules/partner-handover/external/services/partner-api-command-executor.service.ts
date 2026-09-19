import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type { Prisma } from '../../../../generated/prisma/client';
import type { PartnerApiPrincipal } from '../types/partner-api.types';
import { normalizeExternalPartnerError } from '../utils/partner-api-error.util';
import { redactPartnerApiPayload } from '../utils/partner-api-redaction.util';
import { PartnerApiIdempotencyService } from './partner-api-idempotency.service';

export interface ExecutePartnerCommandInput<T> {
  principal: PartnerApiPrincipal;
  endpoint: string;
  method: string;
  idempotencyKey: string | undefined;
  body: unknown;
  requestId: string;
  command: (tx: Prisma.TransactionClient) => Promise<T>;
}

@Injectable()
export class PartnerApiCommandExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PartnerApiIdempotencyService,
  ) {}

  async execute<T extends { handover_id?: string; status?: string }>(
    input: ExecutePartnerCommandInput<T>,
  ): Promise<T> {
    const {
      principal,
      endpoint,
      method,
      idempotencyKey: rawIdempotencyKey,
      body,
      requestId,
      command,
    } = input;

    const idempotencyKey = this.idempotency.assertValidKey(rawIdempotencyKey);
    const startTime = Date.now();

    const reservation = await this.idempotency.reserveOrReplay({
      principal,
      endpoint,
      method,
      idempotencyKey,
      body,
      requestId,
    });

    if (reservation.mode === 'REPLAY') {
      return reservation.response as T;
    }

    const { logId } = reservation;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        return command(tx);
      });

      const latencyMs = Date.now() - startTime;

      await this.prisma.$transaction([
        this.prisma.partnerApiLog.update({
          where: { id: logId },
          data: {
            httpStatus: 200,
            businessStatus: result.status ?? 'SUCCESS',
            responseBodyRedacted: redactPartnerApiPayload(result),
            transportHandoverId: result.handover_id ?? null,
            latencyMs,
            completedAt: new Date(),
          },
        }),
        this.prisma.partnerApiClient.update({
          where: { id: principal.clientId },
          data: {
            lastRequestAt: new Date(),
          },
        }),
      ]);

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const normalized = normalizeExternalPartnerError(error, requestId);

      try {
        await this.prisma.partnerApiLog.update({
          where: { id: logId },
          data: {
            httpStatus: normalized.status,
            errorCode: normalized.body.error_code,
            businessStatus: 'FAILED',
            responseBodyRedacted: redactPartnerApiPayload(normalized.body),
            latencyMs,
            completedAt: new Date(),
          },
        });
      } catch {
        // Suppress secondary logging failures
      }

      throw error;
    }
  }
}
