import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ContainerVisitStatus,
  Prisma,
  TruckVisit,
  TruckVisitStatus,
} from '../../../generated/prisma/client';
import { TRUCK_VISIT_ERROR_CODES } from '../constants/truck-visit-error-codes.constants';
import { TruckVisitStatePolicy } from '../policies/truck-visit-state.policy';

@Injectable()
export class TruckVisitTransitionService {
  constructor(private readonly statePolicy: TruckVisitStatePolicy) {}

  async lockTruckVisit(
    tx: Prisma.TransactionClient,
    truckVisitId: string,
    icdId?: string,
  ): Promise<TruckVisit> {
    const rows = await tx.$queryRaw<TruckVisit[]>`
      SELECT * FROM \`truck_visit\`
      WHERE \`id\` = ${truckVisitId}
      ${icdId ? Prisma.sql`AND \`icd_id\` = ${icdId}` : Prisma.empty}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new NotFoundException({
        code: TRUCK_VISIT_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy chuyến xe (Truck Visit).',
      });
    }

    return rows[0]!;
  }

  async getGateInContextOrThrow(
    tx: Prisma.TransactionClient,
    truckVisitId: string,
    containerVisitId: string,
    icdId?: string,
  ): Promise<{
    id: string;
    status: TruckVisitStatus;
    vehiclePlate: string;
    totalContainers: number;
  }> {
    const visit = await this.lockTruckVisit(tx, truckVisitId, icdId);

    if (
      visit.status !== TruckVisitStatus.ARRIVED &&
      visit.status !== TruckVisitStatus.IN_PROGRESS
    ) {
      throw new ConflictException({
        code: TRUCK_VISIT_ERROR_CODES.INVALID_STATE,
        message: `Chuyến xe phải ở trạng thái ARRIVED hoặc IN_PROGRESS để thực hiện tiếp nhận container (hiện tại: ${visit.status}).`,
      });
    }

    const link = await tx.truckVisitContainer.findUnique({
      where: {
        truckVisitId_containerVisitId: {
          truckVisitId,
          containerVisitId,
        },
      },
    });

    if (!link) {
      throw new ConflictException({
        code: TRUCK_VISIT_ERROR_CODES.INVALID_CONTAINER_VISIT,
        message: 'Container Visit không thuộc chuyến xe (Truck Visit) này.',
      });
    }

    const totalContainers = await tx.truckVisitContainer.count({
      where: { truckVisitId },
    });

    return {
      id: visit.id,
      status: visit.status,
      vehiclePlate: visit.vehiclePlate,
      totalContainers,
    };
  }

  async markInProgress(
    tx: Prisma.TransactionClient,
    truckVisitId: string,
    _actorUserId?: string,
  ): Promise<TruckVisit> {
    const visit = await tx.truckVisit.findUnique({
      where: { id: truckVisitId },
    });

    if (!visit) {
      throw new NotFoundException({
        code: TRUCK_VISIT_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy chuyến xe.',
      });
    }

    if (visit.status === TruckVisitStatus.ARRIVED) {
      return tx.truckVisit.update({
        where: { id: truckVisitId },
        data: {
          status: TruckVisitStatus.IN_PROGRESS,
        },
      });
    }

    return visit;
  }

  async completeIfAllContainersGateIn(
    tx: Prisma.TransactionClient,
    truckVisitId: string,
    _actorUserId?: string,
  ): Promise<TruckVisit | null> {
    const links = await tx.truckVisitContainer.findMany({
      where: { truckVisitId },
      include: {
        containerVisit: {
          select: {
            status: true,
          },
        },
      },
    });

    if (links.length === 0) {
      return null;
    }

    const allInYard = links.every(
      (l) => l.containerVisit.status === ContainerVisitStatus.IN_YARD,
    );

    if (allInYard) {
      return tx.truckVisit.update({
        where: { id: truckVisitId },
        data: {
          status: TruckVisitStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return null;
  }

  async startInProgress(
    tx: Prisma.TransactionClient,
    params: {
      truckVisitId: string;
      icdId?: string;
      actorUserId?: string;
    },
  ): Promise<TruckVisit> {
    const visit = await this.lockTruckVisit(
      tx,
      params.truckVisitId,
      params.icdId,
    );
    this.statePolicy.assertCanStartInProgress(visit.status);

    return tx.truckVisit.update({
      where: { id: params.truckVisitId },
      data: {
        status: TruckVisitStatus.IN_PROGRESS,
      },
    });
  }

  async complete(
    tx: Prisma.TransactionClient,
    params: {
      truckVisitId: string;
      icdId?: string;
      actorUserId?: string;
    },
  ): Promise<TruckVisit> {
    const visit = await this.lockTruckVisit(
      tx,
      params.truckVisitId,
      params.icdId,
    );
    this.statePolicy.assertCanComplete(visit.status);

    return tx.truckVisit.update({
      where: { id: params.truckVisitId },
      data: {
        status: TruckVisitStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }
}
