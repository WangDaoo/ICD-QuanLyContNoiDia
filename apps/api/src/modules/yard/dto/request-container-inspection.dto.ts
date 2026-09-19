import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestContainerInspectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  inspectionType!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
