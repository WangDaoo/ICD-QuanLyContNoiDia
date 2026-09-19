import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentAllocationDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}
