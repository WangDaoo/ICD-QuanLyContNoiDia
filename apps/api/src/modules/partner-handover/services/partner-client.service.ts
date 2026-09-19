import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { PartnerApiClientStatus } from '../../../generated/prisma/client';
import { CreatePartnerClientDto } from '../dto/create-partner-client.dto';
import { QueryPartnerClientDto } from '../dto/query-partner-client.dto';
import {
  PartnerClientCreateResult,
  PartnerClientRotateResult,
} from '../types/partner-handover.types';

@Injectable()
export class PartnerClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePartnerClientDto,
    actorId: string,
  ): Promise<PartnerClientCreateResult> {
    const existing = await this.prisma.partnerApiClient.findUnique({
      where: { partnerCode: dto.partnerCode },
    });

    if (existing) {
      throw new ConflictException(
        `Mã đối tác ${dto.partnerCode} đã tồn tại trong hệ thống.`,
      );
    }

    const rawApiKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(rawApiKey)
      .digest('hex');
    const keyLast4 = rawApiKey.slice(-4);

    const client = await this.prisma.partnerApiClient.create({
      data: {
        partnerCode: dto.partnerCode,
        partnerName: dto.partnerName,
        apiKeyHash,
        keyLast4,
        status: PartnerApiClientStatus.ACTIVE,
        scopes: dto.scopes,
        createdById: actorId,
      },
      select: {
        id: true,
        partnerCode: true,
        partnerName: true,
        keyLast4: true,
        status: true,
        scopes: true,
        createdAt: true,
      },
    });

    return {
      client: {
        ...client,
        scopes: client.scopes as string[],
      },
      rawApiKey,
    };
  }

  async findMany(query: QueryPartnerClientDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { partnerCode: { contains: search } },
        { partnerName: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.partnerApiClient.count({ where }),
      this.prisma.partnerApiClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          partnerCode: true,
          partnerName: true,
          keyLast4: true,
          status: true,
          scopes: true,
          lastRequestAt: true,
          createdAt: true,
          rotatedAt: true,
          revokedAt: true,
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const client = await this.prisma.partnerApiClient.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { handovers: true, confirmations: true, apiLogs: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Không tìm thấy Partner Client với ID ${id}.`);
    }

    const { apiKeyHash: _hash, ...safeClient } = client;
    return safeClient;
  }

  async rotateKey(
    id: string,
    _actorId: string,
  ): Promise<PartnerClientRotateResult> {
    const client = await this.prisma.partnerApiClient.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Không tìm thấy Partner Client với ID ${id}.`);
    }

    if (client.status === PartnerApiClientStatus.REVOKED) {
      throw new ConflictException(
        `Không thể xoay API Key cho Partner Client đã bị vô hiệu hóa (REVOKED).`,
      );
    }

    const rawApiKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(rawApiKey)
      .digest('hex');
    const keyLast4 = rawApiKey.slice(-4);
    const rotatedAt = new Date();

    const updated = await this.prisma.partnerApiClient.update({
      where: { id },
      data: {
        apiKeyHash,
        keyLast4,
        rotatedAt,
      },
      select: {
        id: true,
        partnerCode: true,
        partnerName: true,
        keyLast4: true,
        status: true,
        scopes: true,
        rotatedAt: true,
      },
    });

    return {
      client: {
        ...updated,
        scopes: updated.scopes as string[],
      },
      rawApiKey,
    };
  }

  async revoke(id: string, _actorId: string) {
    const client = await this.prisma.partnerApiClient.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Không tìm thấy Partner Client với ID ${id}.`);
    }

    if (client.status === PartnerApiClientStatus.REVOKED) {
      return {
        id: client.id,
        status: client.status,
        revokedAt: client.revokedAt,
      };
    }

    const revoked = await this.prisma.partnerApiClient.update({
      where: { id },
      data: {
        status: PartnerApiClientStatus.REVOKED,
        revokedAt: new Date(),
      },
      select: {
        id: true,
        partnerCode: true,
        partnerName: true,
        status: true,
        revokedAt: true,
      },
    });

    return revoked;
  }
}
