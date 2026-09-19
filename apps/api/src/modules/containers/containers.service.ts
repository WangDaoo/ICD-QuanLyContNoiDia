import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CONTAINER_ERROR_CODES } from './constants/container-error-codes.constants';
import { CONTAINER_EVENT_TYPES } from './constants/container-event-types.constants';
import { CancelContainerVisitDto } from './dtos/cancel-container-visit.dto';
import { CreateContainerVisitDto } from './dtos/create-container-visit.dto';
import { QueryContainerVisitsDto } from './dtos/query-container-visits.dto';
import { UpdateContainerVisitDto } from './dtos/update-container-visit.dto';
import { ContainerStatePolicy } from './policies/container-state.policy';
import { Iso6346Validator } from './utils/iso-6346.validator';

@Injectable()
export class ContainersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(icdId: string, query: QueryContainerVisitsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ContainerVisitWhereInput = {
      icdId,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.holdStatus && { holdStatus: query.holdStatus }),
      ...(query.isOverstay !== undefined && { isOverstay: query.isOverstay }),
      ...(query.search && {
        OR: [
          {
            container: {
              containerNumber: {
                contains: query.search.trim(),
              },
            },
          },
          {
            sealNumber: {
              contains: query.search.trim(),
            },
          },
          {
            houseBl: {
              hblNumber: {
                contains: query.search.trim(),
              },
            },
          },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.containerVisit.count({ where }),
      this.prisma.containerVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          container: true,
          reception: true,
          houseBl: {
            include: {
              masterBl: {
                include: {
                  manifest: {
                    include: {
                      shippingLine: true,
                    },
                  },
                },
              },
              consignee: true,
            },
          },
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

  async findById(icdId: string, visitId: string) {
    const visit = await this.prisma.containerVisit.findFirst({
      where: { id: visitId, icdId },
      include: {
        container: true,
        reception: {
          include: {
            receivedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            truckVisit: {
              include: {
                transporter: true,
              },
            },
          },
        },
        houseBl: {
          include: {
            masterBl: {
              include: {
                manifest: {
                  include: {
                    shippingLine: true,
                  },
                },
              },
            },
            consignee: true,
            clearingAgent: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Container visit not found',
      });
    }

    return visit;
  }

  async getEvents(icdId: string, visitId: string) {
    await this.verifyVisitExists(icdId, visitId);

    return this.prisma.containerEvent.findMany({
      where: { visitId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createVisit(icdId: string, actorId: string, dto: CreateContainerVisitDto) {
    const normalizedContainerNumber = Iso6346Validator.normalize(dto.containerNumber);

    if (!Iso6346Validator.validate(normalizedContainerNumber)) {
      throw new BadRequestException({
        code: CONTAINER_ERROR_CODES.INVALID_ISO_NUMBER,
        message: 'Invalid container number according to ISO 6346 specification',
      });
    }

    if (dto.houseBlId) {
      const houseBl = await this.prisma.houseBl.findUnique({
        where: { id: dto.houseBlId },
      });
      if (!houseBl) {
        throw new NotFoundException({
          code: CONTAINER_ERROR_CODES.HOUSE_BL_NOT_FOUND,
          message: 'Referenced House B/L not found',
        });
      }
    }

    const container = await this.prisma.container.upsert({
      where: { containerNumber: normalizedContainerNumber },
      create: {
        containerNumber: normalizedContainerNumber,
        isoCode: dto.isoCode.toUpperCase(),
        size: dto.size,
        type: dto.type,
        height: dto.height,
        tareWeight: dto.tareWeight,
        maxPayload: dto.maxPayload,
      },
      update: {
        isoCode: dto.isoCode.toUpperCase(),
        size: dto.size,
        type: dto.type,
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.tareWeight !== undefined && { tareWeight: dto.tareWeight }),
        ...(dto.maxPayload !== undefined && { maxPayload: dto.maxPayload }),
      },
    });

    const activeVisit = await this.prisma.containerVisit.findFirst({
      where: {
        containerId: container.id,
        status: {
          notIn: ['EXITED', 'CANCELLED'],
        },
      },
    });

    if (activeVisit) {
      throw new BadRequestException({
        code: CONTAINER_ERROR_CODES.ACTIVE_VISIT_EXISTS,
        message: 'An active visit already exists for this container',
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.containerVisit.create({
        data: {
          icdId,
          containerId: container.id,
          houseBlId: dto.houseBlId,
          sealNumber: dto.sealNumber,
          cargoDescription: dto.cargoDescription,
          grossWeight: dto.grossWeight,
          category: dto.category,
        },
        include: {
          container: true,
          houseBl: true,
        },
      });

      await tx.containerEvent.create({
        data: {
          visitId: visit.id,
          eventType: CONTAINER_EVENT_TYPES.VISIT_CREATED,
          toStatus: visit.status,
          actorId,
          note: 'Container visit registered',
        },
      });

      return visit;
    });
  }

  async updateVisit(icdId: string, visitId: string, actorId: string, dto: UpdateContainerVisitDto) {
    const visit = await this.verifyVisitExists(icdId, visitId);

    if (!ContainerStatePolicy.canUpdate(visit.status)) {
      throw new BadRequestException({
        code: CONTAINER_ERROR_CODES.UPDATE_NOT_ALLOWED,
        message: `Container visit cannot be modified in status ${visit.status}`,
      });
    }

    if (dto.houseBlId) {
      const houseBl = await this.prisma.houseBl.findUnique({
        where: { id: dto.houseBlId },
      });
      if (!houseBl) {
        throw new NotFoundException({
          code: CONTAINER_ERROR_CODES.HOUSE_BL_NOT_FOUND,
          message: 'Referenced House B/L not found',
        });
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.containerVisit.update({
        where: { id: visitId },
        data: {
          ...(dto.houseBlId !== undefined && { houseBlId: dto.houseBlId }),
          ...(dto.sealNumber !== undefined && { sealNumber: dto.sealNumber }),
          ...(dto.cargoDescription !== undefined && {
            cargoDescription: dto.cargoDescription,
          }),
          ...(dto.grossWeight !== undefined && {
            grossWeight: dto.grossWeight,
          }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.holdStatus !== undefined && { holdStatus: dto.holdStatus }),
          ...(dto.currentLocation !== undefined && {
            currentLocation: dto.currentLocation,
          }),
        },
        include: {
          container: true,
          houseBl: true,
        },
      });

      await tx.containerEvent.create({
        data: {
          visitId,
          eventType: CONTAINER_EVENT_TYPES.VISIT_UPDATED,
          actorId,
          metadata: dto as Prisma.InputJsonValue,
          note: dto.note || 'Container visit updated',
        },
      });

      return updated;
    });
  }

  async cancelVisit(icdId: string, visitId: string, actorId: string, dto: CancelContainerVisitDto) {
    const visit = await this.verifyVisitExists(icdId, visitId);

    if (!ContainerStatePolicy.canCancel(visit.status)) {
      throw new BadRequestException({
        code: CONTAINER_ERROR_CODES.CANCEL_NOT_ALLOWED,
        message: `Container visit cannot be cancelled in status ${visit.status}`,
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.containerVisit.update({
        where: { id: visitId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          container: true,
          houseBl: true,
        },
      });

      await tx.containerEvent.create({
        data: {
          visitId,
          eventType: CONTAINER_EVENT_TYPES.VISIT_CANCELLED,
          fromStatus: visit.status,
          toStatus: 'CANCELLED',
          actorId,
          note: dto.reason,
        },
      });

      return updated;
    });
  }

  private async verifyVisitExists(icdId: string, visitId: string) {
    const visit = await this.prisma.containerVisit.findFirst({
      where: { id: visitId, icdId },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Container visit not found',
      });
    }

    return visit;
  }
}
