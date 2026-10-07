import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TruckVisitStatus, TruckVisitType } from '../../../generated/prisma/client';

export class QueryTruckVisitsDto extends PaginationQueryDto {
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
