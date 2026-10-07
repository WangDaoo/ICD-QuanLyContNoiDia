import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PartnerApiClientStatus } from '../../../generated/prisma/client';

export class QueryPartnerClientDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PartnerApiClientStatus)
  status?: PartnerApiClientStatus;

  @IsOptional()
  @IsString()
  search?: string;

}
