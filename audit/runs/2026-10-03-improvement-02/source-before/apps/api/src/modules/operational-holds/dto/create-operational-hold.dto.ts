import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { OperationalHoldType } from '../../../generated/prisma/client';

export class CreateOperationalHoldDto {
  @IsEnum(OperationalHoldType)
  holdType!: OperationalHoldType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}
