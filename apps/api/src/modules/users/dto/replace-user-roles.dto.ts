import { ArrayMinSize, ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator';

export class ReplaceUserRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @MaxLength(50, {
    each: true,
  })
  roleCodes!: string[];
}
