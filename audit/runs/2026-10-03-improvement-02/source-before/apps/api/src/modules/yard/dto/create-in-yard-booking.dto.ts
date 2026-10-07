import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { InYardBookingType } from '../../../generated/prisma/client';

export class CreateInYardBookingDto {
  @IsEnum(InYardBookingType)
  bookingType!: InYardBookingType;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  conditionNotes?: string;
}
