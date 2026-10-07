import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationMeta } from '../../../common/dto/pagination-query.dto';
import { Prisma } from '../../../generated/prisma/client';
import { IdempotencyPolicy } from '../policies/idempotency.policy';

export interface CreatePartnerApiLogParams {
  partnerApiClientId: string;
  transportHandoverId?: string;
  endpoint: string;
  method: string;
  idempotencyKey?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  httpStatus: number;
  businessStatus?: string;
  errorCode?: string;
  requestId: string;
  latencyMs?: number;
  completedAt?: Date;
}

@Injectable()
export class PartnerApiLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logRequest(params: CreatePartnerApiLogParams) {
    const requestHash = params.requestBody
      ? IdempotencyPolicy.computePayloadHash(params.requestBody)
      : null;

    const requestBodyRedacted = params.requestBody
      ? (IdempotencyPolicy.redactSensitiveData(
          params.requestBody,
        ) as Prisma.InputJsonValue)
      : undefined;

    const responseBodyRedacted = params.responseBody
      ? (IdempotencyPolicy.redactSensitiveData(
          params.responseBody,
        ) as Prisma.InputJsonValue)
      : undefined;

    return this.prisma.partnerApiLog.create({
      data: {
        partnerApiClientId: params.partnerApiClientId,
        transportHandoverId: params.transportHandoverId || null,
        endpoint: params.endpoint,
        method: params.method,
        idempotencyKey: params.idempotencyKey || null,
        requestHash,
        requestBodyRedacted,
        responseBodyRedacted,
        httpStatus: params.httpStatus,
        businessStatus: params.businessStatus || null,
        errorCode: params.errorCode || null,
        requestId: params.requestId,
        latencyMs: params.latencyMs || null,
        completedAt: params.completedAt || new Date(),
      },
    });
  }

  async findMany(query: {
    partnerApiClientId?: string;
    transportHandoverId?: string;
    statusCode?: number;
    page?: number;
    pageSize?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      partnerApiClientId,
      transportHandoverId,
      statusCode,
    } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartnerApiLogWhereInput = {};
    if (partnerApiClientId) where.partnerApiClientId = partnerApiClientId;
    if (transportHandoverId) where.transportHandoverId = transportHandoverId;
    if (statusCode !== undefined) where.httpStatus = statusCode;

    const [total, items] = await Promise.all([
      this.prisma.partnerApiLog.count({ where }),
      this.prisma.partnerApiLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          partnerApiClient: {
            select: { id: true, partnerCode: true, partnerName: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: getPaginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const log = await this.prisma.partnerApiLog.findUnique({
      where: { id },
      include: {
        partnerApiClient: {
          select: {
            id: true,
            partnerCode: true,
            partnerName: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException({
        code: 'PARTNER_API_LOG_NOT_FOUND',
        message: `Không tìm thấy Partner API log ${id}.`,
      });
    }

    return log;
  }
}
