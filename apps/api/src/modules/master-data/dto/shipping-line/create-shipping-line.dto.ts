import {
  Transform,
} from 'class-transformer';

import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateShippingLineDto {
  @Transform(
    ({ value }) =>
      typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

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
  scacCode!: string;
}
