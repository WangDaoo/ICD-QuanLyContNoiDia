import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import { MovementOrderStatus } from '../../../generated/prisma/client';

export class QueryMovementOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

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
