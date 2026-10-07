import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTransportHandoverDto {
  @IsString()
  @IsNotEmpty()
  containerVisitId!: string;

  @IsString()
  @IsNotEmpty()
  partnerApiClientId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  transportCode!: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: string;
}
