import { Transform } from 'class-transformer';

import { IsISO8601, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateManifestDto {
  @IsUUID()
  shippingLineId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  vesselName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  voyageNo!: string;

  @IsISO8601()
  eta!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  portOfLoading!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  portOfDischarge!: string;
}
