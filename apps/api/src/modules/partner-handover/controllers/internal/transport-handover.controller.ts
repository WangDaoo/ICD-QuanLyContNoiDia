import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.types';
import { CreateTransportHandoverDto } from '../../dto/create-transport-handover.dto';
import { QueryTransportHandoverDto } from '../../dto/query-transport-handover.dto';
import { HandoverService } from '../../services/handover.service';

@Controller('transport-handovers')
export class TransportHandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Permissions(PERMISSION_CODES.HANDOVER_CREATE)
  @Post()
  async create(
    @Body() dto: CreateTransportHandoverDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.handoverService.create(
      dto,
      actor.id,
      actor.icdId,
    );
    return {
      data,
      message: 'Tạo biên bản bàn giao vận tải thành công (DRAFT).',
    };
  }

  @Permissions(PERMISSION_CODES.HANDOVER_READ)
  @Get()
  async findMany(
    @Query() query: QueryTransportHandoverDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.handoverService.findMany(actor.icdId, query);
  }

  @Permissions(PERMISSION_CODES.HANDOVER_READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.handoverService.findById(id, actor.icdId);
    return { data };
  }

  @Permissions(PERMISSION_CODES.HANDOVER_CREATE)
  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.handoverService.publish(
      id,
      actor.id,
      actor.icdId,
    );
    return {
      data,
      message: 'Công bố biên bản bàn giao thành công (READY_FOR_HANDOVER).',
    };
  }
}
