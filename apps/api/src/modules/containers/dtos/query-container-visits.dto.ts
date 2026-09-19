import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

import {
  ContainerCategory,
  ContainerHoldStatus,
  ContainerVisitStatus,
} from '../../../generated/prisma/client';

export class QueryContainerVisitsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContainerVisitStatus)
  status?: ContainerVisitStatus;

  @IsOptional()
  @IsEnum(ContainerCategory)
  category?: ContainerCategory;

  @IsOptional()
  @IsEnum(ContainerHoldStatus)
  holdStatus?: ContainerHoldStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isOverstay?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
