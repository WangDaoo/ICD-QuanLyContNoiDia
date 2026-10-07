import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptHandoverDto {
  @IsISO8601()
  accepted_at!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  partner_reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
