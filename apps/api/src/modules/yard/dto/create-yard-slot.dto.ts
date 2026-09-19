import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CONTAINER_TYPES,
  type ContainerType,
} from '../../containers/constants/container-types.constants';

export class CreateYardSlotDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  rowNo!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  bayNo!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  tierNo!: string;

  @IsOptional()
  @IsIn([...CONTAINER_TYPES])
  supportedContainerType?: ContainerType;

  @IsOptional()
  @IsBoolean()
  reeferPower: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  maxWeight?: number;
}
