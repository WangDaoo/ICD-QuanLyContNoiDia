import {
  Transform,
} from 'class-transformer';

import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateShippingLineDto {
  @IsOptional()
  @Transform(
    ({ value }) =>
      typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Transform(
    ({ value }) =>
      typeof value === 'string'
        ? value
            .trim()
            .toUpperCase()
        : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  scacCode?: string;
}
