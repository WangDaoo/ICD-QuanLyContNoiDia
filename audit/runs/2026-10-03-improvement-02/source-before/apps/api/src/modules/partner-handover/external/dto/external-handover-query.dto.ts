import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { TransportHandoverStatus } from '../../../../generated/prisma/client';

export class ExternalHandoverQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TransportHandoverStatus)
  status?: TransportHandoverStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  container_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  transport_code?: string;

  @IsOptional()
  @IsISO8601()
  ready_from?: string;

  @IsOptional()
  @IsISO8601()
  ready_to?: string;

}
