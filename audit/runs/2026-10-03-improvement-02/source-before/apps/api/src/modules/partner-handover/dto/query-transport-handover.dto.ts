import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TransportHandoverStatus } from '../../../generated/prisma/client';

export class QueryTransportHandoverDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TransportHandoverStatus)
  status?: TransportHandoverStatus;

  @IsOptional()
  @IsString()
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  partnerApiClientId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  search?: string;

}
