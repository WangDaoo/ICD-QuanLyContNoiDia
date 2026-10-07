import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  EdiMessageType,
  EdiOutboxStatus,
} from '../../../generated/prisma/client';

export class QueryEdiOutboxDto extends PaginationQueryDto {
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

}
