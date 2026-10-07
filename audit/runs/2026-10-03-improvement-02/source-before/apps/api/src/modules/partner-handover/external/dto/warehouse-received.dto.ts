import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PartnerLocationDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracy_m?: number;
}

export class PartnerProofDto {
  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  image_url?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  signature_url?: string;
}

export class WarehouseReceivedDto {
  @IsISO8601()
  received_at!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  receiver_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiver_phone?: string;

  @IsString()
  @MaxLength(80)
  warehouse_code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  condition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerLocationDto)
  location?: PartnerLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerProofDto)
  proof?: PartnerProofDto;
}
