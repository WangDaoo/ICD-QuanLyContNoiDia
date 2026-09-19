import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  EdiAcknowledgementStatus,
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { AuditService } from '../../audit/audit.service';
import { EdiCorrelationService } from './edi-correlation.service';
import { EdiAlertService } from './edi-alert.service';
import { IngestEdiAckDto } from '../dto/ingest-edi-ack.dto';
import { QueryEdiAckDto } from '../dto/query-edi-ack.dto';
import { EDI_ERROR_CODES } from '../constants/edi-error-codes.constants';

@Injectable()
export class EdiAckService {
  private readonly logger = new Logger(EdiAckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationService: EdiCorrelationService,
    private readonly alertService: EdiAlertService,
    private readonly auditService: AuditService,
  ) {}

  async ingestAck(dto: IngestEdiAckDto, actor?: AuthenticatedUser) {
    const shippingLine = await this.prisma.shippingLine.findUnique({
      where: { id: dto.shippingLineId },
      include: {
        ediRoutes: {
          select: { icdId: true },
        },
      },
    });

    if (!shippingLine) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.SHIPPING_LINE_NOT_FOUND,
        message: `Hãng tàu ${dto.shippingLineId} không tồn tại.`,
      });
    }

    const dedupeKey =
      dto.dedupeKey ??
      crypto
        .createHash('sha256')
        .update(
          `${dto.shippingLineId}:${dto.ackType}:${dto.outboxMessageId ?? ''}:${dto.externalReference ?? ''}:${dto.idempotencyKey ?? ''}:${dto.rawPayload ?? ''}`,
        )
        .digest('hex');

    const existingAck = await this.prisma.ediAcknowledgement.findUnique({
      where: { dedupeKey },
    });

    if (existingAck) {
      throw new ConflictException({
        code: EDI_ERROR_CODES.EDI_ACK_ALREADY_EXISTS,
        message: `ACK đã tồn tại với dedupeKey ${dedupeKey}.`,
      });
    }

    // Correlate with outbox message
    const correlation = await this.correlationService.correlate(dto);

    let status = dto.status;
    let outboxMessageId: string | null = null;
    let icdId: string | null;

    if (correlation.matched && correlation.outboxMessage) {
      outboxMessageId = correlation.outboxMessage.id;
      icdId = correlation.outboxMessage.ediRoute.icdId;
    } else {
      // If correlation could not match an outbox message, mark as UNMATCHED unless explicitly ERROR
      if (status !== EdiAcknowledgementStatus.ERROR) {
        status = EdiAcknowledgementStatus.UNMATCHED;
      }
      icdId =
        actor?.icdId ??
        shippingLine.ediRoutes[0]?.icdId ??
        null;
    }

    const createdAck = await this.prisma.ediAcknowledgement.create({
      data: {
        shippingLineId: dto.shippingLineId,
        outboxMessageId,
        ackType: dto.ackType,
        status,
        externalReference: dto.externalReference ?? null,
        rawPayload: dto.rawPayload ?? null,
        parsedPayload: (dto.parsedPayload as unknown as Prisma.InputJsonValue) ?? null,
        dedupeKey,
      },
      include: {
        shippingLine: true,
        outboxMessage: true,
      },
    });

    // Materialize operational incident if status is not ACCEPTED
    if (
      status === EdiAcknowledgementStatus.REJECTED ||
      status === EdiAcknowledgementStatus.ERROR ||
      status === EdiAcknowledgementStatus.UNMATCHED
    ) {
      if (icdId) {
        let alertType: EdiAlertType;
        let severity: EdiAlertSeverity;
        let title: string;

        switch (status) {
          case EdiAcknowledgementStatus.REJECTED:
            alertType = EdiAlertType.ACK_REJECTED;
            severity = EdiAlertSeverity.ERROR;
            title = `EDI ACK Bị Từ Chối (REJECTED) - ${dto.ackType}`;
            break;
          case EdiAcknowledgementStatus.ERROR:
            alertType = EdiAlertType.ACK_ERROR;
            severity = EdiAlertSeverity.ERROR;
            title = `EDI ACK Lỗi Cú Pháp/Kỹ Thuật (ERROR) - ${dto.ackType}`;
            break;
          case EdiAcknowledgementStatus.UNMATCHED:
          default:
            alertType = EdiAlertType.ACK_UNMATCHED;
            severity = EdiAlertSeverity.WARNING;
            title = `EDI ACK Không Khớp Thông Điệp Gốc (UNMATCHED) - ${dto.ackType}`;
            break;
        }

        await this.alertService.createOrUpdateAlert({
          icdId,
          sourceType: EdiAlertSourceType.ACKNOWLEDGEMENT,
          sourceId: createdAck.id,
          alertType,
          severity,
          title,
          message: `Nhận được phản hồi ${dto.ackType} trạng thái ${status} từ hãng tàu ${shippingLine.name} (${shippingLine.scacCode}). Ref: ${dto.externalReference ?? 'N/A'}.`,
        });
      }
    }

    if (actor) {
      await this.auditService.record({
        icdId: actor.icdId,
        actorUserId: actor.id,
        action: 'INGEST',
        entityType: 'EDI_ACKNOWLEDGEMENT',
        entityId: createdAck.id,
        newData: {
          id: createdAck.id,
          status: createdAck.status,
          ackType: createdAck.ackType,
          outboxMessageId: createdAck.outboxMessageId,
        },
        reason: 'Ingest EDI acknowledgement',
      });
    }

    return createdAck;
  }

  async listAcks(actor: AuthenticatedUser, query: QueryEdiAckDto) {
    const where: Prisma.EdiAcknowledgementWhereInput = {
      OR: [
        {
          outboxMessage: {
            ediRoute: {
              icdId: actor.icdId,
            },
          },
        },
        {
          shippingLine: {
            ediRoutes: {
              some: {
                icdId: actor.icdId,
              },
            },
          },
        },
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.ackType ? { ackType: query.ackType } : {}),
      ...(query.shippingLineId ? { shippingLineId: query.shippingLineId } : {}),
      ...(query.outboxMessageId
        ? { outboxMessageId: query.outboxMessageId }
        : {}),
      ...(query.externalReference
        ? { externalReference: query.externalReference }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.ediAcknowledgement.count({ where }),
      this.prisma.ediAcknowledgement.findMany({
        where,
        include: {
          shippingLine: {
            select: {
              id: true,
              name: true,
              scacCode: true,
            },
          },
          outboxMessage: {
            select: {
              id: true,
              messageType: true,
              status: true,
              idempotencyKey: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          receivedAt: 'desc',
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

  async getAckById(id: string, actor: AuthenticatedUser) {
    const ack = await this.prisma.ediAcknowledgement.findFirst({
      where: {
        id,
        OR: [
          {
            outboxMessage: {
              ediRoute: {
                icdId: actor.icdId,
              },
            },
          },
          {
            shippingLine: {
              ediRoutes: {
                some: {
                  icdId: actor.icdId,
                },
              },
            },
          },
        ],
      },
      include: {
        shippingLine: true,
        outboxMessage: {
          include: {
            containerVisit: {
              include: {
                container: true,
              },
            },
          },
        },
      },
    });

    if (!ack) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_ACK_NOT_FOUND,
        message: `Phản hồi EDI ACK ${id} không tồn tại.`,
      });
    }

    return ack;
  }
}
