import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type { Prisma } from '../../../../generated/prisma/client';
import type { ExternalHandoverQueryDto } from '../dto/external-handover-query.dto';
import {
  mapExternalHandoverDetail,
  mapExternalHandoverListItem,
} from '../mappers/external-handover.mapper';
import type {
  ExternalHandoverDetail,
  ExternalHandoverDetailRecord,
  ExternalHandoverListItem,
  ExternalHandoverListRecord,
  PartnerApiPrincipal,
} from '../types/partner-api.types';

@Injectable()
export class ExternalHandoverQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: ExternalHandoverQueryDto,
    principal: PartnerApiPrincipal,
  ): Promise<{
    data: ExternalHandoverListItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      container_code,
      transport_code,
      ready_from,
      ready_to,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransportHandoverWhereInput = {
      partnerApiClientId: principal.clientId,
    };

    if (status) {
      where.status = status;
    }

    if (transport_code) {
      where.transportCode = {
        contains: transport_code,
      };
    }

    if (container_code) {
      where.containerVisit = {
        container: {
          containerNumber: {
            contains: container_code,
          },
        },
      };
    }

    if (ready_from || ready_to) {
      where.readyAt = {
        ...(ready_from ? { gte: new Date(ready_from) } : {}),
        ...(ready_to ? { lte: new Date(ready_to) } : {}),
      };
    }

    const [total, records] = await Promise.all([
      this.prisma.transportHandover.count({ where }),
      this.prisma.transportHandover.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          containerVisit: {
            select: {
              container: {
                select: {
                  containerNumber: true,
                  type: true,
                },
              },
            },
          },
          warehouse: true,
        },
      }),
    ]);

    const data = (records as unknown as ExternalHandoverListRecord[]).map(
      mapExternalHandoverListItem,
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getByIdOrThrow(
    handoverId: string,
    principal: PartnerApiPrincipal,
  ): Promise<ExternalHandoverDetail> {
    const record = await this.prisma.transportHandover.findFirst({
      where: {
        id: handoverId,
        partnerApiClientId: principal.clientId,
      },
      include: {
        warehouse: true,
        containerVisit: {
          select: {
            gateOutAt: true,
            grossWeight: true,
            container: {
              select: {
                containerNumber: true,
                type: true,
              },
            },
            houseBl: {
              select: {
                consignee: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            reception: {
              select: {
                actualSeal: true,
                actualWeight: true,
              },
            },
          },
        },
        confirmations: {
          orderBy: { confirmedAt: 'asc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'HANDOVER_NOT_FOUND',
        message: `Handover ${handoverId} not found.`,
      });
    }

    return mapExternalHandoverDetail(
      record as unknown as ExternalHandoverDetailRecord,
    );
  }
}
