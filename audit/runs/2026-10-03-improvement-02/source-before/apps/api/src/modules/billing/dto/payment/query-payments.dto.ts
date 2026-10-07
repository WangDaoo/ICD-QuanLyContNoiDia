import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaymentMethod } from '../../../../generated/prisma/client';

export class QueryPaymentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  consigneeId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @IsString()
  paymentRef?: string;
}
