import { Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Infrastructure module cung cấp PrismaService.
 *
 * Không chứa business logic.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
