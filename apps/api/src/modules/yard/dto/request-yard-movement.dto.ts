import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestYardMovementDto {
  @IsUUID()
  toSlotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
