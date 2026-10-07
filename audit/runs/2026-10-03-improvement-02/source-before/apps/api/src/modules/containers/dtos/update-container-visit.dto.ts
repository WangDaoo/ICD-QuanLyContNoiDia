import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { ContainerCategory, FullEmptyStatus } from '../../../generated/prisma/client';

export class UpdateContainerVisitDto {
  @IsOptional()
  @IsUUID()
  houseBlId?: string;

  @IsOptional()
  @IsUUID()
  manifestId?: string;

  @IsOptional()
  @IsUUID()
  masterBlId?: string;

  @IsOptional()
  @IsUUID()
  consigneeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sealNo?: string;

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
  @IsEnum(FullEmptyStatus)
  fullEmptyStatus?: FullEmptyStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
