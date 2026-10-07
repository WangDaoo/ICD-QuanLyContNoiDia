import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class AuthorizeMovementOrderDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
