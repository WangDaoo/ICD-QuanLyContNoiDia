import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { CreateOperationalHoldDto } from './dto/create-operational-hold.dto';
import { ReleaseOperationalHoldDto } from './dto/release-operational-hold.dto';
import { OperationalHoldService } from './services/operational-hold.service';

@Controller()
export class OperationalHoldsController {
  constructor(private readonly operationalHoldService: OperationalHoldService) {}

  @Permissions(PERMISSION_CODES.OPERATIONAL_HOLD_READ)
  @Get('containers/:visitId/operational-holds')
  async findManyForVisit(
    @Param('visitId') visitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.operationalHoldService.findManyForVisit(visitId, actor.icdId);
    return { data };
  }

  @Permissions(PERMISSION_CODES.OPERATIONAL_HOLD_READ)
  @Get('operational-holds/:holdId')
  async findById(@Param('holdId') holdId: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.operationalHoldService.findById(holdId, actor.icdId);
    return { data };
  }

  @Permissions(PERMISSION_CODES.OPERATIONAL_HOLD_MANAGE)
  @Post('containers/:visitId/operational-holds')
  async create(
    @Param('visitId') visitId: string,
    @Body() dto: CreateOperationalHoldDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.operationalHoldService.create(visitId, dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.OPERATIONAL_HOLD_MANAGE)
  @Post('operational-holds/:holdId/release')
  async release(
    @Param('holdId') holdId: string,
    @Body() dto: ReleaseOperationalHoldDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.operationalHoldService.release(holdId, dto, actor);
    return { data };
  }
}
