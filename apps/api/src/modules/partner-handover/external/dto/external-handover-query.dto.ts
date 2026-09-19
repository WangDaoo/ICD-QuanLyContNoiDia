import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TransportHandoverStatus } from '../../../../generated/prisma/client';

export class ExternalHandoverQueryDto {
  @IsOptional()
  @IsEnum(TransportHandoverStatus)
  status?: TransportHandoverStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  container_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  transport_code?: string;

  @IsOptional()
  @IsISO8601()
  ready_from?: string;

  @IsOptional()
  @IsISO8601()
  ready_to?: string;

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
