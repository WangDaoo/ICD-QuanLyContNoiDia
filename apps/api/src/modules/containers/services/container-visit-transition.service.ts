import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ContainerVisitStatus, ManifestStatus, Prisma } from '../../../generated/prisma/client';

import { CONTAINER_ERROR_CODES } from '../constants/container-error-codes.constants';
import { CONTAINER_EVENT_TYPES } from '../constants/container-event-types.constants';
import { ContainerStatePolicy } from '../policies/container-state.policy';
import { ContainerEventService } from './container-event.service';

export interface MovementOrderContainerContext {
  id: string;
  state: ContainerVisitStatus;
  manifestId: string | null;
  manifestStatus: ManifestStatus | null;
  containerNumber: string;
}

export interface GateInContainerContext {
  id: string;
  state: ContainerVisitStatus;
  containerNumber: string;
  expectedSeal: string | null;
}

@Injectable()
export class ContainerVisitTransitionService {
  constructor(
    private readonly statePolicy: ContainerStatePolicy,
    private readonly eventService: ContainerEventService,
  ) {}

  /**
   * Lock Container Visit trước các thao tác Movement Order.
   *
   * Mục tiêu:
   * - Serialize các command cạnh tranh.
   * - Không để hai Movement Order active được tạo đồng thời.
   */
  async lockForMovementOrder(
    tx: Prisma.TransactionClient,
    visitId: string,
    icdId: string,
  ): Promise<MovementOrderContainerContext> {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT id
        FROM container_visit
        WHERE id = ${visitId}
          AND icd_id = ${icdId}
        FOR UPDATE
      `,
    );

    const visit = await tx.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId,
      },
      select: {
        id: true,
        status: true,
        houseBl: {
          select: {
            masterBl: {
              select: {
                manifest: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        container: {
          select: {
            containerNumber: true,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    const manifest = visit.houseBl?.masterBl?.manifest ?? null;

    return {
      id: visit.id,
      state: visit.status,
      manifestId: manifest?.id ?? null,
      manifestStatus: manifest?.status ?? null,
      containerNumber: visit.container.containerNumber,
    };
  }

  /**
   * Lock row Container Visit cho Gate-in.
   *
   * Mục tiêu:
   * - chống hai Gate-in request chạy đồng thời;
   * - serialize state transition AUTHORIZED → IN_YARD;
   * - bảo vệ UNIQUE reception ở tầng business.
   */
  async lockForGateIn(
    tx: Prisma.TransactionClient,
    visitId: string,
    icdId: string,
  ): Promise<GateInContainerContext> {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT id
        FROM container_visit
        WHERE id = ${visitId}
          AND icd_id = ${icdId}
        FOR UPDATE
      `,
    );

