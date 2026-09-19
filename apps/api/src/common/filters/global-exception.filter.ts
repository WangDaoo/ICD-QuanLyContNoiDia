import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { HTTP_ERROR_CODES } from '../constants/http-error-codes.constants';
import type { RequestWithId } from '../request-context/request-with-id.type';

interface ExceptionPayload {
  code?: string;
  message?: string | string[];
  details?: unknown;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const requestId = request.requestId ?? 'unknown';
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const payload: ExceptionPayload =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? {
            ...exceptionResponse,
          }
        : {};

    const code =
      typeof payload.code === 'string' ? payload.code : this.mapStatusCode(status);

    const message = this.resolveMessage(payload.message, status);
    const details = this.resolveDetails(payload);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        [
          `requestId=${requestId}`,
          `${request.method}`,
          `${request.originalUrl}`,
          `status=${status}`,
        ].join(' '),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      requestId,
    });
  }

  private resolveMessage(
    value: string | string[] | undefined,
    status: number,
  ): string {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }

    if (status >= 500) {
      return 'Đã xảy ra lỗi hệ thống.';
    }

    return 'Yêu cầu không thể được xử lý.';
  }

  private resolveDetails(payload: ExceptionPayload): unknown {
    if (payload.details !== undefined) {
      return payload.details;
    }

    const {
      code: _code,
      message: _message,
      statusCode: _statusCode,
      error: _error,
      ...extra
    } = payload;

    return Object.keys(extra).length > 0 ? extra : undefined;
  }

  private mapStatusCode(status: number): string {
    switch (status) {
      case 400:
        return HTTP_ERROR_CODES.BAD_REQUEST;
      case 401:
        return HTTP_ERROR_CODES.UNAUTHORIZED;
      case 403:
        return HTTP_ERROR_CODES.FORBIDDEN;
      case 404:
        return HTTP_ERROR_CODES.NOT_FOUND;
      case 409:
        return HTTP_ERROR_CODES.CONFLICT;
      case 422:
        return HTTP_ERROR_CODES.UNPROCESSABLE_ENTITY;
      case 429:
        return HTTP_ERROR_CODES.TOO_MANY_REQUESTS;
      default:
        return HTTP_ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
