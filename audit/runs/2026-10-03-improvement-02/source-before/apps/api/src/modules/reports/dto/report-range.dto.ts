import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ReportRangeDto {
  @IsOptional()
  @Matches(DATE_PATTERN)
  fromDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  toDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;
}
