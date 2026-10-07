import { Transform, Type } from 'class-transformer';

import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHouseBlDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  hblNumber!: string;

  @IsUUID()
  consigneeId!: string;

  @IsUUID()
  clearingAgentId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  cargoDescription!: string;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @IsPositive()
  grossWeight!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageCount!: number;
}
