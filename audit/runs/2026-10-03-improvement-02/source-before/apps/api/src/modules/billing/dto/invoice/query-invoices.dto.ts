import { IsBooleanString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { InvoiceStatus } from '../../../../generated/prisma/client';

export class QueryInvoicesDto extends PaginationQueryDto {
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
