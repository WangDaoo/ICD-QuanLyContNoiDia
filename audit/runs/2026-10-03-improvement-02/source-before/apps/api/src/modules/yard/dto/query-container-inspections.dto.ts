import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  ContainerInspectionResult,
  ContainerInspectionStatus,
} from '../../../generated/prisma/client';

export class QueryContainerInspectionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  containerVisitId?: string;

  @IsOptional()
  @IsString()
  inspectionType?: string;

  @IsOptional()
  @IsEnum(ContainerInspectionStatus)
  status?: ContainerInspectionStatus;

  @IsOptional()
  @IsEnum(ContainerInspectionResult)
  result?: ContainerInspectionResult;

}
