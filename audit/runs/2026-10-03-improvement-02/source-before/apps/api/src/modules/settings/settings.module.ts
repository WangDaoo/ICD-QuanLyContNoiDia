import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingService } from './setting.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingsModule {}
