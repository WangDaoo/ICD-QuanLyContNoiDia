import { Injectable } from '@nestjs/common';
import {
  ContainerInspectionResult,
  ContainerInspectionStatus,
  InYardBookingStatus,
  YardMovementStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class YardOperationReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSummary(visitId: string) {
    const [activeMovements, activeInspections, holdInspections, activeBookings] =
      await Promise.all([
        this.prisma.yardMovement.findMany({
          where: {
            containerVisitId: visitId,
            status: {
              in: [YardMovementStatus.PENDING, YardMovementStatus.IN_PROGRESS],
            },
          },
          include: {
            fromSlot: { include: { yardBlock: true } },
            toSlot: { include: { yardBlock: true } },
          },
        }),
        this.prisma.containerInspection.findMany({
          where: {
            containerVisitId: visitId,
            status: {
              in: [
                ContainerInspectionStatus.PENDING,
                ContainerInspectionStatus.IN_PROGRESS,
              ],
            },
          },
        }),
        this.prisma.containerInspection.findMany({
          where: {
            containerVisitId: visitId,
            status: ContainerInspectionStatus.COMPLETED,
            result: ContainerInspectionResult.HOLD,
          },
        }),
        this.prisma.inYardBooking.findMany({
          where: {
            containerVisitId: visitId,
            status: {
              in: [
                InYardBookingStatus.PENDING,
                InYardBookingStatus.IN_PROGRESS,
              ],
            },
          },
        }),
      ]);

    const hasActiveOperations =
      activeMovements.length > 0 ||
      activeInspections.length > 0 ||
      activeBookings.length > 0;

    const hasHoldInspection = holdInspections.length > 0;

    return {
      hasActiveOperations,
      hasHoldInspection,
      activeMovements,
      activeInspections,
      holdInspections,
      activeBookings,
    };
  }
}
