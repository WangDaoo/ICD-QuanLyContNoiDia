import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { AssignYardSlotDto } from './dto/assign-yard-slot.dto';
import { CheckYardSlotDto } from './dto/check-yard-slot.dto';
import { CreateYardBlockDto } from './dto/create-yard-block.dto';
import { CreateYardSlotDto } from './dto/create-yard-slot.dto';
import { QueryYardSlotsDto } from './dto/query-yard-slots.dto';
import { UpdateYardBlockDto } from './dto/update-yard-block.dto';
import { UpdateYardSlotDto } from './dto/update-yard-slot.dto';
import { YardAssignmentService } from './services/yard-assignment.service';
import { YardCatalogService } from './services/yard-catalog.service';

@Controller()
export class YardController {
  constructor(
    private readonly catalogService: YardCatalogService,
    private readonly assignmentService: YardAssignmentService,
  ) {}

  // =========================================================
  // YARD CATALOG
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/blocks')
  async findBlocks(@CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.catalogService.findBlocks(actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_CONFIGURE)
  @Post('yard/blocks')
  async createBlock(
    @Body() dto: CreateYardBlockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.catalogService.createBlock(dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_CONFIGURE)
  @Patch('yard/blocks/:blockId')
  async updateBlock(
    @Param('blockId') blockId: string,
    @Body() dto: UpdateYardBlockDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.catalogService.updateBlock(blockId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/slots')
  findSlots(
    @Query() query: QueryYardSlotsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.catalogService.findSlots(query, actor);
  }

  @Permissions(PERMISSION_CODES.YARD_CONFIGURE)
  @Post('yard/blocks/:blockId/slots')
  async createSlot(
    @Param('blockId') blockId: string,
    @Body() dto: CreateYardSlotDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.catalogService.createSlot(blockId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_CONFIGURE)
  @Patch('yard/slots/:slotId')
  async updateSlot(
    @Param('slotId') slotId: string,
    @Body() dto: UpdateYardSlotDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.catalogService.updateSlot(slotId, dto, actor),
    };
  }

  // =========================================================
  // CONTAINER YARD ASSIGNMENT
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('containers/:visitId/yard/recommendations')
  async recommendations(
    @Param('visitId') visitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.assignmentService.getRecommendations(visitId, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_UPDATE)
  @Post('containers/:visitId/yard/check')
  async checkSlot(
    @Param('visitId') visitId: string,
    @Body() dto: CheckYardSlotDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.assignmentService.checkSlot(
        visitId,
        dto.yardSlotId,
        actor,
      ),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_UPDATE)
  @Post('containers/:visitId/yard/assign')
  async assign(
    @Param('visitId') visitId: string,
    @Body() dto: AssignYardSlotDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.assignmentService.assign(visitId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('containers/:visitId/yard/location')
  async currentLocation(
    @Param('visitId') visitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.assignmentService.getCurrentLocation(visitId, actor),
    };
  }
}
