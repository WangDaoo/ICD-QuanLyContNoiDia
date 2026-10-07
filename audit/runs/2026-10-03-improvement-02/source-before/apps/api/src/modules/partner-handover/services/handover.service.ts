import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  PartnerApiClientStatus,
  TransportConfirmationType,
  TransportHandoverStatus,
} from '../../../generated/prisma/client';
import { CreateTransportHandoverDto } from '../dto/create-transport-handover.dto';
import { DisputeHandoverDto } from '../dto/handover/dispute-handover.dto';
import { IcdConfirmHandoverDto } from '../dto/handover/icd-confirm-handover.dto';
import { TransportHandoverStatePolicy } from '../policies/handover-state.policy';
import { TransportHandoverReviewService } from './transport-handover-review.service';

@Injectable()
export class HandoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly reviewService: TransportHandoverReviewService,
  ) {}


  async create(
    dto: CreateTransportHandoverDto,
    actorId: string,
    icdId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const containerVisit = await tx.containerVisit.findFirst({
        where: { id: dto.containerVisitId, icdId },
        include: { container: true },
      });

      if (!containerVisit) {
        throw new NotFoundException(
          `Không tìm thấy Container Visit với ID ${dto.containerVisitId} thuộc ICD hiện tại.`,
        );
      }

      if (containerVisit.state !== ContainerVisitStatus.EXITED) {
        throw new BadRequestException(
          `Chỉ được tạo biên bản bàn giao cho container đã ra khỏi cảng (EXITED). Trạng thái hiện tại: ${containerVisit.state}.`,
        );
      }

      const activeHandover = await tx.transportHandover.findFirst({
        where: {
          containerVisitId: dto.containerVisitId,
          status: {
            notIn: [
              TransportHandoverStatus.COMPLETED,
              TransportHandoverStatus.CANCELLED,
            ],
          },
        },
      });

      if (activeHandover) {
        throw new ConflictException(
          `Container Visit ${dto.containerVisitId} đã có một biên bản bàn giao đang hoạt động (Mã: ${activeHandover.transportCode}, Trạng thái: ${activeHandover.status}).`,
        );
      }

      const partnerClient = await tx.partnerApiClient.findUnique({
        where: { id: dto.partnerApiClientId },
      });

      if (!partnerClient) {
        throw new NotFoundException(
          `Không tìm thấy đối tác tích hợp (Partner Client) với ID ${dto.partnerApiClientId}.`,
        );
      }

      if (partnerClient.status !== PartnerApiClientStatus.ACTIVE) {
        throw new BadRequestException(
          `Đối tác ${partnerClient.partnerName} (${partnerClient.partnerCode}) đã bị vô hiệu hóa hoặc không khả dụng.`,
        );
      }

      const warehouse = await tx.customerWarehouse.findFirst({
        where: { id: dto.warehouseId, icdId, active: true },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Không tìm thấy kho khách hàng hợp lệ với ID ${dto.warehouseId}.`,
        );
      }

      const handover = await tx.transportHandover.create({
        data: {
          containerVisitId: dto.containerVisitId,
          partnerApiClientId: dto.partnerApiClientId,
          warehouseId: dto.warehouseId,
          transportCode: dto.transportCode,
          status: TransportHandoverStatus.DRAFT,
          expectedDeliveryAt: dto.expectedDeliveryAt
            ? new Date(dto.expectedDeliveryAt)
            : null,
          createdById: actorId,
        },
        include: {
          containerVisit: {
            include: { container: true },
          },
          partnerApiClient: {
            select: {
              id: true,
              partnerCode: true,
              partnerName: true,
              keyLast4: true,
              status: true,
            },
          },
          warehouse: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return handover;
    });
  }

  async publish(id: string, _actorId: string, icdId: string) {
    return this.prisma.$transaction(async (tx) => {
      const handover = await tx.transportHandover.findUnique({
        where: { id },
        include: {
          containerVisit: true,
        },
      });

      if (!handover || handover.containerVisit.icdId !== icdId) {
        throw new NotFoundException(
          `Không tìm thấy biên bản bàn giao với ID ${id}.`,
        );
      }

      TransportHandoverStatePolicy.assertTransition(
        handover.status,
        TransportHandoverStatus.READY_FOR_HANDOVER,
      );

      const updated = await tx.transportHandover.update({
        where: { id },
        data: {
          status: TransportHandoverStatus.READY_FOR_HANDOVER,
          readyAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          containerVisit: {
            include: { container: true },
          },
          partnerApiClient: {
            select: {
              id: true,
              partnerCode: true,
              partnerName: true,
              keyLast4: true,
              status: true,
            },
          },
          warehouse: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return updated;
    });
  }

  async icdConfirm(
    id: string,
    dto: IcdConfirmHandoverDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id, status, version FROM transport_handover WHERE id = ? FOR UPDATE`,
        id,
      );

      const handover = await tx.transportHandover.findUnique({
        where: { id },
        include: {
          containerVisit: true,
        },
      });

      if (!handover || handover.containerVisit.icdId !== actor.icdId) {
        throw new NotFoundException(
          `Không tìm thấy biên bản bàn giao với ID ${id} thuộc ICD hiện tại.`,
        );
      }

      TransportHandoverStatePolicy.assertIcdConfirmable(handover.status);
      await this.reviewService.assertWithTx(tx, id, actor.icdId);

      const now = new Date();

      const updated = await tx.transportHandover.update({
        where: { id },
        data: {
          status: TransportHandoverStatus.COMPLETED,
          icdConfirmedAt: now,
          icdConfirmedById: actor.id,
          completedAt: now,
          version: { increment: 1 },
        },
        include: {
          containerVisit: {
            include: { container: true },
          },
          partnerApiClient: {
            select: {
              id: true,
              partnerCode: true,
              partnerName: true,
              keyLast4: true,
              status: true,
            },
          },
          warehouse: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
          icdConfirmedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.transportConfirmation.create({
        data: {
          transportHandoverId: id,
          confirmationType: TransportConfirmationType.ICD_CONFIRMED,
          confirmedAt: now,
          createdByUserId: actor.id,
          note: dto.note ?? null,
        },
      });

      await this.auditService.record(
        {
          icdId: actor.icdId,
          actorUserId: actor.id,
          action: 'TRANSPORT_HANDOVER_ICD_CONFIRMED',
          entityType: 'TRANSPORT_HANDOVER',
          entityId: id,
          oldData: {
            status: handover.status,
            version: handover.version,
          },
          newData: {
            status: updated.status,
            version: updated.version,
            icdConfirmedAt: updated.icdConfirmedAt,
            completedAt: updated.completedAt,
          },
          reason: dto.note ?? null,
        },
        tx,
      );

      return updated;
    });
  }

  async dispute(
    id: string,
    dto: DisputeHandoverDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id, status, version FROM transport_handover WHERE id = ? FOR UPDATE`,
        id,
      );

      const handover = await tx.transportHandover.findUnique({
        where: { id },
        include: {
          containerVisit: true,
        },
      });

      if (!handover || handover.containerVisit.icdId !== actor.icdId) {
        throw new NotFoundException(
          `Không tìm thấy biên bản bàn giao với ID ${id} thuộc ICD hiện tại.`,
        );
      }

      TransportHandoverStatePolicy.assertDisputable(handover.status);

      const now = new Date();

      const updated = await tx.transportHandover.update({
        where: { id },
        data: {
          status: TransportHandoverStatus.DISPUTED,
          version: { increment: 1 },
        },
        include: {
          containerVisit: {
            include: { container: true },
          },
          partnerApiClient: {
            select: {
              id: true,
              partnerCode: true,
              partnerName: true,
              keyLast4: true,
              status: true,
            },
          },
          warehouse: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
          icdConfirmedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.transportConfirmation.create({
        data: {
          transportHandoverId: id,
          confirmationType: TransportConfirmationType.DISPUTE,
          confirmedAt: now,
          createdByUserId: actor.id,
          condition: dto.reasonCode,
          note: dto.note,
          proofImageUrl: dto.attachmentUrl ?? null,
        },
      });

      await this.auditService.record(
        {
          icdId: actor.icdId,
          actorUserId: actor.id,
          action: 'TRANSPORT_HANDOVER_DISPUTED',
          entityType: 'TRANSPORT_HANDOVER',
          entityId: id,
          oldData: {
            status: handover.status,
            version: handover.version,
          },
          newData: {
            status: updated.status,
            version: updated.version,
          },
          reason: `${dto.reasonCode}: ${dto.note}`,
        },
        tx,
      );

      return updated;
    });
  }
}
