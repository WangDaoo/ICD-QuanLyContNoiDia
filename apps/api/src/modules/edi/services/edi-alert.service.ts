import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EdiAcknowledgementStatus,
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertStatus,
  EdiAlertType,
  EdiOutboxStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { AuditService } from '../../audit/audit.service';
import { QueryEdiAlertDto } from '../dto/query-edi-alert.dto';
import { ResolveEdiAlertDto } from '../dto/resolve-edi-alert.dto';
import { EDI_ERROR_CODES } from '../constants/edi-error-codes.constants';

export interface CreateAlertParams {
  icdId: string;
  sourceType: EdiAlertSourceType;
  sourceId: string;
  alertType: EdiAlertType;
  severity: EdiAlertSeverity;
  title: string;
  message: string;
}

@Injectable()
export class EdiAlertService {
  private readonly logger = new Logger(EdiAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createOrUpdateAlert(params: CreateAlertParams) {
    const existing = await this.prisma.ediAlert.findUnique({
      where: {
        sourceType_sourceId_alertType: {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          alertType: params.alertType,
        },
      },
    });

    const now = new Date();

    if (existing) {
      const isResolved = existing.status === EdiAlertStatus.RESOLVED;

      return this.prisma.ediAlert.update({
        where: { id: existing.id },
        data: {
          title: params.title,
          message: params.message,
          severity: params.severity,
          occurrenceCount: { increment: 1 },
          lastOccurredAt: now,
          ...(isResolved
            ? {
                status: EdiAlertStatus.OPEN,
                acknowledgedById: null,
                acknowledgedAt: null,
                resolvedById: null,
                resolvedAt: null,
                resolutionNote: null,
              }
            : {}),
        },
      });
    }

    return this.prisma.ediAlert.create({
      data: {
        icdId: params.icdId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        alertType: params.alertType,
        severity: params.severity,
        status: EdiAlertStatus.OPEN,
        title: params.title,
        message: params.message,
        occurrenceCount: 1,
        firstOccurredAt: now,
        lastOccurredAt: now,
      },
    });
  }

  async acknowledgeAlert(id: string, actor: AuthenticatedUser) {
    const alert = await this.prisma.ediAlert.findFirst({
      where: {
        id,
        icdId: actor.icdId,
      },
    });

    if (!alert) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_ALERT_NOT_FOUND,
        message: `Sự cố EDI ${id} không tồn tại.`,
      });
    }

    if (alert.status !== EdiAlertStatus.OPEN) {
      throw new BadRequestException({
        code: EDI_ERROR_CODES.EDI_ALERT_INVALID_STATE,
        message: `Chỉ có thể ghi nhận sự cố ở trạng thái OPEN (hiện tại: ${alert.status}).`,
      });
    }

    const updated = await this.prisma.ediAlert.update({
      where: { id: alert.id },
      data: {
        status: EdiAlertStatus.ACKNOWLEDGED,
        acknowledgedById: actor.id,
        acknowledgedAt: new Date(),
      },
    });

    await this.auditService.record({
      icdId: actor.icdId,
      actorUserId: actor.id,
      action: 'ACKNOWLEDGE',
      entityType: 'EDI_ALERT',
      entityId: alert.id,
      oldData: { status: alert.status },
      newData: { status: updated.status, acknowledgedById: actor.id },
      reason: 'Acknowledge EDI operational alert',
    });

    return updated;
  }

  async resolveAlert(
    id: string,
    dto: ResolveEdiAlertDto,
    actor: AuthenticatedUser,
  ) {
    const alert = await this.prisma.ediAlert.findFirst({
      where: {
        id,
        icdId: actor.icdId,
      },
    });

    if (!alert) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_ALERT_NOT_FOUND,
        message: `Sự cố EDI ${id} không tồn tại.`,
      });
    }

    if (alert.status === EdiAlertStatus.RESOLVED) {
      throw new BadRequestException({
        code: EDI_ERROR_CODES.EDI_ALERT_INVALID_STATE,
        message: 'Sự cố EDI đã được giải quyết trước đó.',
      });
    }

    const updated = await this.prisma.ediAlert.update({
      where: { id: alert.id },
      data: {
        status: EdiAlertStatus.RESOLVED,
        resolvedById: actor.id,
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
    });

    await this.auditService.record({
      icdId: actor.icdId,
      actorUserId: actor.id,
      action: 'RESOLVE',
      entityType: 'EDI_ALERT',
      entityId: alert.id,
      oldData: { status: alert.status },
      newData: {
        status: updated.status,
        resolvedById: actor.id,
        resolutionNote: dto.resolutionNote,
      },
      reason: 'Resolve EDI operational alert',
    });

    return updated;
  }

  async listAlerts(actor: AuthenticatedUser, query: QueryEdiAlertDto) {
    const where: Prisma.EdiAlertWhereInput = {
      icdId: actor.icdId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.alertType ? { alertType: query.alertType } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.ediAlert.count({ where }),
      this.prisma.ediAlert.findMany({
        where,
        include: {
          acknowledgedByUser: {
            select: { id: true, name: true, email: true },
          },
          resolvedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: {
          lastOccurredAt: 'desc',
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

  async getAlertById(id: string, actor: AuthenticatedUser) {
    const alert = await this.prisma.ediAlert.findFirst({
      where: {
        id,
        icdId: actor.icdId,
      },
      include: {
        acknowledgedByUser: {
          select: { id: true, name: true, email: true },
        },
        resolvedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.EDI_ALERT_NOT_FOUND,
        message: `Sự cố EDI ${id} không tồn tại.`,
      });
    }

    return alert;
  }

  async syncAlerts(actor: AuthenticatedUser) {
    let syncedOutboxCount = 0;
    let syncedAckCount = 0;

    // 1. Scan failed/dead outbox messages
    const failedMessages = await this.prisma.ediOutboxMessage.findMany({
      where: {
        ediRoute: {
          icdId: actor.icdId,
        },
        status: {
          in: [EdiOutboxStatus.FAILED, EdiOutboxStatus.DEAD],
        },
      },
    });

    for (const msg of failedMessages) {
      const isDead = msg.status === EdiOutboxStatus.DEAD;
      await this.createOrUpdateAlert({
        icdId: actor.icdId,
        sourceType: EdiAlertSourceType.OUTBOX,
        sourceId: msg.id,
        alertType: EdiAlertType.DELIVERY_FAILURE,
        severity: isDead ? EdiAlertSeverity.CRITICAL : EdiAlertSeverity.ERROR,
        title: `Lỗi truyền tin EDI (${msg.status}) - ${msg.messageType}`,
        message: `Thông điệp ${msg.id} gặp lỗi: ${msg.lastError ?? 'Không xác định'}. Thử lại: ${msg.retryCount}.`,
      });
      syncedOutboxCount++;
    }

    // 2. Scan rejected / error / unmatched ACKs
    const problemAcks = await this.prisma.ediAcknowledgement.findMany({
      where: {
        status: {
          in: [
            EdiAcknowledgementStatus.REJECTED,
            EdiAcknowledgementStatus.ERROR,
            EdiAcknowledgementStatus.UNMATCHED,
          ],
        },
        OR: [
          {
            outboxMessage: {
              ediRoute: { icdId: actor.icdId },
            },
          },
          {
            shippingLine: {
              ediRoutes: { some: { icdId: actor.icdId } },
            },
          },
        ],
      },
    });

    for (const ack of problemAcks) {
      let alertType: EdiAlertType;
      let severity: EdiAlertSeverity;
      let title: string;

      switch (ack.status) {
        case EdiAcknowledgementStatus.REJECTED:
          alertType = EdiAlertType.ACK_REJECTED;
          severity = EdiAlertSeverity.ERROR;
          title = `EDI ACK Bị Từ Chối (REJECTED) - ${ack.ackType}`;
          break;
        case EdiAcknowledgementStatus.ERROR:
          alertType = EdiAlertType.ACK_ERROR;
          severity = EdiAlertSeverity.ERROR;
          title = `EDI ACK Lỗi Cú Pháp/Kỹ Thuật (ERROR) - ${ack.ackType}`;
          break;
        case EdiAcknowledgementStatus.UNMATCHED:
        default:
          alertType = EdiAlertType.ACK_UNMATCHED;
          severity = EdiAlertSeverity.WARNING;
          title = `EDI ACK Không Khớp Thông Điệp Gốc (UNMATCHED) - ${ack.ackType}`;
          break;
      }

      await this.createOrUpdateAlert({
        icdId: actor.icdId,
        sourceType: EdiAlertSourceType.ACKNOWLEDGEMENT,
        sourceId: ack.id,
        alertType,
        severity,
        title,
        message: `Phản hồi ${ack.ackType} trạng thái ${ack.status}. Ref: ${ack.externalReference ?? 'N/A'}. Dedupe: ${ack.dedupeKey}`,
      });
      syncedAckCount++;
    }

    this.logger.log(
      `Synced ${syncedOutboxCount} outbox alerts and ${syncedAckCount} ack alerts for ICD ${actor.icdId}`,
    );

    return {
      syncedOutboxCount,
      syncedAckCount,
      totalSynced: syncedOutboxCount + syncedAckCount,
    };
  }
}
