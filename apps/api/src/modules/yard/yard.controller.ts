import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { AssignYardSlotDto } from './dto/assign-yard-slot.dto';
import { CancelContainerInspectionDto } from './dto/cancel-container-inspection.dto';
import { CancelInYardBookingDto } from './dto/cancel-in-yard-booking.dto';
import { CancelYardMovementDto } from './dto/cancel-yard-movement.dto';
import { CheckYardSlotDto } from './dto/check-yard-slot.dto';
import { CompleteContainerInspectionDto } from './dto/complete-container-inspection.dto';
import { CompleteInYardBookingDto } from './dto/complete-in-yard-booking.dto';
import { CreateInYardBookingDto } from './dto/create-in-yard-booking.dto';
import { CreateYardBlockDto } from './dto/create-yard-block.dto';
import { CreateYardSlotDto } from './dto/create-yard-slot.dto';
import { QueryContainerInspectionsDto } from './dto/query-container-inspections.dto';
import { QueryInYardBookingsDto } from './dto/query-in-yard-bookings.dto';
import { QueryYardMovementsDto } from './dto/query-yard-movements.dto';
import { QueryYardSlotsDto } from './dto/query-yard-slots.dto';
import { RequestContainerInspectionDto } from './dto/request-container-inspection.dto';
import { RequestYardMovementDto } from './dto/request-yard-movement.dto';
import { UpdateYardBlockDto } from './dto/update-yard-block.dto';
import { UpdateYardSlotDto } from './dto/update-yard-slot.dto';
import { ContainerInspectionService } from './services/container-inspection.service';
import { InYardBookingService } from './services/in-yard-booking.service';
import { YardAssignmentService } from './services/yard-assignment.service';
import { YardCatalogService } from './services/yard-catalog.service';
import { YardMovementService } from './services/yard-movement.service';
import { YardOperationReadService } from './services/yard-operation-read.service';

@Controller()
export class YardController {
  constructor(
    private readonly catalogService: YardCatalogService,
    private readonly assignmentService: YardAssignmentService,
    private readonly movementService: YardMovementService,
    private readonly inspectionService: ContainerInspectionService,
    private readonly bookingService: InYardBookingService,
    private readonly operationReadService: YardOperationReadService,
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
  async createBlock(@Body() dto: CreateYardBlockDto, @CurrentUser() actor: AuthenticatedUser) {
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
  findSlots(@Query() query: QueryYardSlotsDto, @CurrentUser() actor: AuthenticatedUser) {
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
      data: await this.assignmentService.checkSlot(visitId, dto.yardSlotId, actor),
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

  // =========================================================
  // YARD MOVEMENTS
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/movements')
  findMovements(@Query() query: QueryYardMovementsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.movementService.findMovements(query, actor);
  }

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/movements/:id')
  async getMovementById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.movementService.getMovementById(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_MOVE)
  @Post('containers/:visitId/yard/movements')
  async requestMovement(
    @Param('visitId') visitId: string,
    @Body() dto: RequestYardMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.movementService.requestMovement(visitId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_MOVE)
  @Post('yard/movements/:id/start')
  async startMovement(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.movementService.startMovement(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_MOVE)
  @Post('yard/movements/:id/complete')
  async completeMovement(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.movementService.completeMovement(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_MOVE)
  @Post('yard/movements/:id/cancel')
  async cancelMovement(
    @Param('id') id: string,
    @Body() dto: CancelYardMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.movementService.cancelMovement(id, dto, actor),
    };
  }

  // =========================================================
  // CONTAINER INSPECTIONS
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/inspections')
  findInspections(
    @Query() query: QueryContainerInspectionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inspectionService.findInspections(query, actor);
  }

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/inspections/:id')
  async getInspectionById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.inspectionService.getInspectionById(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_INSPECT)
  @Post('containers/:visitId/yard/inspections')
  async requestInspection(
    @Param('visitId') visitId: string,
    @Body() dto: RequestContainerInspectionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.inspectionService.requestInspection(visitId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_INSPECT)
  @Post('yard/inspections/:id/start')
  async startInspection(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.inspectionService.startInspection(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_INSPECT)
  @Post('yard/inspections/:id/complete')
  async completeInspection(
    @Param('id') id: string,
    @Body() dto: CompleteContainerInspectionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.inspectionService.completeInspection(id, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_INSPECT)
  @Post('yard/inspections/:id/cancel')
  async cancelInspection(
    @Param('id') id: string,
    @Body() dto: CancelContainerInspectionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.inspectionService.cancelInspection(id, dto, actor),
    };
  }

  // =========================================================
  // IN-YARD BOOKINGS
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/bookings')
  findBookings(@Query() query: QueryInYardBookingsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bookingService.findBookings(query, actor);
  }

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('yard/bookings/:id')
  async getBookingById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.bookingService.getBookingById(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_BOOKING)
  @Post('containers/:visitId/yard/bookings')
  async createBooking(
    @Param('visitId') visitId: string,
    @Body() dto: CreateInYardBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.bookingService.createBooking(visitId, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_BOOKING)
  @Post('yard/bookings/:id/start')
  async startBooking(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return {
      data: await this.bookingService.startBooking(id, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_BOOKING)
  @Post('yard/bookings/:id/complete')
  async completeBooking(
    @Param('id') id: string,
    @Body() dto: CompleteInYardBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.bookingService.completeBooking(id, dto, actor),
    };
  }

  @Permissions(PERMISSION_CODES.YARD_BOOKING)
  @Post('yard/bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelInYardBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      data: await this.bookingService.cancelBooking(id, dto, actor),
    };
  }

  // =========================================================
  // YARD OPERATIONS SUMMARY FOR VISIT
  // =========================================================

  @Permissions(PERMISSION_CODES.YARD_READ)
  @Get('containers/:visitId/yard/operations/active-summary')
  async getActiveSummary(@Param('visitId') visitId: string) {
    return {
      data: await this.operationReadService.getActiveSummary(visitId),
    };
  }
}
