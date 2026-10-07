import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

type ApiEnvelope = {
  data?: unknown;
  meta?: unknown;
  error?: unknown;
  requestId?: unknown;
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof StreamableFile) {
          return value;
        }

        if (
          value !== null &&
          typeof value === 'object' &&
          ('data' in (value as ApiEnvelope) ||
            'error' in (value as ApiEnvelope))
        ) {
          return value;
        }

        return { data: value };
      }),
    );
  }
}
