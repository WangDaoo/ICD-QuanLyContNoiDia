import { IsBooleanString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { InvoiceStatus } from '../../../../generated/prisma/client';

export class QueryInvoicesDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsUUID()
  consigneeId?: string;

  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;

  @IsOptional()
  @IsUUID()
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsBooleanString()
  isOverdue?: string;
}
