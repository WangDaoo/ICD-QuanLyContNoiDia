import {
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertStatus,
  EdiAlertType,
} from '../../../generated/prisma/client';

export class QueryEdiAlertDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EdiAlertStatus)
  status?: EdiAlertStatus;

  @IsOptional()
  @IsEnum(EdiAlertSeverity)
  severity?: EdiAlertSeverity;

  @IsOptional()
  @IsEnum(EdiAlertType)
  alertType?: EdiAlertType;

  @IsOptional()
  @IsEnum(EdiAlertSourceType)
  sourceType?: EdiAlertSourceType;

}
