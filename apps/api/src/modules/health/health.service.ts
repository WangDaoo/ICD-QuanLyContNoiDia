import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * HealthService
 *
 * Kiểm tra:
 * - API đang hoạt động.
 * - Prisma có query được MySQL hay không.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async check() {
    try {
      /**
       * Chưa có Prisma model nên dùng query đơn giản
       * để xác minh connection thật tới MySQL.
       */
      await this.prisma.$queryRawUnsafe(
        'SELECT 1',
      );

      return {
        status: 'ok',
        service: 'icd-api',
        database: 'up',
        timestamp: new Date().toISOString(),
      };
    } catch {
      /**
       * Không expose chi tiết exception/database
       * ra ngoài health endpoint.
       */
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'icd-api',
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
