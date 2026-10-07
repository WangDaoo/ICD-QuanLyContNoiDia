import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContainerCategory, ContainerVisitStatus } from '../../../generated/prisma/client';

export class QueryContainerVisitsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContainerVisitStatus)
  state?: ContainerVisitStatus;

  @IsOptional()
  @IsEnum(ContainerCategory)
  category?: ContainerCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isOverstay?: boolean;

}
