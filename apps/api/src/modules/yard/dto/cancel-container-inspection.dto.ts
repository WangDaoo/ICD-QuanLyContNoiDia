import { IsOptional, IsString } from 'class-validator';

export class CancelContainerInspectionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
