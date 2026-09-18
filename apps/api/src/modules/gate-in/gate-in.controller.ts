import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { CreateContainerReceptionDto } from './dto/create-container-reception.dto';
import { GateInService } from './gate-in.service';

@Controller('containers')
export class GateInController {
  constructor(private readonly gateInService: GateInService) {}

  @Get(':visitId/gate-in-context')
  @Permissions(PERMISSION_CODES.GATE_IN_CREATE)
  async getContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.gateInService.getContext(visitId, user);
  }

  @Post(':visitId/gate-in')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.GATE_IN_CREATE)
  async gateIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: CreateContainerReceptionDto,
  ) {
    return this.gateInService.gateIn(visitId, dto, user);
  }

  @Get(':visitId/reception')
  @Permissions(PERMISSION_CODES.CONTAINER_READ)
  async getReception(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.gateInService.getReceptionByVisitId(visitId, user);
  }
}
