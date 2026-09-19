import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContainerInspectionResult,
  ContainerInspectionStatus,
} from '../../../generated/prisma/client';

export class QueryContainerInspectionsDto {
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
