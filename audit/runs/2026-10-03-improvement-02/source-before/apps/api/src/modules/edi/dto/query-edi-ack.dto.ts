import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  EdiAcknowledgementStatus,
  EdiAcknowledgementType,
} from '../../../generated/prisma/client';

export class QueryEdiAckDto extends PaginationQueryDto {
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

}
