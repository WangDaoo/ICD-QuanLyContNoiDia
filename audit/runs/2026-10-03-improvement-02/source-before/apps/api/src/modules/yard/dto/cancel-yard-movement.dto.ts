import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelYardMovementDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
