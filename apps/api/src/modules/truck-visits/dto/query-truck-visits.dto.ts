import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { TruckVisitStatus, TruckVisitType } from '../../../generated/prisma/client';

export class QueryTruckVisitsDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TruckVisitStatus)
  status?: TruckVisitStatus;

  @IsOptional()
  @IsEnum(TruckVisitType)
  visitType?: TruckVisitType;

  @IsOptional()
  @IsUUID('4')
  transporterId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
