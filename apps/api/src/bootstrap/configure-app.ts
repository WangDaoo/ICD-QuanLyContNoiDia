import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { HTTP_ERROR_CODES } from '../common/constants/http-error-codes.constants';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { RequestContextService } from '../common/request-context/request-context.service';
import { createRequestIdMiddleware } from '../common/request-context/request-id.middleware';
import { flattenValidationErrors } from '../common/utils/validation-error.util';

/**
 * Cấu hình chung cho cả Server Runtime (main.ts) và End-to-End Tests.
 * Đảm bảo toàn bộ pipeline (Helmet, CORS, Prefix, Request ID, Validation Pipe, Global Filters)
 * hoạt động đồng nhất giữa production và testing.
 */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService, { strict: false });

  // 1. HTTP Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. CORS configuration
  const corsOrigins = configService?.get<string>('CORS_ORIGINS') ?? '*';
  const allowedOrigins = corsOrigins === '*' ? '*' : corsOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-icd-id'],
  });

  // 3. Prefix toàn bộ API là /api
  app.setGlobalPrefix('api');

  // 4. Request ID Middleware
  const requestContextService = app.get(RequestContextService);
  app.use(createRequestIdMiddleware(requestContextService));

  // 5. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: HTTP_ERROR_CODES.VALIDATION_FAILED,
          message: 'Dữ liệu đầu vào không hợp lệ.',
          details: {
            fields: flattenValidationErrors(errors),
          },
        }),
    }),
  );

  // 6. Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());
}
