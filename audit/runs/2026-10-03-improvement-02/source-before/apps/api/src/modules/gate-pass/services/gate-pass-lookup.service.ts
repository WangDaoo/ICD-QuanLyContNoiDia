import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';
import { GatePassTokenService } from './gate-pass-token.service';

@Injectable()
export class GatePassLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gatePassTokenService: GatePassTokenService,
  ) {}

  async findTargetByQrTokenOrThrow(qrToken: string, icdId: string) {
    const payload = this.gatePassTokenService.verify(qrToken);

    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: payload.gatePassId,
        containerVisit: {
          icdId,
        },
      },
      select: {
        id: true,
        containerVisitId: true,
        qrTokenHash: true,
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

    return {
      id: gatePass.id,
      containerVisitId: gatePass.containerVisitId,
    };
  }
}
