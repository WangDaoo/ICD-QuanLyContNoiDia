import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTariffDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
