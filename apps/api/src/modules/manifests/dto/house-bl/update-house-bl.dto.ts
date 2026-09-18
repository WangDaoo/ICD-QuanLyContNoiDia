import {
  Transform,
  Type,
} from 'class-transformer';

import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateHouseBlDto {
  @IsOptional()
  @Transform(
    ({ value }) =>
      typeof value === 'string'
        ? value.trim().toUpperCase()
        : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  hblNumber?: string;

  @IsOptional()
  @IsUUID()
  consigneeId?: string;

  @IsOptional()
  @IsUUID()
  clearingAgentId?: string;

  @IsOptional()
  @Transform(
    ({ value }) =>
      typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString()
  @MinLength(1)
  cargoDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @IsPositive()
  grossWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageCount?: number;
}
