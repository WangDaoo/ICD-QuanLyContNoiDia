import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class PreviewBillingDto {
  @IsString()
  @IsNotEmpty()
  containerVisitId!: string;

  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @IsString()
  @IsOptional()
  tariffId?: string;
}
