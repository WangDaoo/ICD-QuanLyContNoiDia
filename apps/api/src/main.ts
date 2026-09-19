import 'reflect-metadata';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

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
   * 1. HTTP Security headers with Helmet
   */
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  /**
   * 2. CORS configuration
   */
  const corsOrigins = configService.get<string>('CORS_ORIGINS') ?? '*';
  const allowedOrigins = corsOrigins === '*' ? '*' : corsOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-icd-id'],
  });

  /**
   * 3. Tất cả API nội bộ bắt đầu bằng /api
   */
  app.setGlobalPrefix('api');

  /**
   * 4. Request ID Middleware gắn X-Request-Id và đưa vào RequestContextService
   */
  const requestContextService = app.get(RequestContextService);
  app.use(createRequestIdMiddleware(requestContextService));

  /**
   * 5. Chuẩn DTO toàn hệ thống và format validation error envelope
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
   * 6. Global Exception Filter chuẩn hóa error envelope kèm requestId
   */
  app.useGlobalFilters(new GlobalExceptionFilter());

  /**
   * 7. Swagger / OpenAPI Documentation
   */
  const isSwaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED') ?? true;
  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ICD Management API')
      .setDescription('Production-grade ICD Container & Yard Management Backend')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT Access Token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('Auth', 'Authentication and session management')
      .addTag('Containers', 'Container lifecycle and reception')
      .addTag('Gate-in', 'Gate-in processing')
      .addTag('Gate-pass', 'Gate pass issuing and QR verification')
      .addTag('Gate-out', 'Gate-out confirmation and CODECO generation')
      .addTag('Yard', 'Yard block, bay, row, tier location management')
      .addTag('Billing', 'Invoicing, storage calculation, and payments')
      .addTag('Inspection', 'Damage inspection and photo records')
      .addTag('Customs', 'Customs declaration and clearance holds')
      .addTag('Transport', 'Multi-modal transport orders and handovers')
      .addTag('Notifications', 'Device registration and notification outbox')
      .addTag('EDI', 'CODECO/COARRI messages and SFTP partner transfers')
      .addTag('Health', 'Liveness and readiness probes')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  /**
   * 8. Shutdown Hooks for graceful termination
   */
  app.enableShutdownHooks();

  const host = configService.getOrThrow<string>('API_HOST');
  const port = configService.getOrThrow<number>('API_PORT');

  await app.listen(port, host);
}

void bootstrap();
