import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from './request-with-id.type';
import type { RequestContextService } from './request-context.service';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function resolveRequestId(rawValue: string | string[] | undefined): string {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (value && REQUEST_ID_PATTERN.test(value.trim())) {
    return value.trim();
  }

  return randomUUID();
}

export function createRequestIdMiddleware(context: RequestContextService) {
  return (request: RequestWithId, response: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(request.headers['x-request-id']);

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    context.run(requestId, next);
  };
}
