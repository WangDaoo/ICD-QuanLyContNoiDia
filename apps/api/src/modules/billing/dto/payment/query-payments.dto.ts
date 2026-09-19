import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from '../../../../generated/prisma/client';

export class QueryPaymentsDto {
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
