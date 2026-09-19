import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServiceOrderDto {
  @IsString()
  @IsNotEmpty()
  containerVisitId!: string;

  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @IsString()
  @IsOptional()
  tariffId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
