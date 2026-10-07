import { IsOptional, IsString } from 'class-validator';

export class CancelInYardBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
