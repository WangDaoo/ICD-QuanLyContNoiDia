import { Injectable, NotFoundException } from '@nestjs/common';

import { getPaginationMeta } from '../../../common/dto/pagination-query.dto';
import { PrismaService } from '../../../database/prisma.service';
import { QueryTransportHandoverDto } from '../dto/query-transport-handover.dto';

@Injectable()
export class TransportHandoverReadService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, icdId: string) {
    const handover = await this.prisma.transportHandover.findUnique({
      where: { id },
      include: {
        containerVisit: {
          include: {
            container: true,
            houseBl: true,
          },
        },
        partnerApiClient: {
          select: {
            id: true,
            partnerCode: true,
            partnerName: true,
            keyLast4: true,
            status: true,
            scopes: true,
          },
        },
        warehouse: {
          include: {
            consignee: true,
          },
        },
        confirmations: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdByUser: {
              select: { id: true, name: true, email: true },
            },
            createdByPartnerClient: {
              select: { id: true, partnerCode: true, partnerName: true },
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        icdConfirmedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!handover || handover.containerVisit.icdId !== icdId) {
      throw new NotFoundException(
        `Không tìm thấy biên bản bàn giao với ID ${id}.`,
      );
    }

    return handover;
  }

  async findMany(icdId: string, query: QueryTransportHandoverDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      containerVisitId,
      partnerApiClientId,
      warehouseId,
      search,
    } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      containerVisit: { icdId },
    };

    if (status) where.status = status;
    if (containerVisitId) where.containerVisitId = containerVisitId;
    if (partnerApiClientId) where.partnerApiClientId = partnerApiClientId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (search) {
      where.OR = [
        { transportCode: { contains: search } },
        {
          containerVisit: {
            container: {
              containerNumber: { contains: search },
            },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.transportHandover.count({ where }),
      this.prisma.transportHandover.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          containerVisit: {
            include: { container: true },
          },
          partnerApiClient: {
            select: {
              id: true,
              partnerCode: true,
              partnerName: true,
              keyLast4: true,
              status: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
            },
          },
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { confirmations: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: getPaginationMeta(page, pageSize, total),
    };
  }

  async findSummaryByContainerVisit(containerVisitId: string, icdId: string) {
    const handover = await this.prisma.transportHandover.findFirst({
      where: {
        containerVisitId,
        containerVisit: { icdId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        partnerApiClient: {
          select: {
            partnerName: true,
          },
        },
      },
    });

    return {
      containerVisitId,
      handover: handover
        ? {
            id: handover.id,
            transportCode: handover.transportCode,
            status: handover.status,
            partnerName: handover.partnerApiClient.partnerName,
            expectedDeliveryAt: handover.expectedDeliveryAt,
          }
        : null,
    };
  }
}
