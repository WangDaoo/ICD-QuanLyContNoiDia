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
import { AuthorizeMovementOrderDto } from './dto/authorize-movement-order.dto';
import { CancelMovementOrderDto } from './dto/cancel-movement-order.dto';
import { CreateMovementOrderDto } from './dto/create-movement-order.dto';
import { QueryMovementOrdersDto } from './dto/query-movement-orders.dto';
import { UpdateMovementOrderDto } from './dto/update-movement-order.dto';
import { MovementOrdersService } from './movement-orders.service';

@Controller('movement-orders')
export class MovementOrdersController {
  constructor(private readonly movementOrdersService: MovementOrdersService) {}

  @Get()
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_READ)
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryMovementOrdersDto) {
    return this.movementOrdersService.findAll(user.icdId, query);
  }

  @Get(':orderId')
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_READ)
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.movementOrdersService.findById(user.icdId, orderId);
  }

  @Post('containers/:visitId')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_CREATE)
  async createForContainer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: CreateMovementOrderDto,
  ) {
    return this.movementOrdersService.create(user.icdId, visitId, user.id, dto);
  }

  @Patch(':orderId')
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateMovementOrderDto,
  ) {
    return this.movementOrdersService.update(user.icdId, orderId, user.id, dto);
  }

  @Post(':orderId/authorize')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_AUTHORIZE)
  async authorize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AuthorizeMovementOrderDto,
  ) {
    return this.movementOrdersService.authorize(user.icdId, orderId, user.id, dto);
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MOVEMENT_ORDER_CANCEL)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CancelMovementOrderDto,
  ) {
    return this.movementOrdersService.cancel(user.icdId, orderId, user.id, dto);
  }
}
