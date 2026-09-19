import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  EdiAcknowledgementStatus,
  EdiAcknowledgementType,
} from '../../../generated/prisma/client';

export class QueryEdiAckDto {
  @IsOptional()
  @IsEnum(EdiAcknowledgementStatus)
  status?: EdiAcknowledgementStatus;

  @IsOptional()
  @IsEnum(EdiAcknowledgementType)
  ackType?: EdiAcknowledgementType;

  @IsOptional()
  @IsUUID()
  shippingLineId?: string;

  @IsOptional()
  @IsUUID()
  outboxMessageId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

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
