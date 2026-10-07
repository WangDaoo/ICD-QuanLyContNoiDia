import { IsNotEmpty, IsString } from 'class-validator';

export class UnregisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
