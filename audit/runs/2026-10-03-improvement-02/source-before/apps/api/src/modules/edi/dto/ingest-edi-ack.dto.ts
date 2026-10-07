import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  EdiAcknowledgementStatus,
  EdiAcknowledgementType,
} from '../../../generated/prisma/client';

export class IngestEdiAckDto {
  @IsUUID()
  shippingLineId!: string;

  @IsEnum(EdiAcknowledgementType)
  ackType!: EdiAcknowledgementType;

  @IsEnum(EdiAcknowledgementStatus)
  status!: EdiAcknowledgementStatus;

  @IsOptional()
  @IsUUID()
  outboxMessageId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  rawPayload?: string;

  @IsOptional()
  @IsObject()
  parsedPayload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  dedupeKey?: string;
}
