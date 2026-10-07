import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingService } from './setting.service';

@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  @Permissions(PERMISSION_CODES.SETTINGS_READ)
  findMany(@CurrentUser() actor: AuthenticatedUser) {
    return this.settingService.findMany(actor.icdId);
  }

  @Patch(':key')
  @Permissions(PERMISSION_CODES.SETTINGS_MANAGE)
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.settingService.update(actor.icdId, key, dto.value, actor.id);
  }
}
