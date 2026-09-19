import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ContainerSize,
  ContainerType,
} from '../../../generated/prisma/client';

export class AddTariffRuleDto {
  @IsString()
  @IsNotEmpty()
  serviceTypeId!: string;

  @IsEnum(ContainerSize)
  @IsOptional()
  containerSize?: ContainerSize;

  @IsEnum(ContainerType)
  @IsOptional()
  containerType?: ContainerType;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
