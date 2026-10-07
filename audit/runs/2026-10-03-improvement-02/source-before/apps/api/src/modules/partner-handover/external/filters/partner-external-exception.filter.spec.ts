import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { PartnerExternalExceptionFilter } from './partner-external-exception.filter';

describe('PartnerExternalExceptionFilter', () => {
  let filter: PartnerExternalExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    filter = new PartnerExternalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('formats BadRequestException with request_id and error_code in snake_case', () => {
    const exception = new BadRequestException({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required.',
    });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req-abc-123',
          headers: {},
        }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      request_id: 'req-abc-123',
      error_code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required.',
      details: null,
    });
  });

  it('formats UnauthorizedException correctly', () => {
    const exception = new UnauthorizedException({
      code: 'PARTNER_API_KEY_INVALID',
      message: 'Invalid API key.',
    });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-request-id': 'req-999' },
        }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      request_id: 'req-999',
      error_code: 'PARTNER_API_KEY_INVALID',
      message: 'Invalid API key.',
      details: null,
    });
  });

  it('formats ForbiddenException correctly', () => {
    const exception = new ForbiddenException({
      code: 'FORBIDDEN_SCOPE',
      message: 'Partner API scope is not sufficient.',
    });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req-scope',
          headers: {},
        }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      request_id: 'req-scope',
      error_code: 'FORBIDDEN_SCOPE',
      message: 'Partner API scope is not sufficient.',
      details: null,
    });
  });

  it('formats ConflictException correctly', () => {
    const exception = new ConflictException({
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'Idempotency-Key reuse detected.',
    });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req-conflict',
          headers: {},
        }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      request_id: 'req-conflict',
      error_code: 'IDEMPOTENCY_CONFLICT',
      message: 'Idempotency-Key reuse detected.',
      details: null,
    });
  });

  it('formats unknown errors as 500 INTERNAL_SERVER_ERROR', () => {
    const exception = new Error('Database connection crashed');

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req-crash',
          headers: {},
        }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      request_id: 'req-crash',
      error_code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.',
      details: null,
    });
  });
});
