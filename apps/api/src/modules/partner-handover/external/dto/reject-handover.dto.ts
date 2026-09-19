import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectHandoverDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
