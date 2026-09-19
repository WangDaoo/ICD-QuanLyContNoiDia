import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PartnerApiClientStatus } from '../../../generated/prisma/client';

export class QueryPartnerClientDto {
  @IsOptional()
  @IsEnum(PartnerApiClientStatus)
  status?: PartnerApiClientStatus;

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
