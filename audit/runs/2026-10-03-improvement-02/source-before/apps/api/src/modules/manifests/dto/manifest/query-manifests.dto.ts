import { Transform } from 'class-transformer';

import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { ManifestStatus } from '../../../../generated/prisma/client';

export class QueryManifestsDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(ManifestStatus)
  status?: ManifestStatus;

  @IsOptional()
  @IsUUID()
  shippingLineId?: string;

  @IsOptional()
  @IsISO8601()
  etaFrom?: string;

  @IsOptional()
  @IsISO8601()
  etaTo?: string;
}
