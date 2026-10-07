import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { YardMovementStatus } from '../../../generated/prisma/client';

export class QueryYardMovementsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  containerVisitId?: string;

  @IsOptional()
  @IsEnum(YardMovementStatus)
  status?: YardMovementStatus;

}
