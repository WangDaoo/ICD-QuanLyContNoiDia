import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';
import { hashGatePassQrToken } from '../utils/gate-pass-qr-token.util';

@Injectable()
export class GatePassLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findTargetByQrTokenOrThrow(qrToken: string, icdId: string) {
    const qrTokenHash = hashGatePassQrToken(qrToken);

    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        qrTokenHash,
        containerVisit: {
          icdId,
        },
      },
      select: {
        id: true,
        containerVisitId: true,
      },
    });

    if (!gatePass) {
      throw new NotFoundException({
        code: GATE_PASS_ERROR_CODES.INVALID_QR_TOKEN,
        message: 'QR Gate Pass không hợp lệ.',
      });
    }

    return gatePass;
  }
}
