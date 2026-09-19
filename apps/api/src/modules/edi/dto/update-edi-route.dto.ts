import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  EdiOutboundFormat,
  EdiTransport,
} from '../../../generated/prisma/client';

export class UpdateEdiRouteDto {
  @IsBoolean()
  enabled!: boolean;

  @IsEnum(EdiTransport)
  transport!: EdiTransport;

  @IsEnum(EdiOutboundFormat)
  outboundFormat!: EdiOutboundFormat;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  partnerTarget!: string;

  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  credentialRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  hostKeySha256?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs: number = 10000;
}
