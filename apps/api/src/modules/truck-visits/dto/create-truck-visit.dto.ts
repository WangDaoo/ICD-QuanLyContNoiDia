import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { TruckVisitType } from '../../../generated/prisma/client';

export class CreateTruckVisitDto {
  @IsOptional()
  @IsEnum(TruckVisitType)
  visitType?: TruckVisitType = TruckVisitType.GATE_IN;

  @IsNotEmpty({ message: 'Biển số xe không được để trống.' })
  @IsString()
  @MaxLength(50)
  vehiclePlate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  trailerPlate?: string;

  @IsNotEmpty({ message: 'Tên tài xế không được để trống.' })
  @IsString()
  @MaxLength(200)
  driverName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  driverPhone?: string;

  @IsOptional()
  @IsUUID('4')
  transporterId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appointmentAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gateLane?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Cần ít nhất một Container Visit.' })
  @IsUUID('4', { each: true })
  containerVisitIds!: string[];
}
