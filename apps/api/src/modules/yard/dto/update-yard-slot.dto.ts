import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import {
  CONTAINER_TYPES,
  type ContainerType,
} from '../../containers/constants/container-types.constants';

export class UpdateYardSlotDto {
  @IsOptional()
  @IsIn([...CONTAINER_TYPES])
  supportedContainerType?: ContainerType;

  @IsOptional()
  @IsBoolean()
  reeferPower?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  maxWeight?: number;

  @IsOptional()
  @IsBoolean()
  operational?: boolean;
}
