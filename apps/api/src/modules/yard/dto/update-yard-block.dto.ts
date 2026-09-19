import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateYardBlockDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  operational?: boolean;
}
