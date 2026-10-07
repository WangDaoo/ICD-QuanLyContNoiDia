import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InYardBookingStatus, InYardBookingType } from '../../../generated/prisma/client';

export class QueryInYardBookingsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  containerVisitId?: string;

  @IsOptional()
  @IsEnum(InYardBookingType)
  bookingType?: InYardBookingType;

  @IsOptional()
  @IsEnum(InYardBookingStatus)
  status?: InYardBookingStatus;

}
