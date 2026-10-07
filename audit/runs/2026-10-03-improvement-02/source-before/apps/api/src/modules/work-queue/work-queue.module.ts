import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { WorkQueueUrgencyService } from './work-queue-urgency.service';
import { WorkQueueController } from './work-queue.controller';
import { WorkQueueService } from './work-queue.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkQueueController],
  providers: [WorkQueueService, WorkQueueUrgencyService],
  exports: [WorkQueueService],
})
export class WorkQueueModule {}
