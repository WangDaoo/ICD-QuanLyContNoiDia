import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransportHandoverStatus } from '../../../generated/prisma/client';

export class QueryTransportHandoverDto {
  @IsOptional()
  @IsEnum(TransportHandoverStatus)
  status?: TransportHandoverStatus;

  @IsOptional()
  @IsString()
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  partnerApiClientId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
