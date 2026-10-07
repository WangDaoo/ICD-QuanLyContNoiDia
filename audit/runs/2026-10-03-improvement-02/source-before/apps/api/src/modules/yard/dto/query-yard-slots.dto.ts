import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  CONTAINER_TYPES,
  type ContainerType,
} from '../../containers/constants/container-types.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryYardSlotsDto extends PaginationQueryDto {
  pageSize = 50;
  @IsOptional()
  @IsUUID()
  yardBlockId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn([...CONTAINER_TYPES])
  supportedContainerType?: ContainerType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  operational?: boolean;
}
