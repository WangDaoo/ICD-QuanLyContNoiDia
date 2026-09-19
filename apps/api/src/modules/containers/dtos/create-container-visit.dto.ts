import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ContainerCategory, ContainerSize, ContainerType } from '../../../generated/prisma/client';

export class CreateContainerVisitDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{4}\d{7}$/, {
    message: 'containerNumber must match ISO 6346 format (4 letters + 7 digits)',
  })
  containerNumber!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  isoCode!: string;

  @IsNotEmpty()
  @IsEnum(ContainerSize)
  size!: ContainerSize;

  @IsNotEmpty()
  @IsEnum(ContainerType)
  type!: ContainerType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  height?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  tareWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  maxPayload?: number;

  @IsOptional()
  @IsUUID()
  houseBlId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sealNumber?: string;

  @IsOptional()
  @IsString()
  cargoDescription?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  grossWeight?: number;

  @IsOptional()
  @IsEnum(ContainerCategory)
  category?: ContainerCategory;
}