    const visit = await tx.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId,
      },
      select: {
        id: true,
        status: true,
        sealNumber: true,
        container: {
          select: {
            containerNumber: true,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    this.statePolicy.assertCanGateIn(visit.status);

    return {
      id: visit.id,
      state: visit.status,
      containerNumber: visit.container.containerNumber,
      expectedSeal: visit.sealNumber,
    };
  }

  /**
   * Module Containers sở hữu state của Container Visit.
   *
   * Movement Order không được tự update container_visit bằng Prisma.
   */
  async authorizeByMovementOrder(
    tx: Prisma.TransactionClient,
    input: {
      visitId: string;
      icdId: string;
      movementOrderId: string;
      actorUserId: string;
    },
  ): Promise<void> {
    const visit = await tx.containerVisit.findFirst({
      where: {
        id: input.visitId,
        icdId: input.icdId,
      },
      select: {
        status: true,
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    this.statePolicy.assertCanAuthorizeMovement(visit.status);

    const updateResult = await tx.containerVisit.updateMany({
      where: {
        id: input.visitId,
        icdId: input.icdId,
        status: ContainerVisitStatus.PENDING,
      },
      data: {
        status: ContainerVisitStatus.AUTHORIZED,
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException({
        code: CONTAINER_ERROR_CODES.INVALID_STATE,
        message: 'Container Visit đã thay đổi trạng thái. Vui lòng tải lại dữ liệu.',
      });
    }

    await this.eventService.record(tx, {
      containerVisitId: input.visitId,
      eventType: CONTAINER_EVENT_TYPES.MOVEMENT_AUTHORIZED,
      fromStatus: ContainerVisitStatus.PENDING,
      toStatus: ContainerVisitStatus.AUTHORIZED,
      actorUserId: input.actorUserId,
      referenceType: 'movement_order',
      referenceId: input.movementOrderId,
      note: 'Container visit authorized via Movement Order',
    });
  }

  /**
   * Re-check state ngay tại write và chuyển state sang IN_YARD.
   */
  async markInYardByGateIn(
    tx: Prisma.TransactionClient,
    input: {
      visitId: string;
      icdId: string;
      receptionId: string;
      truckVisitId: string;
      gateInAt: Date;
      actorUserId: string;
      actualSeal: string;
      actualWeight?: number;
      conditionCode?: string;
      sealComparison: 'MATCH' | 'MISMATCH' | 'NO_REFERENCE';
    },
  ): Promise<void> {
    const result = await tx.containerVisit.updateMany({
      where: {
        id: input.visitId,
        icdId: input.icdId,
        status: ContainerVisitStatus.AUTHORIZED,
        gateInAt: null,
      },
      data: {
        status: ContainerVisitStatus.IN_YARD,
        gateInAt: input.gateInAt,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: CONTAINER_ERROR_CODES.INVALID_STATE,
        message: 'Container Visit đã thay đổi trạng thái. Không thể Gate-in.',
      });
    }

    await this.eventService.record(tx, {
      containerVisitId: input.visitId,
      eventType: CONTAINER_EVENT_TYPES.GATE_IN,
      fromStatus: ContainerVisitStatus.AUTHORIZED,
      toStatus: ContainerVisitStatus.IN_YARD,
      actorUserId: input.actorUserId,
      referenceType: 'container_reception',
      referenceId: input.receptionId,
      metadataJson: {
        truckVisitId: input.truckVisitId,
        gateInAt: input.gateInAt.toISOString(),
        actualSeal: input.actualSeal,
        actualWeight: input.actualWeight ?? null,
        conditionCode: input.conditionCode ?? null,
        sealComparison: input.sealComparison,
      },
    });
  }

  /**
   * Chuyển Container Visit sang GATE_PASS_ISSUED.
   */
  async issueGatePass(
    tx: Prisma.TransactionClient,
    input: {
      visitId: string;
      icdId: string;
    },
  ): Promise<void> {
    const result = await tx.containerVisit.updateMany({
      where: {
        id: input.visitId,
        icdId: input.icdId,
        status: ContainerVisitStatus.IN_YARD,
      },
      data: {
        status: ContainerVisitStatus.GATE_PASS_ISSUED,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: CONTAINER_ERROR_CODES.INVALID_STATE,
        message: 'Container Visit không còn ở trạng thái IN_YARD.',
      });
    }
  }

  /**
   * Restore Container Visit trở lại IN_YARD khi Gate Pass bị đóng / hủy / hết hạn.
   */
  async restoreInYardAfterGatePassClosed(
    tx: Prisma.TransactionClient,
    input: {
      visitId: string;
      icdId: string;
    },
  ): Promise<void> {
    const result = await tx.containerVisit.updateMany({
      where: {
        id: input.visitId,
        icdId: input.icdId,
        status: ContainerVisitStatus.GATE_PASS_ISSUED,
      },
      data: {
        status: ContainerVisitStatus.IN_YARD,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: CONTAINER_ERROR_CODES.INVALID_STATE,
        message: 'Không thể đưa Container Visit trở lại IN_YARD.',
      });
    }
  }
}
