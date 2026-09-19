import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GatePassStatus, Prisma } from '../../../generated/prisma/client';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';

@Injectable()
export class GatePassTransitionService {
  async lockAndGetOrThrow(
    tx: Prisma.TransactionClient,
    gatePassId: string,
    containerVisitId: string,
    icdId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT gp.id
        FROM gate_pass gp
        INNER JOIN container_visit cv
          ON cv.id = gp.container_visit_id
        WHERE gp.id = ${gatePassId}
          AND gp.container_visit_id = ${containerVisitId}
          AND cv.icd_id = ${icdId}
        FOR UPDATE
      `,
    );

    const gatePass = await tx.gatePass.findFirst({
      where: {
        id: gatePassId,
        containerVisitId,
        containerVisit: {
          icdId,
        },
      },
      select: {
        id: true,
        code: true,
        containerVisitId: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        usedAt: true,
        vehiclePlate: true,
        receiverName: true,
        receiverIdNumber: true,
      },
    });

    if (!gatePass) {
      throw new NotFoundException({
        code: GATE_PASS_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy Gate Pass.',
      });
    }

    return gatePass;
  }

  async markUsed(
    tx: Prisma.TransactionClient,
    gatePassId: string,
    usedAt: Date,
  ): Promise<void> {
    const result = await tx.gatePass.updateMany({
      where: {
        id: gatePassId,
        status: GatePassStatus.ACTIVE,
        usedAt: null,
        expiresAt: {
          gt: usedAt,
        },
      },
      data: {
        status: GatePassStatus.USED,
        usedAt,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: GATE_PASS_ERROR_CODES.INVALID_STATE,
        message: 'Gate Pass không còn hợp lệ để Gate-out.',
      });
    }
  }

  async markExpired(
    tx: Prisma.TransactionClient,
    gatePassId: string,
  ): Promise<void> {
    const result = await tx.gatePass.updateMany({
      where: {
        id: gatePassId,
        status: GatePassStatus.ACTIVE,
      },
      data: {
        status: GatePassStatus.EXPIRED,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException({
        code: GATE_PASS_ERROR_CODES.INVALID_STATE,
        message: 'Gate Pass đã thay đổi trạng thái.',
      });
    }
  }
}
