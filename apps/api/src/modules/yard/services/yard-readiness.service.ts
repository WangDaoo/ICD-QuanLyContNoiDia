import { Injectable } from '@nestjs/common';
import {
  ContainerInspectionResult,
  ContainerInspectionStatus,
  InYardBookingStatus,
  Prisma,
  YardMovementStatus,
} from '../../../generated/prisma/client';

type YardReadinessDatabaseClient = Pick<
  Prisma.TransactionClient,
  'containerLocationLog' | 'yardMovement' | 'containerInspection' | 'inYardBooking'
>;

@Injectable()
export class YardReadinessService {
  async checkWithDb(db: YardReadinessDatabaseClient, containerVisitId: string) {
    const [currentLocation, movementCount, inspectionCount, bookingCount, inspectionHoldCount] =
      await Promise.all([
        db.containerLocationLog.findFirst({
          where: {
            containerVisitId,
            endedAt: null,
          },
          select: {
            id: true,
            yardSlotId: true,
          },
        }),

        db.yardMovement.count({
          where: {
            containerVisitId,
            status: {
              in: [YardMovementStatus.PENDING, YardMovementStatus.IN_PROGRESS],
            },
          },
        }),

        db.containerInspection.count({
          where: {
            containerVisitId,
            status: {
              in: [ContainerInspectionStatus.PENDING, ContainerInspectionStatus.IN_PROGRESS],
            },
          },
        }),

        db.inYardBooking.count({
          where: {
            containerVisitId,
            status: {
              in: [InYardBookingStatus.PENDING, InYardBookingStatus.IN_PROGRESS],
            },
          },
        }),

        db.containerInspection.count({
          where: {
            containerVisitId,
            status: ContainerInspectionStatus.COMPLETED,
            result: ContainerInspectionResult.HOLD,
          },
        }),
      ]);

    return {
      currentLocation,
      activeOperations: {
        movementCount,
        inspectionCount,
        bookingCount,
        hasActiveOperations: movementCount + inspectionCount + bookingCount > 0,
      },
      inspectionHoldCount,
    };
  }
}
