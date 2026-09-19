import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContainerInspectionStatus, Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { CancelContainerInspectionDto } from '../dto/cancel-container-inspection.dto';
import type { CompleteContainerInspectionDto } from '../dto/complete-container-inspection.dto';
import type { QueryContainerInspectionsDto } from '../dto/query-container-inspections.dto';
import type { RequestContainerInspectionDto } from '../dto/request-container-inspection.dto';
import { ContainerInspectionPolicy } from '../policies/container-inspection.policy';

@Injectable()
export class ContainerInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inspectionPolicy: ContainerInspectionPolicy,
    private readonly containerEventService: ContainerEventService,
  ) {}

  async requestInspection(
    visitId: string,
    dto: RequestContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
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

    const validation = this.inspectionPolicy.validateCanRequestInspection(visit.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const inspection = await this.prisma.containerInspection.create({
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

    await this.containerEventService.record(this.prisma, {
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
  }

  async startInspection(inspectionId: string, actor: AuthenticatedUser) {
    const inspection = await this.prisma.containerInspection.findFirst({
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

    const updated = await this.prisma.containerInspection.update({
      where: { id: inspection.id },
      data: {
        status: ContainerInspectionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(this.prisma, {
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
  }

  async completeInspection(
    inspectionId: string,
    dto: CompleteContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
    const inspection = await this.prisma.containerInspection.findFirst({
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
    const updated = await this.prisma.containerInspection.update({
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

    await this.containerEventService.record(this.prisma, {
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
  }

  async cancelInspection(
    inspectionId: string,
    dto: CancelContainerInspectionDto,
    actor: AuthenticatedUser,
  ) {
    const inspection = await this.prisma.containerInspection.findFirst({
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

    const cancelled = await this.prisma.containerInspection.update({
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

    await this.containerEventService.record(this.prisma, {
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
  }

  async findInspections(query: QueryContainerInspectionsDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

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
