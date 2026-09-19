import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { InvoiceStatus, Prisma, ServiceOrderStatus } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { IssueInvoiceDto } from '../dto/invoice/issue-invoice.dto';
import { QueryInvoicesDto } from '../dto/invoice/query-invoices.dto';
import { INVOICE_DETAIL_INCLUDE, mapInvoice } from '../mappers/invoice.mapper';
import { generateInvoiceNumber } from '../utils/invoice-number.util';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: ContainerEventService,
  ) {}

  async issueInvoice(serviceOrderId: string, dto: IssueInvoiceDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: {
          items: true,
          containerVisit: {
            include: {
              container: true,
            },
          },
        },
      });

      if (!order || order.icdId !== actor.icdId) {
        throw new NotFoundException({
          code: BILLING_ERROR_CODES.SERVICE_ORDER_NOT_FOUND,
          message: `Service order ${serviceOrderId} not found`,
        });
      }

      if (order.status !== ServiceOrderStatus.CONFIRMED) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.SERVICE_ORDER_INVALID_STATE,
          message: `Cannot issue invoice for service order with status ${order.status}. Must be CONFIRMED.`,
        });
      }

      if (order.items.length === 0 || Number(order.totalAmount) <= 0) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.SERVICE_ORDER_EMPTY,
          message: 'Cannot issue invoice for empty or zero-amount service order',
        });
      }

      const existingInvoice = await tx.invoice.findUnique({
        where: { serviceOrderId },
      });

      if (existingInvoice) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.INVOICE_ALREADY_EXISTS,
          message: `Invoice already exists for service order ${serviceOrderId}`,
        });
      }

      const dueAtDate = new Date(dto.dueAt);
      if (Number.isNaN(dueAtDate.getTime())) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.INVOICE_DUE_DATE_INVALID,
          message: 'Invalid due date format',
        });
      }

      const invoiceNo = generateInvoiceNumber();
      const issuedAt = new Date();

      const createdInvoice = await tx.invoice.create({
        data: {
          serviceOrderId: order.id,
          invoiceNo,
          issuedAt,
          dueAt: dueAtDate,
          totalAmount: order.totalAmount,
          paidAmount: 0,
          status: InvoiceStatus.UNPAID,
        },
      });

      await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          status: ServiceOrderStatus.INVOICED,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.INVOICE_ISSUED,
        actorUserId: actor.id,
        metadataJson: {
          serviceOrderId: order.id,
          invoiceId: createdInvoice.id,
          invoiceNo: createdInvoice.invoiceNo,
          totalAmount: Number(createdInvoice.totalAmount),
          dueAt: createdInvoice.dueAt?.toISOString(),
        },
      });

      const fullInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: createdInvoice.id },
        include: INVOICE_DETAIL_INCLUDE,
      });

      return mapInvoice(fullInvoice);
    });
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_DETAIL_INCLUDE,
    });

    if (!invoice || invoice.serviceOrder.icdId !== actor.icdId) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
        message: `Invoice ${id} not found`,
      });
    }

    return mapInvoice(invoice);
  }

  async findMany(query: QueryInvoicesDto, actor: AuthenticatedUser) {
    const where: Prisma.InvoiceWhereInput = {
      serviceOrder: {
        icdId: actor.icdId,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.consigneeId) {
      where.serviceOrder = {
        ...(where.serviceOrder as Prisma.ServiceOrderWhereInput),
        consigneeId: query.consigneeId,
      };
    }

    if (query.serviceOrderId) {
      where.serviceOrderId = query.serviceOrderId;
    }

    if (query.containerVisitId) {
      where.serviceOrder = {
        ...(where.serviceOrder as Prisma.ServiceOrderWhereInput),
        containerVisitId: query.containerVisitId,
      };
    }

    if (query.keyword) {
      const kw = query.keyword.trim();
      where.OR = [
        { invoiceNo: { contains: kw } },
        {
          serviceOrder: {
            consignee: {
              name: { contains: kw },
            },
          },
        },
        {
          serviceOrder: {
            containerVisit: {
              container: {
                containerNumber: { contains: kw },
              },
            },
          },
        },
      ];
    }

    if (query.isOverdue === 'true') {
      where.dueAt = {
        lt: new Date(),
      };
      where.status = {
        in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: INVOICE_DETAIL_INCLUDE,
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return invoices.map(mapInvoice);
  }
}
