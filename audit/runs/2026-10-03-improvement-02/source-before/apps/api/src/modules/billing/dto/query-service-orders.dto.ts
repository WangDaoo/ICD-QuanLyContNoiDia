import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ServiceOrderStatus } from '../../../generated/prisma/client';

export class QueryServiceOrdersDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  containerVisitId?: string;

  @IsString()
  @IsOptional()
  consigneeId?: string;

  @IsEnum(ServiceOrderStatus)
  @IsOptional()
  status?: ServiceOrderStatus;

  @IsString()
  @IsOptional()
  keyword?: string;
}
