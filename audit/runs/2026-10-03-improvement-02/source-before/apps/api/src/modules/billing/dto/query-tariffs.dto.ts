import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TariffStatus } from '../../../generated/prisma/client';

export class QueryTariffsDto extends PaginationQueryDto {
  @IsEnum(TariffStatus)
  @IsOptional()
  status?: TariffStatus;

  @IsString()
  @IsOptional()
  keyword?: string;
}
