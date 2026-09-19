import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTariffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
