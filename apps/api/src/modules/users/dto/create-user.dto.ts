import {
  Transform,
} from 'class-transformer';

import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
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
            .toLowerCase()
        : value,
  )
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @MaxLength(50, {
    each: true,
  })
  roleCodes!: string[];
}
