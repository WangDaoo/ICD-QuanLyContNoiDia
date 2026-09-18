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
  CreateTransporterDto,
} from '../dto/transporter/create-transporter.dto';

import type {
  UpdateTransporterDto,
} from '../dto/transporter/update-transporter.dto';

import type {
  QueryMasterDataDto,
} from '../dto/query-master-data.dto';

@Injectable()
export class TransporterService {
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
      Prisma.TransporterWhereInput = {
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
          this.prisma
            .transporter
            .count({
              where,
            }),

          this.prisma
            .transporter
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
    dto:
      CreateTransporterDto,
  ) {
    try {
      return await this.prisma
        .transporter
        .create({
          data: {
            name:
              dto.name,

            taxCode:
              dto.taxCode,

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
    dto:
      UpdateTransporterDto,
  ) {
    if (
      dto.name ===
        undefined &&
      dto.taxCode ===
        undefined
    ) {
      throw this.updateEmpty();
    }

    await this.getByIdOrThrow(
      id,
    );

    try {
      return await this.prisma
        .transporter
        .update({
          where: {
            id,
          },

          data: {
            ...(dto.name !==
            undefined
              ? {
                  name:
                    dto.name,
                }
              : {}),

            ...(dto.taxCode !==
            undefined
              ? {
                  taxCode:
                    dto.taxCode,
                }
              : {}),
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
      .transporter
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
        .transporter
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
          'Không tìm thấy Transporter.',
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
        'Mã số thuế Transporter đã tồn tại.',
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
