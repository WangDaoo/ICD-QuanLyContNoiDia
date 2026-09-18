import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { ArriveTruckVisitDto } from './dto/arrive-truck-visit.dto';
import { CancelTruckVisitDto } from './dto/cancel-truck-visit.dto';
import { CreateTruckVisitDto } from './dto/create-truck-visit.dto';
import { QueryTruckVisitsDto } from './dto/query-truck-visits.dto';
import { TruckVisitService } from './truck-visit.service';

@Controller('truck-visits')
export class TruckVisitsController {
  constructor(private readonly truckVisitService: TruckVisitService) {}

  @Get()
  @Permissions(PERMISSION_CODES.TRUCK_VISIT_READ)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTruckVisitsDto,
  ) {
    return this.truckVisitService.findAll(user.icdId, query);
  }

  @Get(':visitId')
  @Permissions(PERMISSION_CODES.TRUCK_VISIT_READ)
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ) {
    return this.truckVisitService.findById(user.icdId, visitId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.TRUCK_VISIT_CREATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTruckVisitDto,
  ) {
    return this.truckVisitService.create(user.icdId, user.id, dto);
  }

  @Post(':visitId/arrive')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.TRUCK_VISIT_ARRIVE)
  async arrive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: ArriveTruckVisitDto,
  ) {
    return this.truckVisitService.arrive(user.icdId, visitId, user.id, dto);
  }

  @Post(':visitId/cancel')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.TRUCK_VISIT_CANCEL)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: CancelTruckVisitDto,
  ) {
    return this.truckVisitService.cancel(user.icdId, visitId, user.id, dto);
  }
}
