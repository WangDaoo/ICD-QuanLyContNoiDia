import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteInYardBookingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualPackageCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  actualWeight?: number;

  @IsOptional()
  @IsString()
  conditionNotes?: string;
}
