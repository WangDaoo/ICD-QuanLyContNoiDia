import 'reflect-metadata';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HTTP_ERROR_CODES } from './common/constants/http-error-codes.constants';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestContextService } from './common/request-context/request-context.service';
import { createRequestIdMiddleware } from './common/request-context/request-id.middleware';
import { flattenValidationErrors } from './common/utils/validation-error.util';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  /**
   * Tất cả API nội bộ bắt đầu bằng /api
   */
  app.setGlobalPrefix('api');

  /**
   * Request ID Middleware gắn X-Request-Id và đưa vào RequestContextService
   */
  const requestContextService = app.get(RequestContextService);
  app.use(createRequestIdMiddleware(requestContextService));

  /**
   * Chuẩn DTO toàn hệ thống và format validation error envelope
   */
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

  /**
   * Global Exception Filter chuẩn hóa error envelope kèm requestId
   */
  app.useGlobalFilters(new GlobalExceptionFilter());

  /**
   * Cho phép NestJS gọi lifecycle shutdown,
   * từ đó PrismaService có thể disconnect.
   */
  app.enableShutdownHooks();

  const host = configService.getOrThrow<string>('API_HOST');
  const port = configService.getOrThrow<number>('API_PORT');

  await app.listen(port, host);
}

void bootstrap();
