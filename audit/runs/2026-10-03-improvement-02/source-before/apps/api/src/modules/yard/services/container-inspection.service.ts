import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContainerInspectionResult, ContainerInspectionStatus, Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationMeta } from '../../../common/dto/pagination-query.dto';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { CancelContainerInspectionDto } from '../dto/cancel-container-inspection.dto';
import type { CompleteContainerInspectionDto } from '../dto/complete-container-inspection.dto';
import type { QueryContainerInspectionsDto } from '../dto/query-container-inspections.dto';
import type { RequestContainerInspectionDto } from '../dto/request-container-inspection.dto';
import { ContainerInspectionPolicy } from '../policies/container-inspection.policy';
import { PERMISSION_CODES } from '../../../common/constants/permission-codes.constants';
import { ROLE_CODES } from '../../../common/constants/role-codes.constants';
import { NotificationTriggerService } from '../../notifications/services/notification-trigger.service';

@Injectable()
export class ContainerInspectionService {
  private readonly logger = new Logger(ContainerInspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inspectionPolicy: ContainerInspectionPolicy,
    private readonly containerEventService: ContainerEventService,
    private readonly notificationTriggerService: NotificationTriggerService,
  ) {}

  async requestInspection(
    visitId: string,
    dto: RequestContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${visitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
      const visit = await tx.containerVisit.findFirst({
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

      const validation = this.inspectionPolicy.validateCanRequestInspection(visit.state);
      if (!validation.valid) {
        throw new ConflictException({
          code: validation.errorCode,
          message: validation.message,
        });
      }

      const inspection = await tx.containerInspection.create({
        data: {
          containerVisitId: visit.id,
          inspectionType: dto.inspectionType,
          status: ContainerInspectionStatus.PENDING,
          notes: dto.notes,
          createdById: actor.id,
        },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await this.containerEventService.record(tx, {
        containerVisitId: visit.id,
        eventType: CONTAINER_EVENT_TYPES.INSPECTION_REQUESTED,
        actorUserId: actor.id,
        referenceType: 'container_inspection',
        referenceId: inspection.id,
        metadataJson: {
          inspectionId: inspection.id,
          inspectionType: inspection.inspectionType,
        },
        note: `Tạo yêu cầu giám định: ${inspection.inspectionType}`,
      });

      return inspection;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async startInspection(inspectionId: string, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.containerInspection.findFirst({
        where: { id: inspectionId, containerVisit: { icdId: actor.icdId } },
        select: { containerVisitId: true },
      });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND, message: 'Không tìm thấy yêu cầu giám định.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
      const inspection = await tx.containerInspection.findFirst({
        where: {
          id: inspectionId,
          containerVisit: { icdId: actor.icdId },
        },
      });

      if (!inspection) {
        throw new NotFoundException({
          code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND,
          message: 'Không tìm thấy yêu cầu giám định.',
        });
      }

      const validation = this.inspectionPolicy.validateCanStartInspection(inspection.status);
      if (!validation.valid) {
        throw new ConflictException({
          code: validation.errorCode,
          message: validation.message,
        });
      }

      const updated = await tx.containerInspection.update({
        where: { id: inspection.id },
        data: {
          status: ContainerInspectionStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await this.containerEventService.record(tx, {
        containerVisitId: inspection.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.INSPECTION_STARTED,
        actorUserId: actor.id,
        referenceType: 'container_inspection',
        referenceId: inspection.id,
        metadataJson: {
          inspectionId: inspection.id,
          inspectionType: inspection.inspectionType,
        },
        note: `Bắt đầu thực hiện giám định: ${inspection.inspectionType}`,
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async completeInspection(
    inspectionId: string,
    dto: CompleteContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.result !== 'PASS' && !dto.notes?.trim()) {
      throw new BadRequestException('Cần ghi rõ lý do kết luận FAIL hoặc HOLD.');
    }
    const completed = await this.prisma.$transaction(async (tx) => {
      const identity = await tx.containerInspection.findFirst({
        where: { id: inspectionId, containerVisit: { icdId: actor.icdId } },
        select: { containerVisitId: true },
      });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND, message: 'Không tìm thấy yêu cầu giám định.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
      const inspection = await tx.containerInspection.findFirst({
        where: {
          id: inspectionId,
          containerVisit: { icdId: actor.icdId },
        },
      });

      if (!inspection) {
        throw new NotFoundException({
          code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND,
          message: 'Không tìm thấy yêu cầu giám định.',
        });
      }

      const validation = this.inspectionPolicy.validateCanCompleteInspection(inspection.status);
      if (!validation.valid) {
        throw new ConflictException({
          code: validation.errorCode,
          message: validation.message,
        });
      }

      const now = new Date();
      const updated = await tx.containerInspection.update({
        where: { id: inspection.id },
        data: {
          status: ContainerInspectionStatus.COMPLETED,
          result: dto.result,
          notes: dto.notes ?? inspection.notes,
          completedAt: now,
          completedById: actor.id,
          startedAt: inspection.startedAt ?? now,
        },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          completedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await this.containerEventService.record(tx, {
        containerVisitId: inspection.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.INSPECTION_COMPLETED,
        actorUserId: actor.id,
        referenceType: 'container_inspection',
        referenceId: inspection.id,
        metadataJson: {
          inspectionId: inspection.id,
          inspectionType: inspection.inspectionType,
          result: dto.result,
        },
        note: `Hoàn tất giám định ${inspection.inspectionType} với kết quả: ${dto.result}`,
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

    if (completed.result === ContainerInspectionResult.HOLD) {
      try {
        const recipients = await this.prisma.user.findMany({
          where: {
            icdId: actor.icdId,
            active: true,
            AND: [
              { roles: { some: { role: { code: ROLE_CODES.OPERATOR, active: true } } } },
              {
                roles: {
                  some: {
                    role: {
                      active: true,
                      permissions: {
                        some: {
                          permission: { code: PERMISSION_CODES.YARD_READ, active: true },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });
        if (recipients.length > 0) {
          const visit = await this.prisma.containerVisit.findFirst({
            where: { id: completed.containerVisitId, icdId: actor.icdId },
            select: { container: { select: { containerNumber: true } } },
          });
          if (!visit) throw new Error('Không tìm thấy container để tạo thông báo HOLD.');
          await Promise.all(recipients.map((recipient) =>
            this.notificationTriggerService.triggerInspectionHoldNotification({
              icdId: actor.icdId,
              inspectionId: completed.id,
              containerNo: visit.container.containerNumber,
              inspectorUserId: recipient.id,
              reason: completed.notes ?? undefined,
            }),
          ));
        }
      } catch (error: unknown) {
        this.logger.error(`Không tạo được thông báo HOLD cho giám định ${completed.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return completed;
  }

  async cancelInspection(
    inspectionId: string,
    dto: CancelContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.containerInspection.findFirst({
        where: { id: inspectionId, containerVisit: { icdId: actor.icdId } },
        select: { containerVisitId: true },
      });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND, message: 'Không tìm thấy yêu cầu giám định.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
      const inspection = await tx.containerInspection.findFirst({
        where: {
          id: inspectionId,
          containerVisit: { icdId: actor.icdId },
        },
      });

      if (!inspection) {
        throw new NotFoundException({
          code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND,
          message: 'Không tìm thấy yêu cầu giám định.',
        });
      }

      const validation = this.inspectionPolicy.validateCanCancelInspection(inspection.status);
      if (!validation.valid) {
        throw new ConflictException({
          code: validation.errorCode,
          message: validation.message,
        });
      }

      const cancelled = await tx.containerInspection.update({
        where: { id: inspection.id },
        data: {
          status: ContainerInspectionStatus.CANCELLED,
          notes: dto.reason
            ? `${inspection.notes ?? ''} [Hủy: ${dto.reason}]`.trim()
            : inspection.notes,
        },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await this.containerEventService.record(tx, {
        containerVisitId: inspection.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.INSPECTION_CANCELLED,
        actorUserId: actor.id,
        referenceType: 'container_inspection',
        referenceId: inspection.id,
        metadataJson: {
          inspectionId: inspection.id,
          reason: dto.reason,
        },
        note: `Đã hủy yêu cầu giám định ${inspection.inspectionType}. Lý do: ${dto.reason ?? 'Không có'}`,
      });

      return cancelled;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async findInspections(query: QueryContainerInspectionsDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContainerInspectionWhereInput = {
      containerVisit: {
        icdId: actor.icdId,
        ...(query.containerVisitId ? { id: query.containerVisitId } : {}),
      },
      ...(query.inspectionType ? { inspectionType: query.inspectionType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.result ? { result: query.result } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.containerInspection.count({ where }),
      this.prisma.containerInspection.findMany({
        where,
        skip,
        take: pageSize,
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
      meta: getPaginationMeta(page, pageSize, total),
    };
  }

  async getInspectionById(inspectionId: string, actor: AuthenticatedUser) {
    const inspection = await this.prisma.containerInspection.findFirst({
      where: {
        id: inspectionId,
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

    if (!inspection) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.INSPECTION_NOT_FOUND,
        message: 'Không tìm thấy yêu cầu giám định.',
      });
    }

    return inspection;
  }
}
