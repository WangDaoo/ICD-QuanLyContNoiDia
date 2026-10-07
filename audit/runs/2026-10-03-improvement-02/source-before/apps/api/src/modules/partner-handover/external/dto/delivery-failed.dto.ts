import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PartnerLocationDto } from './warehouse-received.dto';

export class DeliveryFailedDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reason_code!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason_description!: string;

  @IsISO8601()
  failed_at!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerLocationDto)
  location?: PartnerLocationDto;
}
