import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertStatus,
  EdiAlertType,
} from '../../../generated/prisma/client';

export class QueryEdiAlertDto {
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
