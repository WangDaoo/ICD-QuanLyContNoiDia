import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

/**
 * PrismaService
 *
 * Trách nhiệm:
 * - Tạo Prisma Client.
 * - Tạo connection pool tới MySQL.
 * - Connect khi NestJS module khởi động.
 * - Disconnect khi application shutdown.
 *
 * Không chứa business logic.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService,
  ) {
    const adapter = new PrismaMariaDb({
      host: configService.getOrThrow<string>(
        'MYSQL_HOST',
      ),

      port: configService.getOrThrow<number>(
        'MYSQL_PORT',
      ),

      user: configService.getOrThrow<string>(
        'MYSQL_USER',
      ),

      password:
        configService.getOrThrow<string>(
          'MYSQL_PASSWORD',
        ),

      database:
        configService.getOrThrow<string>(
          'MYSQL_DATABASE',
        ),

      connectionLimit:
        configService.getOrThrow<number>(
          'MYSQL_CONNECTION_LIMIT',
        ),

      connectTimeout: 5_000,
    });

    super({
      adapter,
    });
  }

  /**
   * Kết nối DB khi NestJS khởi động.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Đóng DB connection khi application shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
