import {
  Transform,
} from 'class-transformer';

import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMasterBlDto {
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
  mblNumber?: string;

  @IsOptional()
  @IsUUID()
  shippingLineId?: string;
}
