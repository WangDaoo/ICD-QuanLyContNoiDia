import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { CancelServiceOrderDto } from './dto/cancel-service-order.dto';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { PreviewBillingDto } from './dto/preview-billing.dto';
import { QueryServiceOrdersDto } from './dto/query-service-orders.dto';
import { ServiceOrderService } from './services/service-order.service';

@Controller()
export class BillingController {
  constructor(private readonly serviceOrderService: ServiceOrderService) {}

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Post('service-orders/preview')
  async previewBilling(@Body() dto: PreviewBillingDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.serviceOrderService.previewBilling(dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post('containers/:visitId/service-orders')
  async createDraftOrder(
    @Param('visitId') visitId: string,
    @Body() dto: CreateServiceOrderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.serviceOrderService.createDraftOrder(
      { ...dto, containerVisitId: visitId },
      actor,
    );
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('service-orders')
  async findServiceOrders(
    @Query() query: QueryServiceOrdersDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.serviceOrderService.findServiceOrders(query, actor);
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('service-orders/:id')
  async findServiceOrderById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.serviceOrderService.findServiceOrderById(id, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post('service-orders/:id/recalculate')
  async recalculateDraftOrder(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.serviceOrderService.recalculateDraftOrder(id, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post('service-orders/:id/confirm')
  async confirmOrder(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.serviceOrderService.confirmOrder(id, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post('service-orders/:id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelServiceOrderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.serviceOrderService.cancelOrder(id, dto, actor);
    return { data };
  }
}
