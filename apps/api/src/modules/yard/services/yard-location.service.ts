import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class YardLocationService {
  async findCurrentForVisit(
    tx: Prisma.TransactionClient,
    containerVisitId: string,
  ) {
    return tx.containerLocationLog.findFirst({
      where: {
        containerVisitId,
        endedAt: null,
      },
      include: {
        yardSlot: {
          include: {
            yardBlock: true,
          },
        },
      },
    });
  }

  /**
   * Batch Yard Movement/Gate-out dùng method này.
   */
  async closeCurrentLocation(
    tx: Prisma.TransactionClient,
    containerVisitId: string,
    endedAt: Date,
  ): Promise<number> {
    const result = await tx.containerLocationLog.updateMany({
      where: {
        containerVisitId,
        endedAt: null,
      },
      data: {
        endedAt,
      },
    });

    return result.count;
  }
}
