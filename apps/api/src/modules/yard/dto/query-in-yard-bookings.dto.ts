import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InYardBookingStatus, InYardBookingType } from '../../../generated/prisma/client';

export class QueryInYardBookingsDto {
  @IsOptional()
  @IsUUID()
  containerVisitId?: string;

  @IsOptional()
  @IsEnum(InYardBookingType)
  bookingType?: InYardBookingType;

  @IsOptional()
  @IsEnum(InYardBookingStatus)
  status?: InYardBookingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
