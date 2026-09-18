import { Injectable, NotFoundException } from '@nestjs/common';

import {
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
