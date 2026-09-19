import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { isPrismaUniqueConstraintError } from '../../../database/prisma-error.util';

import { PrismaService } from '../../../database/prisma.service';

import { MASTER_DATA_ERROR_CODES } from '../constants/master-data-error-codes.constants';

import type { CreateShippingLineDto } from '../dto/shipping-line/create-shipping-line.dto';

import type { UpdateShippingLineDto } from '../dto/shipping-line/update-shipping-line.dto';

import type { QueryMasterDataDto } from '../dto/query-master-data.dto';

@Injectable()
export class ShippingLineService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryMasterDataDto) {
    const { page, pageSize, search, active } = query;

    const where: Prisma.ShippingLineWhereInput = {
      ...(active !== undefined
        ? {
            active,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },

              {
                scacCode: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.shippingLine.count({
        where,
      }),

      this.prisma.shippingLine.findMany({
        where,

        orderBy: {
          name: 'asc',
        },

        skip: (page - 1) * pageSize,

        take: pageSize,
      }),
    ]);

    return {
      data,

      meta: {
        page,
        pageSize,
        total,

        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    return this.getByIdOrThrow(id);
  }

  async create(dto: CreateShippingLineDto) {
    try {
      return await this.prisma.shippingLine.create({
        data: {
          name: dto.name,

          scacCode: dto.scacCode,

          active: true,
        },
      });
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw this.identifierInUse('SCAC code đã tồn tại.');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateShippingLineDto) {
    if (dto.name === undefined && dto.scacCode === undefined) {
      throw this.updateEmpty();
    }

    await this.getByIdOrThrow(id);

    try {
      return await this.prisma.shippingLine.update({
        where: {
          id,
        },

        data: {
          ...(dto.name !== undefined
            ? {
                name: dto.name,
              }
            : {}),

          ...(dto.scacCode !== undefined
            ? {
                scacCode: dto.scacCode,
              }
            : {}),
        },
      });
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw this.identifierInUse('SCAC code đã tồn tại.');
      }

      throw error;
    }
  }

  async updateStatus(id: string, active: boolean) {
    await this.getByIdOrThrow(id);

    return this.prisma.shippingLine.update({
      where: {
        id,
      },

      data: {
        active,
      },
    });
  }

  private async getByIdOrThrow(id: string) {
    const item = await this.prisma.shippingLine.findUnique({
      where: {
        id,
      },
    });

    if (!item) {
      throw new NotFoundException({
        code: MASTER_DATA_ERROR_CODES.NOT_FOUND,

        message: 'Không tìm thấy Shipping Line.',
      });
    }

    return item;
  }

  private identifierInUse(message: string): ConflictException {
    return new ConflictException({
      code: MASTER_DATA_ERROR_CODES.IDENTIFIER_IN_USE,

      message,
    });
  }

  private updateEmpty(): BadRequestException {
    return new BadRequestException({
      code: MASTER_DATA_ERROR_CODES.UPDATE_EMPTY,

      message: 'Không có dữ liệu cần cập nhật.',
    });
  }
}
