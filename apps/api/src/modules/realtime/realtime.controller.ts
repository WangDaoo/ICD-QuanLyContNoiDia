import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { RealtimeStreamService } from './realtime-stream.service';

@ApiTags('Realtime')
@ApiBearerAuth('access-token')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly streams: RealtimeStreamService) {}

  /**
   * Luồng Server-Sent Events báo nhóm dữ liệu vừa thay đổi.
   * Dùng `@Res()` để ResponseInterceptor không bọc luồng thành `{ data }`.
   */
  @Get('events')
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: 'Nhận sự kiện thay đổi dữ liệu theo thời gian thực (SSE)' })
  async streamEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.streams.open(user, request, response);
  }
}
