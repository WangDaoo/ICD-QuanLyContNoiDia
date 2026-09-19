import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContainerInspectionResult } from '../../../generated/prisma/client';

export class CompleteContainerInspectionDto {
  @IsEnum(ContainerInspectionResult)
  result!: ContainerInspectionResult;

  @IsOptional()
  @IsString()
  notes?: string;
}
