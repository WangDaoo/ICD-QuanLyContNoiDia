import 'reflect-metadata';

import {
  ValidationPipe,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import {
  NestFactory,
} from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
  );

  const configService =
    app.get(ConfigService);

  /**
   * Tất cả API nội bộ sau này bắt đầu bằng:
   *
   * /api
   *
   * Ví dụ:
   *
   * /api/health
   * /api/containers
   * /api/manifests
   */
  app.setGlobalPrefix('api');

  /**
   * Chuẩn DTO toàn hệ thống.
   *
   * whitelist:
   * Xóa property không khai báo trong DTO.
   *
   * forbidNonWhitelisted:
   * Request có property lạ sẽ bị reject.
   *
   * transform:
   * Chuyển payload sang DTO type phù hợp.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Cho phép NestJS gọi lifecycle shutdown,
   * từ đó PrismaService có thể disconnect.
   */
  app.enableShutdownHooks();

  const host =
    configService.getOrThrow<string>(
      'API_HOST',
    );

  const port =
    configService.getOrThrow<number>(
      'API_PORT',
    );

  await app.listen(
    port,
    host,
  );
}

void bootstrap();
