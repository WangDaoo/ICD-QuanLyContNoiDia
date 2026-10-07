import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MovementOrderStatus } from '../../../generated/prisma/client';

export class QueryMovementOrdersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MovementOrderStatus)
  status?: MovementOrderStatus;

  @IsOptional()
  @IsUUID('4')
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
