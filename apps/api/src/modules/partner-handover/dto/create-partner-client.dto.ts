import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePartnerClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  partnerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  partnerName!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];
}
