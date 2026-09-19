import { Injectable } from '@nestjs/common';
import { OperationalHoldStatus, Prisma } from '../../../generated/prisma/client';

type OperationalHoldDatabaseClient = Pick<Prisma.TransactionClient, 'operationalHold'>;

@Injectable()
export class OperationalHoldReadService {
  async findActiveWithDb(db: OperationalHoldDatabaseClient, containerVisitId: string) {
    return db.operationalHold.findMany({
      where: {
        containerVisitId,
        status: OperationalHoldStatus.ACTIVE,
      },
      select: {
        id: true,
        holdType: true,
        reason: true,
        placedAt: true,
      },
      orderBy: {
        placedAt: 'asc',
      },
    });
  }
}
