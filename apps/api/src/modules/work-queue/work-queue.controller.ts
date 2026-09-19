import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { QueryWorkQueueDto } from './dto/query-work-queue.dto';
import { WorkQueueService } from './work-queue.service';

@Controller('work-queue')
@UseGuards(JwtAuthGuard)
export class WorkQueueController {
  constructor(private readonly workQueueService: WorkQueueService) {}

  @Get()
  async getWorkQueue(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: QueryWorkQueueDto,
  ) {
    return this.workQueueService.getWorkQueue(actor, query);
  }

  @Get('stats')
  async getStats(@CurrentUser() actor: AuthenticatedUser) {
    return this.workQueueService.getStats(actor);
  }
}
