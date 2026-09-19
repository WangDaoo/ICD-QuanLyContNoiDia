import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TariffStatus } from '../../../generated/prisma/client';

export class QueryTariffsDto {
  @IsEnum(TariffStatus)
  @IsOptional()
  status?: TariffStatus;

  @IsString()
  @IsOptional()
  keyword?: string;
}
