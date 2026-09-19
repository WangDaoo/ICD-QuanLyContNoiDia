import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InYardBookingStatus, Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { CancelInYardBookingDto } from '../dto/cancel-in-yard-booking.dto';
import type { CompleteInYardBookingDto } from '../dto/complete-in-yard-booking.dto';
import type { CreateInYardBookingDto } from '../dto/create-in-yard-booking.dto';
import type { QueryInYardBookingsDto } from '../dto/query-in-yard-bookings.dto';
import { InYardBookingPolicy } from '../policies/in-yard-booking.policy';

@Injectable()
export class InYardBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingPolicy: InYardBookingPolicy,
    private readonly containerEventService: ContainerEventService,
  ) {}

  async createBooking(visitId: string, dto: CreateInYardBookingDto, actor: AuthenticatedUser) {
    const visit = await this.prisma.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId: actor.icdId,
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    const validation = this.bookingPolicy.validateCanCreateBooking(visit.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const booking = await this.prisma.inYardBooking.create({
      data: {
        containerVisitId: visit.id,
        bookingType: dto.bookingType,
        status: InYardBookingStatus.PENDING,
        scheduledAt: new Date(dto.scheduledAt),
        conditionNotes: dto.conditionNotes,
        createdById: actor.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(this.prisma, {
      containerVisitId: visit.id,
      eventType: CONTAINER_EVENT_TYPES.IN_YARD_BOOKING_CREATED,
      actorUserId: actor.id,
      referenceType: 'in_yard_booking',
      referenceId: booking.id,
      metadataJson: {
        bookingId: booking.id,
        bookingType: booking.bookingType,
        scheduledAt: booking.scheduledAt.toISOString(),
      },
      note: `Đặt lịch tác nghiệp ${booking.bookingType} vào lúc ${booking.scheduledAt.toISOString()}`,
    });

    return booking;
  }

  async startBooking(bookingId: string, actor: AuthenticatedUser) {
    const booking = await this.prisma.inYardBooking.findFirst({
      where: {
        id: bookingId,
        containerVisit: { icdId: actor.icdId },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.BOOKING_NOT_FOUND,
        message: 'Không tìm thấy thông tin đặt lịch tác nghiệp bãi.',
      });
    }

    const validation = this.bookingPolicy.validateCanStartBooking(booking.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const updated = await this.prisma.inYardBooking.update({
      where: { id: booking.id },
      data: {
        status: InYardBookingStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(this.prisma, {
      containerVisitId: booking.containerVisitId,
      eventType: CONTAINER_EVENT_TYPES.IN_YARD_BOOKING_STARTED,
      actorUserId: actor.id,
      referenceType: 'in_yard_booking',
      referenceId: booking.id,
      metadataJson: {
        bookingId: booking.id,
        bookingType: booking.bookingType,
      },
      note: `Bắt đầu tác nghiệp bãi: ${booking.bookingType}`,
    });

    return updated;
  }

  async completeBooking(
    bookingId: string,
    dto: CompleteInYardBookingDto,
    actor: AuthenticatedUser,
  ) {
    const booking = await this.prisma.inYardBooking.findFirst({
      where: {
        id: bookingId,
        containerVisit: { icdId: actor.icdId },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.BOOKING_NOT_FOUND,
        message: 'Không tìm thấy thông tin đặt lịch tác nghiệp bãi.',
      });
    }

    const validation = this.bookingPolicy.validateCanCompleteBooking(booking.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const now = new Date();
    const updated = await this.prisma.inYardBooking.update({
      where: { id: booking.id },
      data: {
        status: InYardBookingStatus.COMPLETED,
        actualPackageCount:
          dto.actualPackageCount !== undefined
            ? dto.actualPackageCount
            : booking.actualPackageCount,
        actualWeight:
          dto.actualWeight !== undefined
            ? new Prisma.Decimal(dto.actualWeight)
            : booking.actualWeight,
        conditionNotes: dto.conditionNotes ?? booking.conditionNotes,
        completedAt: now,
        completedById: actor.id,
        startedAt: booking.startedAt ?? now,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        completedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(this.prisma, {
      containerVisitId: booking.containerVisitId,
      eventType: CONTAINER_EVENT_TYPES.IN_YARD_BOOKING_COMPLETED,
      actorUserId: actor.id,
      referenceType: 'in_yard_booking',
      referenceId: booking.id,
      metadataJson: {
        bookingId: booking.id,
        bookingType: booking.bookingType,
        actualPackageCount: updated.actualPackageCount,
        actualWeight: updated.actualWeight !== null ? Number(updated.actualWeight) : null,
      },
      note: `Hoàn tất tác nghiệp bãi: ${booking.bookingType}`,
    });

    return updated;
  }

  async cancelBooking(bookingId: string, dto: CancelInYardBookingDto, actor: AuthenticatedUser) {
    const booking = await this.prisma.inYardBooking.findFirst({
      where: {
        id: bookingId,
        containerVisit: { icdId: actor.icdId },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.BOOKING_NOT_FOUND,
        message: 'Không tìm thấy thông tin đặt lịch tác nghiệp bãi.',
      });
    }

    const validation = this.bookingPolicy.validateCanCancelBooking(booking.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const cancelled = await this.prisma.inYardBooking.update({
      where: { id: booking.id },
      data: {
        status: InYardBookingStatus.CANCELLED,
        conditionNotes: dto.reason
          ? `${booking.conditionNotes ?? ''} [Hủy: ${dto.reason}]`.trim()
          : booking.conditionNotes,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(this.prisma, {
      containerVisitId: booking.containerVisitId,
      eventType: CONTAINER_EVENT_TYPES.IN_YARD_BOOKING_CANCELLED,
      actorUserId: actor.id,
      referenceType: 'in_yard_booking',
      referenceId: booking.id,
      metadataJson: {
        bookingId: booking.id,
        reason: dto.reason,
      },
      note: `Đã hủy đặt lịch tác nghiệp ${booking.bookingType}. Lý do: ${dto.reason ?? 'Không có'}`,
    });

    return cancelled;
  }

  async findBookings(query: QueryInYardBookingsDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InYardBookingWhereInput = {
      containerVisit: {
        icdId: actor.icdId,
        ...(query.containerVisitId ? { id: query.containerVisitId } : {}),
      },
      ...(query.bookingType ? { bookingType: query.bookingType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.inYardBooking.count({ where }),
      this.prisma.inYardBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          containerVisit: {
            include: {
              container: true,
            },
          },
          createdByUser: { select: { id: true, name: true, email: true } },
          completedByUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(bookingId: string, actor: AuthenticatedUser) {
    const booking = await this.prisma.inYardBooking.findFirst({
      where: {
        id: bookingId,
        containerVisit: { icdId: actor.icdId },
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        completedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.BOOKING_NOT_FOUND,
        message: 'Không tìm thấy thông tin đặt lịch tác nghiệp bãi.',
      });
    }

    return booking;
  }
}
