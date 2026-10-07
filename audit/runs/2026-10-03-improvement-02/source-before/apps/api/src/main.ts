import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // 1. Configure application middleware, validation, prefix, filters
  configureApp(app);

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
