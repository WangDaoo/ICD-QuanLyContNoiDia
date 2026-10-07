import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelMovementOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
