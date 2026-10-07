import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsPositive } from 'class-validator';
import { PaymentMethod } from '../../../../generated/prisma/client';

export class RecordInvoicePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsISO8601()
  paidAt!: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;
}
