import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { NotificationService } from '../services/notification.service';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UnregisterDeviceDto } from '../dto/unregister-device.dto';
import { NotificationHistoryQueryDto } from '../dto/notification-history-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationService.registerDevice(user.id, dto);
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UnregisterDeviceDto,
  ) {
    return this.notificationService.unregisterDevice(user.id, dto);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationHistoryQueryDto,
  ) {
    return this.notificationService.getHistory(user.id, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(user.id, notificationId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
