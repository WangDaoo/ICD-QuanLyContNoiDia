import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EdiMessageType,
  EdiOutboxStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { AuditService } from '../../audit/audit.service';
import { EdiCodecoSnapshotService } from './edi-codeco-snapshot.service';
import { QueryEdiOutboxDto } from '../dto/query-edi-outbox.dto';
import { EDI_ERROR_CODES } from '../constants/edi-error-codes.constants';

@Injectable()
export class EdiOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly snapshotService: EdiCodecoSnapshotService,
    private readonly auditService: AuditService,
  ) {}

  async enqueueCodecoGateIn(
    containerVisitId: string,
    icdId: string,
    tx: Prisma.TransactionClient,
  ) {
    const snapshot = await this.snapshotService.buildSnapshot(
      containerVisitId,
      'CODECO_GATE_IN',
      tx,
    );

    if (!snapshot) {
      return null;
    }

    const idempotencyKey = `CODECO_GATE_IN:${containerVisitId}`;
    const requestId = this.requestContext.getRequestId();

    return tx.ediOutboxMessage.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        ediRouteId: snapshot.routingSnapshot.routeId,
        shippingLineId: snapshot.shippingLineId,
        containerVisitId,
        messageType: EdiMessageType.CODECO_GATE_IN,
        status: EdiOutboxStatus.PENDING,
        idempotencyKey,
        requestId: requestId ?? null,
        payloadSnapshot: snapshot.payloadSnapshot as unknown as Prisma.InputJsonValue,
        routingSnapshot: snapshot.routingSnapshot as unknown as Prisma.InputJsonValue,
        retryCount: 0,
        nextRetryAt: new Date(),
      },
    });
  }

  async enqueueCodecoGateOut(
    containerVisitId: string,
    icdId: string,
    tx: Prisma.TransactionClient,
  ) {
    const snapshot = await this.snapshotService.buildSnapshot(
      containerVisitId,
      'CODECO_GATE_OUT',
      tx,
    );

    if (!snapshot) {
      return null;
    }

    const idempotencyKey = `CODECO_GATE_OUT:${containerVisitId}`;
    const requestId = this.requestContext.getRequestId();

    return tx.ediOutboxMessage.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        ediRouteId: snapshot.routingSnapshot.routeId,
        shippingLineId: snapshot.shippingLineId,
        containerVisitId,
        messageType: EdiMessageType.CODECO_GATE_OUT,
        status: EdiOutboxStatus.PENDING,
        idempotencyKey,
        requestId: requestId ?? null,
        payloadSnapshot: snapshot.payloadSnapshot as unknown as Prisma.InputJsonValue,
        routingSnapshot: snapshot.routingSnapshot as unknown as Prisma.InputJsonValue,
        retryCount: 0,
        nextRetryAt: new Date(),
      },
    });
  }

  async listOutbox(actor: AuthenticatedUser, query: QueryEdiOutboxDto) {
    const where: Prisma.EdiOutboxMessageWhereInput = {
      ediRoute: {
        icdId: actor.icdId,
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.messageType ? { messageType: query.messageType } : {}),
      ...(query.shippingLineId ? { shippingLineId: query.shippingLineId } : {}),
      ...(query.containerVisitId
        ? { containerVisitId: query.containerVisitId }
        : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.ediOutboxMessage.count({ where }),
      this.prisma.ediOutboxMessage.findMany({
        where,
        include: {
          shippingLine: {
            select: {
              id: true,
              name: true,
              scacCode: true,
            },
          },
          containerVisit: {
            select: {
              id: true,
              status: true,
              container: {
                select: {
                  containerNumber: true,
                  size: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      items,
    };
  }

  async getOutboxById(id: string, actor: AuthenticatedUser) {
    const message = await this.prisma.ediOutboxMessage.findFirst({
      where: {
        id,
        ediRoute: {
          icdId: actor.icdId,
        },
      },
      include: {
        shippingLine: true,
        containerVisit: {
          include: {
            container: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_OUTBOX_NOT_FOUND,
        message: `Thông điệp EDI ${id} không tồn tại.`,
      });
    }

    return message;
  }

  async retryOutbox(id: string, actor: AuthenticatedUser) {
    const message = await this.prisma.ediOutboxMessage.findFirst({
      where: {
        id,
        ediRoute: {
          icdId: actor.icdId,
        },
      },
    });

    if (!message) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_OUTBOX_NOT_FOUND,
        message: `Thông điệp EDI ${id} không tồn tại.`,
      });
    }

    if (
      message.status !== EdiOutboxStatus.FAILED &&
      message.status !== EdiOutboxStatus.DEAD
    ) {
      throw new BadRequestException({
        code: EDI_ERROR_CODES.EDI_OUTBOX_INVALID_STATE,
        message: `Chỉ có thể retry thông điệp ở trạng thái FAILED hoặc DEAD (hiện tại: ${message.status}).`,
      });
    }

    const updated = await this.prisma.ediOutboxMessage.update({
      where: { id: message.id },
      data: {
        status: EdiOutboxStatus.PENDING,
        nextRetryAt: new Date(),
      },
    });

    await this.auditService.record({
      icdId: actor.icdId,
      actorUserId: actor.id,
      action: 'RETRY',
      entityType: 'EDI_OUTBOX_MESSAGE',
      entityId: message.id,
      oldData: { status: message.status },
      newData: { status: updated.status },
      reason: 'Manual EDI retry request',
    });

    return updated;
  }
}
