import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationDevicePlatform } from '../../../generated/prisma/client';

export class RegisterDeviceDto {
  @IsEnum(NotificationDevicePlatform)
  platform!: NotificationDevicePlatform;

  @IsString()
  @IsNotEmpty()
  token!: string;
}
