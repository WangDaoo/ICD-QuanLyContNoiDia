import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  WORK_QUEUE_TASK_TYPES,
  WORK_QUEUE_URGENCY,
  type WorkQueueTaskType,
  type WorkQueueUrgency,
} from '../work-queue.constants';

export class QueryWorkQueueDto {
  @IsOptional()
  @IsEnum(WORK_QUEUE_TASK_TYPES)
  type?: WorkQueueTaskType;

  @IsOptional()
  @IsEnum(WORK_QUEUE_URGENCY)
  urgency?: WorkQueueUrgency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
