import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationMeta } from '../../../common/dto/pagination-query.dto';
import { InvoiceStatus, Prisma, type Payment } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { CreatePaymentDto } from '../dto/payment/create-payment.dto';
import { RecordInvoicePaymentDto } from '../dto/payment/record-invoice-payment.dto';
import { QueryPaymentsDto } from '../dto/payment/query-payments.dto';
import { mapPayment, PAYMENT_DETAIL_INCLUDE } from '../mappers/payment.mapper';
import { generatePaymentReference } from '../utils/payment-reference.util';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: ContainerEventService,
  ) {}

  async createForInvoice(
    invoiceId: string,
    dto: RecordInvoicePaymentDto,
    actor: AuthenticatedUser,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        serviceOrder: {
          icdId: actor.icdId,
        },
      },
      include: {
        serviceOrder: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
        message: `Invoice ${invoiceId} not found`,
      });
    }

    return this.create(
      {
        consigneeId: invoice.serviceOrder.consigneeId,
        amount: dto.amount,
        method: dto.method,
        paidAt: dto.paidAt,
        paymentRef: dto.referenceNo,
        allocations: [{ invoiceId, amount: dto.amount }],
      },
      actor,
    );
  }

  async create(dto: CreatePaymentDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const consignee = await tx.consignee.findUnique({
        where: { id: dto.consigneeId },
      });

      if (!consignee) {
        throw new NotFoundException({
          code: BILLING_ERROR_CODES.CONSIGNEE_REQUIRED,
          message: `Consignee ${dto.consigneeId} not found`,
        });
      }

      const totalAllocated = dto.allocations.reduce((sum, a) => sum + Number(a.amount), 0);

      if (Math.abs(totalAllocated - Number(dto.amount)) > 0.01) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.PAYMENT_ALLOCATION_EXCEEDS_PAYMENT,
          message: `Allocated amount (${totalAllocated}) does not match payment amount (${dto.amount})`,
        });
      }

      const invoiceIdSet = new Set<string>();
      for (const alloc of dto.allocations) {
        if (invoiceIdSet.has(alloc.invoiceId)) {
          throw new BadRequestException({
            code: BILLING_ERROR_CODES.PAYMENT_ALLOCATION_DUPLICATE,
            message: `Duplicate allocation for invoice ${alloc.invoiceId}`,
          });
        }
        invoiceIdSet.add(alloc.invoiceId);
      }

      const invoiceUpdates: {
        invoiceId: string;
        containerVisitId: string;
        newPaidAmount: number;
        newStatus: InvoiceStatus;
        allocatedAmount: number;
        invoiceNo: string;
      }[] = [];

      for (const alloc of dto.allocations) {
        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
          include: {
            serviceOrder: true,
          },
        });

        if (!invoice || invoice.serviceOrder.icdId !== actor.icdId) {
          throw new NotFoundException({
            code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
            message: `Invoice ${alloc.invoiceId} not found`,
          });
        }

        if (invoice.serviceOrder.consigneeId !== dto.consigneeId) {
          throw new BadRequestException({
            code: BILLING_ERROR_CODES.PAYMENT_INVOICE_CONSIGNEE_MISMATCH,
            message: `Invoice ${invoice.invoiceNo} belongs to a different consignee`,
          });
        }

        if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
          throw new BadRequestException({
            code: BILLING_ERROR_CODES.PAYMENT_INVOICE_INVALID_STATE,
            message: `Invoice ${invoice.invoiceNo} is already ${invoice.status}`,
          });
        }

        const totalAmount = Number(invoice.totalAmount);
        const currentPaid = Number(invoice.paidAmount);
        const remaining = totalAmount - currentPaid;

        if (alloc.amount > remaining + 0.01) {
          throw new BadRequestException({
            code: BILLING_ERROR_CODES.PAYMENT_ALLOCATION_EXCEEDS_INVOICE_BALANCE,
            message: `Allocation amount ${alloc.amount} exceeds invoice ${invoice.invoiceNo} remaining balance ${remaining}`,
          });
        }

        const newPaid = currentPaid + alloc.amount;
        const newStatus =
          newPaid >= totalAmount - 0.01 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

        invoiceUpdates.push({
          invoiceId: invoice.id,
          containerVisitId: invoice.serviceOrder.containerVisitId,
          newPaidAmount: newPaid,
          newStatus,
          allocatedAmount: alloc.amount,
          invoiceNo: invoice.invoiceNo,
        });
      }

      const paymentRef = dto.paymentRef ?? generatePaymentReference();
      const paidAt = new Date(dto.paidAt);

      let createdPayment: Payment;
      try {
        createdPayment = await tx.payment.create({
          data: {
            consigneeId: dto.consigneeId,
            paymentRef,
            amount: dto.amount,
            method: dto.method,
            paidAt,
            recordedById: actor.id,
          },
        });
      } catch (error: unknown) {
        if (this.isPaymentReferenceConflict(error)) {
          throw new ConflictException({
            code: BILLING_ERROR_CODES.PAYMENT_REFERENCE_DUPLICATE,
            message: 'Mã tham chiếu thanh toán đã được sử dụng.',
          });
        }
        throw error;
      }

      for (const update of invoiceUpdates) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: createdPayment.id,
            invoiceId: update.invoiceId,
            amount: update.allocatedAmount,
          },
        });

        await tx.invoice.update({
          where: { id: update.invoiceId },
          data: {
            paidAmount: update.newPaidAmount,
            status: update.newStatus,
          },
        });

        await this.eventService.record(tx, {
          containerVisitId: update.containerVisitId,
          eventType: CONTAINER_EVENT_TYPES.PAYMENT_RECORDED,
          actorUserId: actor.id,
          metadataJson: {
            paymentId: createdPayment.id,
            paymentRef: createdPayment.paymentRef,
            invoiceId: update.invoiceId,
            invoiceNo: update.invoiceNo,
            amount: update.allocatedAmount,
            method: createdPayment.method,
          },
        });

        const statusEventType =
          update.newStatus === InvoiceStatus.PAID
            ? CONTAINER_EVENT_TYPES.INVOICE_PAID
            : CONTAINER_EVENT_TYPES.INVOICE_PARTIALLY_PAID;

        await this.eventService.record(tx, {
          containerVisitId: update.containerVisitId,
          eventType: statusEventType,
          actorUserId: actor.id,
          metadataJson: {
            invoiceId: update.invoiceId,
            invoiceNo: update.invoiceNo,
            paidAmount: update.newPaidAmount,
            status: update.newStatus,
          },
        });
      }

      const fullPayment = await tx.payment.findUniqueOrThrow({
        where: { id: createdPayment.id },
        include: PAYMENT_DETAIL_INCLUDE,
      });

      return mapPayment(fullPayment);
    });
  }

  async findById(id: string, _actor: AuthenticatedUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: PAYMENT_DETAIL_INCLUDE,
    });

    if (!payment) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.PAYMENT_NOT_FOUND,
        message: `Payment ${id} not found`,
      });
    }

    return mapPayment(payment);
  }

  private isPaymentReferenceConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.length === 1 && (target[0] === 'payment_ref' || target[0] === 'paymentRef');
    }
    if (target === 'payment_payment_ref_key') return true;

    // Prisma 7's MariaDB adapter reports the database index in its original cause.
    const adapterError = error.meta?.driverAdapterError;
    if (typeof adapterError !== 'object' || adapterError === null || !('cause' in adapterError)) {
      return false;
    }
    const cause = adapterError.cause;
    if (typeof cause !== 'object' || cause === null || !('kind' in cause) ||
      cause.kind !== 'UniqueConstraintViolation' || !('constraint' in cause)) {
      return false;
    }
    const constraint = cause.constraint;
    return typeof constraint === 'object' && constraint !== null &&
      'index' in constraint && constraint.index === 'payment_payment_ref_key';
  }

  async findMany(query: QueryPaymentsDto, _actor: AuthenticatedUser) {
    const where: Prisma.PaymentWhereInput = {};

    if (query.consigneeId) {
      where.consigneeId = query.consigneeId;
    }

    if (query.method) {
      where.method = query.method;
    }

    if (query.paymentRef) {
      where.paymentRef = { contains: query.paymentRef.trim() };
    }

    if (query.fromDate || query.toDate) {
      where.paidAt = {};
      if (query.fromDate) {
        where.paidAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.paidAt.lte = new Date(query.toDate);
      }
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_DETAIL_INCLUDE,
        orderBy: {
          paidAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: payments.map(mapPayment),
      meta: getPaginationMeta(page, pageSize, total),
    };
  }
}
