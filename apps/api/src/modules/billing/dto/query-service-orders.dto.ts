import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceOrderStatus } from '../../../generated/prisma/client';

export class QueryServiceOrdersDto {
  @IsString()
  @IsOptional()
  containerVisitId?: string;

  @IsString()
  @IsOptional()
  consigneeId?: string;

  @IsEnum(ServiceOrderStatus)
  @IsOptional()
  status?: ServiceOrderStatus;

  @IsString()
  @IsOptional()
  keyword?: string;
}
