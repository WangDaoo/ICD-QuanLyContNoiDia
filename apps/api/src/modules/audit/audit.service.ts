import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { toAuditJson } from './audit.util';
import type { QueryAuditLogDto } from './dto/query-audit-log.dto';

export interface RecordAuditParams {
  icdId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  reason?: string | null;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async record(params: RecordAuditParams, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const requestId = params.requestId ?? this.requestContext.getRequestIdOrCreate();

    return client.auditLog.create({
      data: {
        icdId: params.icdId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldDataJson: params.oldData !== undefined ? (toAuditJson(params.oldData) as Prisma.InputJsonValue) : Prisma.DbNull,
        newDataJson: params.newData !== undefined ? (toAuditJson(params.newData) as Prisma.InputJsonValue) : Prisma.DbNull,
        reason: params.reason ?? null,
        requestId,
      },
    });
  }

  async list(icdId: string, query: QueryAuditLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      icdId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByRequestId(icdId: string, requestId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        icdId,
        requestId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByEntity(icdId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        icdId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
