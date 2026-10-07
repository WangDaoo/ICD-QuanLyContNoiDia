import { IsBoolean } from 'class-validator';

export class UpdateMasterDataStatusDto {
  @IsBoolean()
  active!: boolean;
}
