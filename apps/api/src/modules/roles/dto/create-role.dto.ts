import {
  Transform,
} from 'class-transformer';

import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
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
  @MaxLength(50)
  @Matches(
    /^[A-Z][A-Z0-9_]*$/,
    {
      message:
        'Role code chỉ được chứa A-Z, 0-9 và dấu gạch dưới.',
    },
  )
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
