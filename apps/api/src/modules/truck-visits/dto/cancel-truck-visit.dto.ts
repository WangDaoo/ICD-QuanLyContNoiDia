import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTruckVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
