import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { RecordInvoicePaymentDto } from './dto/payment/record-invoice-payment.dto';
import { QueryPaymentsDto } from './dto/payment/query-payments.dto';
import { PaymentService } from './services/payment.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post('invoices/:invoiceId/payments')
  async create(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RecordInvoicePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.paymentService.createForInvoice(
      invoiceId,
      dto,
      actor,
    );
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('payments')
  async findMany(@Query() query: QueryPaymentsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.paymentService.findMany(query, actor);
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('payments/:id')
  async findById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.paymentService.findById(id, actor);
    return { data };
  }
}
