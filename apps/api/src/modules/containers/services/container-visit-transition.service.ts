import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ContainerVisitStatus,
  ManifestStatus,
  Prisma,
} from '../../../generated/prisma/client';

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
        message:
          'Container Visit đã thay đổi trạng thái. Vui lòng tải lại dữ liệu.',
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
}
