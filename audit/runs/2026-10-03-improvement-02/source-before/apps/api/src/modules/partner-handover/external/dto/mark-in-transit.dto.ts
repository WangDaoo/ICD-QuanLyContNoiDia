import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MarkInTransitDto {
  @IsISO8601()
  departed_at!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  vehicle_plate!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  driver_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  driver_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  partner_trip_code?: string;
}
