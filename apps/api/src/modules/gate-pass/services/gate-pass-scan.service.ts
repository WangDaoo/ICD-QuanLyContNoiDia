import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { ContainerVisitStatus, GatePassStatus } from '../../../generated/prisma/client';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';
import { GatePassReadinessService } from './gate-pass-readiness.service';
import { GatePassTokenService } from './gate-pass-token.service';

@Injectable()
export class GatePassScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: GatePassReadinessService,
    private readonly gatePassTokenService: GatePassTokenService,
  ) {}

  async scanGatePass(qrToken: string, actor: AuthenticatedUser) {
    const payload = this.gatePassTokenService.verify(qrToken);

    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: payload.gatePassId,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
      include: {
        containerVisit: {
          include: {
            container: true,
            houseBl: {
              include: {
                consignee: true,
              },
            },
          },
        },
      },
    });

    if (!gatePass) {
      throw new NotFoundException({
        code: GATE_PASS_ERROR_CODES.GATE_PASS_NOT_FOUND,
        message: 'Không tìm thấy Phiếu ra cổng.',
      });
    }

    const hash = this.gatePassTokenService.hash(qrToken);
    if (hash !== gatePass.qrTokenHash) {
      throw new ConflictException({
        code: 'GATE_PASS_TOKEN_INVALID',
        message: 'QR Phiếu ra cổng không hợp lệ.',
      });
    }

    const now = new Date();
    let currentStatus = gatePass.status;

    if (gatePass.status === GatePassStatus.ACTIVE && gatePass.expiresAt <= now) {
      currentStatus = GatePassStatus.EXPIRED;
      await this.prisma.gatePass.updateMany({
        where: {
          id: gatePass.id,
          status: GatePassStatus.ACTIVE,
        },
        data: {
          status: GatePassStatus.EXPIRED,
        },
      });
    }

    const readiness = await this.readinessService.evaluateReadiness(
      gatePass.containerVisitId,
      actor,
      'GATE_OUT',
    );

    const visit = gatePass.containerVisit;
    const canGateOut =
      currentStatus === GatePassStatus.ACTIVE &&
      readiness.ready &&
      visit.status === ContainerVisitStatus.GATE_PASS_ISSUED;

    return {
      gatePass: {
        id: gatePass.id,
        code: gatePass.code,
        status: currentStatus,
        issuedAt: gatePass.issuedAt,
        expiresAt: gatePass.expiresAt,
        usedAt: gatePass.usedAt,
        vehiclePlate: gatePass.vehiclePlate,
        receiverName: gatePass.receiverName,
        receiverIdNumber: gatePass.receiverIdNumber,
      },
      container: {
        id: visit.container.id,
        containerNumber: visit.container.containerNumber,
        isoCode: visit.container.isoCode,
        size: visit.container.size,
        type: visit.container.type,
        sealNumber: visit.sealNumber,
        status: visit.status,
        currentLocation: visit.currentLocation,
      },
      consignee: visit.houseBl?.consignee
        ? {
            id: visit.houseBl.consignee.id,
            name: visit.houseBl.consignee.name,
            taxCode: visit.houseBl.consignee.taxCode,
          }
        : null,
      readiness: {
        ready: readiness.ready,
        blockers: readiness.blockers,
        details: readiness.details,
      },
      canGateOut,
    };
  }
}
