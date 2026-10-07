import { HttpException, HttpStatus } from '@nestjs/common';

export function mapPartnerHttpStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

export interface NormalizedPartnerError {
  status: number;
  body: {
    request_id: string;
    error_code: string;
    message: string;
    details: unknown;
  };
}

export function normalizeExternalPartnerError(
  exception: unknown,
  requestId: string,
): NormalizedPartnerError {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    const value =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};

    const errorCode =
      typeof value.code === 'string'
        ? value.code
        : typeof value.error_code === 'string'
          ? value.error_code
          : mapPartnerHttpStatus(status);

    let message = 'Request could not be processed.';
    if (typeof value.message === 'string') {
      message = value.message;
    } else if (Array.isArray(value.message) && typeof value.message[0] === 'string') {
      message = value.message[0];
    } else if (typeof value.error === 'string') {
      message = value.error;
    }

    return {
      status,
      body: {
        request_id: requestId,
        error_code: errorCode,
        message,
        details: value.details ?? null,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      request_id: requestId,
      error_code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.',
      details: null,
    },
  };
}
