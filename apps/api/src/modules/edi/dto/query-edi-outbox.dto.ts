import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  EdiMessageType,
  EdiOutboxStatus,
} from '../../../generated/prisma/client';

export class QueryEdiOutboxDto {
  @IsOptional()
  @IsEnum(EdiOutboxStatus)
  status?: EdiOutboxStatus;

  @IsOptional()
  @IsEnum(EdiMessageType)
  messageType?: EdiMessageType;

  @IsOptional()
  @IsString()
  shippingLineId?: string;

  @IsOptional()
  @IsString()
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
