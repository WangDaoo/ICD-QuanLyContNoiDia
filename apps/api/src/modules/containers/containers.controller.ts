import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { ContainersService } from './containers.service';
import { CancelContainerVisitDto } from './dtos/cancel-container-visit.dto';
import { CreateContainerVisitDto } from './dtos/create-container-visit.dto';
import { QueryContainerVisitsDto } from './dtos/query-container-visits.dto';
import { UpdateContainerVisitDto } from './dtos/update-container-visit.dto';

@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Get()
  @Permissions(PERMISSION_CODES.CONTAINER_READ)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryContainerVisitsDto,
  ) {
    return this.containersService.findAll(user.icdId, query);
  }

  @Get(':visitId')
  @Permissions(PERMISSION_CODES.CONTAINER_READ)
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.containersService.findById(user.icdId, visitId);
  }

  @Get(':visitId/events')
  @Permissions(PERMISSION_CODES.CONTAINER_READ)
  async getEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.containersService.getEvents(user.icdId, visitId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.CONTAINER_CREATE)
  async createVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContainerVisitDto,
  ) {
    return this.containersService.createVisit(user.icdId, user.id, dto);
  }

  @Patch(':visitId')
  @Permissions(PERMISSION_CODES.CONTAINER_UPDATE)
  async updateVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateContainerVisitDto,
  ) {
    return this.containersService.updateVisit(
      user.icdId,
      visitId,
      user.id,
      dto,
    );
  }

  @Post(':visitId/cancel')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.CONTAINER_CANCEL)
  async cancelVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: CancelContainerVisitDto,
  ) {
    return this.containersService.cancelVisit(
      user.icdId,
      visitId,
      user.id,
      dto,
    );
  }
}
