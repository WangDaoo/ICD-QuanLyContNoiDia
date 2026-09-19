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
import { CreatePartnerClientDto } from '../../dto/create-partner-client.dto';
import { QueryPartnerClientDto } from '../../dto/query-partner-client.dto';
import { PartnerClientService } from '../../services/partner-client.service';

@Controller('partner-clients')
export class PartnerClientController {
  constructor(private readonly partnerClientService: PartnerClientService) {}

  @Permissions(PERMISSION_CODES.PARTNER_CLIENT_MANAGE)
  @Post()
  async create(
    @Body() dto: CreatePartnerClientDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.partnerClientService.create(dto, actor.id);
    return {
      data: result,
      message:
        'Tạo Partner API Client thành công. Vui lòng lưu lại API Key vì key chỉ hiển thị duy nhất một lần này.',
    };
  }

  @Permissions(PERMISSION_CODES.PARTNER_CLIENT_MANAGE)
  @Get()
  async findMany(@Query() query: QueryPartnerClientDto) {
    return this.partnerClientService.findMany(query);
  }

  @Permissions(PERMISSION_CODES.PARTNER_CLIENT_MANAGE)
  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.partnerClientService.findById(id);
    return { data };
  }

  @Permissions(PERMISSION_CODES.PARTNER_CLIENT_MANAGE)
  @Post(':id/rotate-key')
  async rotateKey(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.partnerClientService.rotateKey(id, actor.id);
    return {
      data: result,
      message:
        'Đổi API Key thành công. Vui lòng lưu lại API Key mới vì key chỉ hiển thị duy nhất một lần này.',
    };
  }

  @Permissions(PERMISSION_CODES.PARTNER_CLIENT_MANAGE)
  @Post(':id/revoke')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.partnerClientService.revoke(id, actor.id);
    return {
      data: result,
      message: 'Đã thu hồi (REVOKED) quyền truy cập của Partner API Client.',
    };
  }
}
