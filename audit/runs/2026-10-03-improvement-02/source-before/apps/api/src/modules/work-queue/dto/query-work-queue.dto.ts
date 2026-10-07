import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  WORK_QUEUE_TASK_TYPES,
  WORK_QUEUE_URGENCY,
  type WorkQueueTaskType,
  type WorkQueueUrgency,
} from '../work-queue.constants';

export class QueryWorkQueueDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WORK_QUEUE_TASK_TYPES)
  type?: WorkQueueTaskType;

  @IsOptional()
  @IsEnum(WORK_QUEUE_URGENCY)
  urgency?: WorkQueueUrgency;

  pageSize = 50;
}
