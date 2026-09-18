import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '../../../generated/prisma/client';

import {
  isPrismaUniqueConstraintError,
} from '../../../database/prisma-error.util';

import {
  PrismaService,
} from '../../../database/prisma.service';

import {
  MASTER_DATA_ERROR_CODES,
} from '../constants/master-data-error-codes.constants';

import type {
  CreateConsigneeDto,
} from '../dto/consignee/create-consignee.dto';

import type {
  UpdateConsigneeDto,
} from '../dto/consignee/update-consignee.dto';

import type {
  QueryMasterDataDto,
} from '../dto/query-master-data.dto';

@Injectable()
export class ConsigneeService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async findMany(
    query: QueryMasterDataDto,
  ) {
    const {
      page,
      pageSize,
      search,
      active,
    } = query;

    const where:
      Prisma.ConsigneeWhereInput = {
      ...(active !== undefined
        ? { active }
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
                taxCode: {
                  contains: search,
                },
              },

              {
                email: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [
      total,
      data,
    ] =
      await this.prisma
        .$transaction([
          this.prisma.consignee
            .count({
              where,
            }),

          this.prisma.consignee
            .findMany({
              where,

              orderBy: {
                name: 'asc',
              },

              skip:
                (page - 1) *
                pageSize,

              take:
                pageSize,
            }),
        ]);

    return {
      data,

      meta: {
        page,
        pageSize,
        total,

        totalPages:
          Math.ceil(
            total /
              pageSize,
          ),
      },
    };
  }

  async findById(
    id: string,
  ) {
    return this.getByIdOrThrow(
      id,
    );
  }

  async create(
    dto: CreateConsigneeDto,
  ) {
    try {
      return await this.prisma
        .consignee
        .create({
          data: {
            name:
              dto.name,

            taxCode:
              dto.taxCode,

            phone:
              dto.phone,

            email:
              dto.email,

            address:
              dto.address,

            active:
              true,
          },
        });
    } catch (error: unknown) {
      if (
        isPrismaUniqueConstraintError(
          error,
        )
      ) {
        throw this.identifierInUse();
      }

      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateConsigneeDto,
  ) {
    if (
      Object.values(dto)
        .every(
          (value) =>
            value === undefined,
        )
    ) {
      throw this.updateEmpty();
    }

    await this.getByIdOrThrow(
      id,
    );

    try {
      return await this.prisma
        .consignee
        .update({
          where: {
            id,
          },

          data: {
            ...dto,
          },
        });
    } catch (error: unknown) {
      if (
        isPrismaUniqueConstraintError(
          error,
        )
      ) {
        throw this.identifierInUse();
      }

      throw error;
    }
  }

  async updateStatus(
    id: string,
    active: boolean,
  ) {
    await this.getByIdOrThrow(
      id,
    );

    return this.prisma
      .consignee
      .update({
        where: {
          id,
        },

        data: {
          active,
        },
      });
  }

  private async getByIdOrThrow(
    id: string,
  ) {
    const item =
      await this.prisma
        .consignee
        .findUnique({
          where: {
            id,
          },
        });

    if (!item) {
      throw new NotFoundException({
        code:
          MASTER_DATA_ERROR_CODES
            .NOT_FOUND,

        message:
          'Không tìm thấy Consignee.',
      });
    }

    return item;
  }

  private identifierInUse():
    ConflictException {
    return new ConflictException({
      code:
        MASTER_DATA_ERROR_CODES
          .IDENTIFIER_IN_USE,

      message:
        'Mã số thuế Consignee đã tồn tại.',
    });
  }

  private updateEmpty():
    BadRequestException {
    return new BadRequestException({
      code:
        MASTER_DATA_ERROR_CODES
          .UPDATE_EMPTY,

      message:
        'Không có dữ liệu cần cập nhật.',
    });
  }
}
