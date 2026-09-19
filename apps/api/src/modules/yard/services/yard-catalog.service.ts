import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { isPrismaUniqueConstraintError } from '../../../database/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { CreateYardBlockDto } from '../dto/create-yard-block.dto';
import type { CreateYardSlotDto } from '../dto/create-yard-slot.dto';
import type { QueryYardSlotsDto } from '../dto/query-yard-slots.dto';
import type { UpdateYardBlockDto } from '../dto/update-yard-block.dto';
import type { UpdateYardSlotDto } from '../dto/update-yard-slot.dto';
import { buildYardSlotCode } from '../utils/yard-slot-code.util';

@Injectable()
export class YardCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findBlocks(actor: AuthenticatedUser) {
    return this.prisma.yardBlock.findMany({
      where: {
        icdId: actor.icdId,
      },
      include: {
        _count: {
          select: {
            slots: true,
          },
        },
      },
      orderBy: {
        blockCode: 'asc',
      },
    });
  }

  async createBlock(dto: CreateYardBlockDto, actor: AuthenticatedUser) {
    try {
      return await this.prisma.yardBlock.create({
        data: {
          icdId: actor.icdId,
          blockCode: dto.blockCode,
          name: dto.name,
          operational: true,
        },
      });
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException({
          code: YARD_ERROR_CODES.BLOCK_CODE_IN_USE,
          message: 'Mã Yard Block đã tồn tại trong ICD.',
        });
      }

      throw error;
    }
  }

  async updateBlock(blockId: string, dto: UpdateYardBlockDto, actor: AuthenticatedUser) {
    if (dto.name === undefined && dto.operational === undefined) {
      throw new BadRequestException({
        code: YARD_ERROR_CODES.UPDATE_EMPTY,
        message: 'Không có dữ liệu cần cập nhật.',
      });
    }

    const block = await this.getBlockOrThrow(blockId, actor.icdId);

    return this.prisma.yardBlock.update({
      where: {
        id: block.id,
      },
      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name,
            }
          : {}),
        ...(dto.operational !== undefined
          ? {
              operational: dto.operational,
            }
          : {}),
      },
    });
  }

  async findSlots(query: QueryYardSlotsDto, actor: AuthenticatedUser) {
    const where: Prisma.YardSlotWhereInput = {
      yardBlock: {
        icdId: actor.icdId,
      },
      ...(query.yardBlockId
        ? {
            yardBlockId: query.yardBlockId,
          }
        : {}),
      ...(query.operational !== undefined
        ? {
            operational: query.operational,
          }
        : {}),
      ...(query.supportedContainerType
        ? {
            supportedContainerType: query.supportedContainerType,
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                slotCode: {
                  contains: query.search,
                },
              },
              {
                rowNo: {
                  contains: query.search,
                },
              },
              {
                bayNo: {
                  contains: query.search,
                },
              },
              {
                yardBlock: {
                  blockCode: {
                    contains: query.search,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, slots] = await this.prisma.$transaction([
      this.prisma.yardSlot.count({
        where,
      }),
      this.prisma.yardSlot.findMany({
        where,
        include: {
          yardBlock: true,
          locationLogs: {
            where: {
              endedAt: null,
            },
            take: 1,
            include: {
              containerVisit: {
                include: {
                  container: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            yardBlock: {
              blockCode: 'asc',
            },
          },
          {
            rowNo: 'asc',
          },
          {
            bayNo: 'asc',
          },
          {
            tierNo: 'asc',
          },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: slots.map((slot) => {
        const currentLocation = slot.locationLogs[0] ?? null;

        return {
          id: slot.id,
          yardBlock: slot.yardBlock,
          rowNo: slot.rowNo,
          bayNo: slot.bayNo,
          tierNo: slot.tierNo,
          slotCode: slot.slotCode,
          supportedContainerType: slot.supportedContainerType,
          reeferPower: slot.reeferPower,
          maxWeight: slot.maxWeight?.toString() ?? null,
          operational: slot.operational,
          status:
            !slot.yardBlock.operational || !slot.operational
              ? 'MAINTENANCE'
              : currentLocation
                ? 'OCCUPIED'
                : 'AVAILABLE',
          currentContainer: currentLocation
            ? {
                containerVisitId: currentLocation.containerVisitId,
                containerNumber: currentLocation.containerVisit.container.containerNumber,
                startedAt: currentLocation.startedAt,
              }
            : null,
        };
      }),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async createSlot(blockId: string, dto: CreateYardSlotDto, actor: AuthenticatedUser) {
    const block = await this.getBlockOrThrow(blockId, actor.icdId);
    const slotCode = buildYardSlotCode(block.blockCode, dto.rowNo, dto.bayNo, dto.tierNo);

    try {
      return await this.prisma.yardSlot.create({
        data: {
          yardBlockId: block.id,
          rowNo: dto.rowNo,
          bayNo: dto.bayNo,
          tierNo: dto.tierNo,
          slotCode,
          supportedContainerType: dto.supportedContainerType,
          reeferPower: dto.reeferPower,
          maxWeight: dto.maxWeight,
          operational: true,
        },
      });
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException({
          code: YARD_ERROR_CODES.SLOT_COORDINATE_IN_USE,
          message: 'Row/Bay/Tier này đã tồn tại trong Yard Block.',
        });
      }

      throw error;
    }
  }

  async updateSlot(slotId: string, dto: UpdateYardSlotDto, actor: AuthenticatedUser) {
    if (
      dto.supportedContainerType === undefined &&
      dto.reeferPower === undefined &&
      dto.maxWeight === undefined &&
      dto.operational === undefined
    ) {
      throw new BadRequestException({
        code: YARD_ERROR_CODES.UPDATE_EMPTY,
        message: 'Không có dữ liệu cần cập nhật.',
      });
    }

    const slot = await this.getSlotOrThrow(slotId, actor.icdId);

    return this.prisma.yardSlot.update({
      where: {
        id: slot.id,
      },
      data: {
        ...(dto.supportedContainerType !== undefined
          ? {
              supportedContainerType: dto.supportedContainerType,
            }
          : {}),
        ...(dto.reeferPower !== undefined
          ? {
              reeferPower: dto.reeferPower,
            }
          : {}),
        ...(dto.maxWeight !== undefined
          ? {
              maxWeight: dto.maxWeight,
            }
          : {}),
        ...(dto.operational !== undefined
          ? {
              operational: dto.operational,
            }
          : {}),
      },
    });
  }

  private async getBlockOrThrow(blockId: string, icdId: string) {
    const block = await this.prisma.yardBlock.findFirst({
      where: {
        id: blockId,
        icdId,
      },
    });

    if (!block) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.BLOCK_NOT_FOUND,
        message: 'Không tìm thấy Yard Block.',
      });
    }

    return block;
  }

  private async getSlotOrThrow(slotId: string, icdId: string) {
    const slot = await this.prisma.yardSlot.findFirst({
      where: {
        id: slotId,
        yardBlock: {
          icdId,
        },
      },
    });

    if (!slot) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.SLOT_NOT_FOUND,
        message: 'Không tìm thấy Yard Slot.',
      });
    }

    return slot;
  }
}
