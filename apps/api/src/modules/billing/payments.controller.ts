import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { CreatePaymentDto } from './dto/payment/create-payment.dto';
import { QueryPaymentsDto } from './dto/payment/query-payments.dto';
import { PaymentService } from './services/payment.service';

@Controller('billing/payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post()
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.paymentService.create(dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get()
  async findMany(
    @Query() query: QueryPaymentsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.paymentService.findMany(query, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.paymentService.findById(id, actor);
    return { data };
  }
}
