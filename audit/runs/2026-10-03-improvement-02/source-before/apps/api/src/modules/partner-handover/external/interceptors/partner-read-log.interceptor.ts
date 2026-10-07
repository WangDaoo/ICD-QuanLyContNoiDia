import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../../../database/prisma.service';
import type { PartnerApiRequest } from '../types/partner-api.types';
import { normalizeExternalPartnerError } from '../utils/partner-api-error.util';
import { redactPartnerApiPayload } from '../utils/partner-api-redaction.util';

@Injectable()
export class PartnerReadLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<PartnerApiRequest>();

    // Only intercept GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const principal = request.partner;
    if (!principal) {
      return next.handle();
    }

    const startTime = Date.now();
    const endpoint = request.originalUrl ?? request.url;
    const requestId =
      request.requestId ??
      (typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : 'unknown');

    return next.handle().pipe(
      tap({
        next: (data) => {
          const latencyMs = Date.now() - startTime;
          void this.prisma.$transaction([
            this.prisma.partnerApiLog.create({
              data: {
                partnerApiClientId: principal.clientId,
                endpoint,
                method: 'GET',
                httpStatus: 200,
                businessStatus: 'SUCCESS',
                responseBodyRedacted: redactPartnerApiPayload(data),
                requestId,
                latencyMs,
                completedAt: new Date(),
              },
            }),
            this.prisma.partnerApiClient.update({
              where: { id: principal.clientId },
              data: { lastRequestAt: new Date() },
            }),
          ]).catch(() => {
            // Ignore logging errors
          });
        },
        error: (error) => {
          const latencyMs = Date.now() - startTime;
          const normalized = normalizeExternalPartnerError(error, requestId);
          void this.prisma.$transaction([
            this.prisma.partnerApiLog.create({
              data: {
                partnerApiClientId: principal.clientId,
                endpoint,
                method: 'GET',
                httpStatus: normalized.status,
                errorCode: normalized.body.error_code,
                businessStatus: 'FAILED',
                responseBodyRedacted: redactPartnerApiPayload(normalized.body),
                requestId,
                latencyMs,
                completedAt: new Date(),
              },
            }),
            this.prisma.partnerApiClient.update({
              where: { id: principal.clientId },
              data: { lastRequestAt: new Date() },
            }),
          ]).catch(() => {
            // Ignore logging errors
          });
        },
      }),
    );
  }
}
