import {
  ArrayUnique,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @MaxLength(100, {
    each: true,
  })
  permissionCodes!: string[];
}
