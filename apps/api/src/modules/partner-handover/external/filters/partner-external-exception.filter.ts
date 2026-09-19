import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { PartnerApiRequest } from '../types/partner-api.types';
import { normalizeExternalPartnerError } from '../utils/partner-api-error.util';

@Catch()
export class PartnerExternalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<PartnerApiRequest>();
    const response = http.getResponse<Response>();

    const requestId =
      request.requestId ??
      (typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : 'unknown');

    const normalized = normalizeExternalPartnerError(exception, requestId);

    response.status(normalized.status).json(normalized.body);
  }
}
