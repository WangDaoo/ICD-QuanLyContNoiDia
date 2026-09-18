import {
  Transform,
} from 'class-transformer';

import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateClearingAgentDto {
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
        ? value.trim()
        : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  licenseNo?: string;
}
