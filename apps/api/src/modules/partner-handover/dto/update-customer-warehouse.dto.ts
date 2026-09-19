import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCustomerWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  consigneeId?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
