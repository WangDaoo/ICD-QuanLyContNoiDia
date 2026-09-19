import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContainerVisitStatus,
  PartnerApiClientStatus,
  Prisma,
} from '../../../generated/prisma/client';

export interface HandoverReviewResult {
  isReady: boolean;
  issues: string[];
}

@Injectable()
export class TransportHandoverReviewService {
  async checkWithTx(
    tx: Prisma.TransactionClient,
    handoverId: string,
    icdId: string,
  ): Promise<HandoverReviewResult> {
    const handover = await tx.transportHandover.findUnique({
      where: { id: handoverId },
      include: {
        containerVisit: {
          include: { container: true },
        },
        partnerApiClient: true,
        warehouse: true,
        confirmations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!handover || handover.containerVisit.icdId !== icdId) {
      throw new NotFoundException(
        `Không tìm thấy biên bản bàn giao với ID ${handoverId} thuộc ICD hiện tại.`,
      );
    }

    const issues: string[] = [];

    if (handover.containerVisit.status !== ContainerVisitStatus.EXITED) {
      issues.push(
        `Container visit phải ở trạng thái EXITED (hiện tại: ${handover.containerVisit.status}).`,
      );
    }

    if (
      !handover.partnerApiClient ||
      handover.partnerApiClient.status !== PartnerApiClientStatus.ACTIVE
    ) {
      issues.push('Đối tác tích hợp không còn ở trạng thái hoạt động (ACTIVE).');
    }

    if (!handover.warehouse || !handover.warehouse.active) {
      issues.push('Kho đích giao hàng không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    return {
      isReady: issues.length === 0,
      issues,
    };
  }

  async assertWithTx(
    tx: Prisma.TransactionClient,
    handoverId: string,
    icdId: string,
  ): Promise<void> {
    const result = await this.checkWithTx(tx, handoverId, icdId);
    if (!result.isReady) {
      throw new BadRequestException(
        `Biên bản bàn giao không đủ điều kiện xét duyệt: ${result.issues.join('; ')}`,
      );
    }
  }
}
