import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class ArriveTruckVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gateLane?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  arrivedAt?: Date;
}
