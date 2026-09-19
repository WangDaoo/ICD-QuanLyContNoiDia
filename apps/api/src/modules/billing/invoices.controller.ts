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
import { IssueInvoiceDto } from './dto/invoice/issue-invoice.dto';
import { QueryInvoicesDto } from './dto/invoice/query-invoices.dto';
import { InvoiceService } from './services/invoice.service';

@Controller('billing/invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Permissions(PERMISSION_CODES.BILLING_MANAGE)
  @Post(':serviceOrderId/issue')
  async issueInvoice(
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: IssueInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.invoiceService.issueInvoice(
      serviceOrderId,
      dto,
      actor,
    );
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get()
  async findMany(
    @Query() query: QueryInvoicesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.invoiceService.findMany(query, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.invoiceService.findById(id, actor);
    return { data };
  }
}
