import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { ContainerCategory, ContainerHoldStatus } from '../../../generated/prisma/client';

export class UpdateContainerVisitDto {
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

  @IsOptional()
  @IsEnum(ContainerHoldStatus)
  holdStatus?: ContainerHoldStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentLocation?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
