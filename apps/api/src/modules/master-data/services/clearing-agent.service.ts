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
  CreateClearingAgentDto,
} from '../dto/clearing-agent/create-clearing-agent.dto';

import type {
  UpdateClearingAgentDto,
} from '../dto/clearing-agent/update-clearing-agent.dto';

import type {
  QueryMasterDataDto,
} from '../dto/query-master-data.dto';

@Injectable()
export class ClearingAgentService {
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
      Prisma.ClearingAgentWhereInput = {
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
                licenseNo: {
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
            .clearingAgent
            .count({
              where,
            }),

          this.prisma
            .clearingAgent
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
      CreateClearingAgentDto,
  ) {
    try {
      return await this.prisma
        .clearingAgent
        .create({
          data: {
            name:
              dto.name,

            licenseNo:
              dto.licenseNo,

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
      UpdateClearingAgentDto,
  ) {
    if (
      dto.name ===
        undefined &&
      dto.licenseNo ===
        undefined
    ) {
      throw this.updateEmpty();
    }

    await this.getByIdOrThrow(
      id,
    );

    try {
      return await this.prisma
        .clearingAgent
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

            ...(dto.licenseNo !==
            undefined
              ? {
                  licenseNo:
                    dto.licenseNo,
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
      .clearingAgent
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
        .clearingAgent
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
          'Không tìm thấy Clearing Agent.',
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
        'Số phép Clearing Agent đã tồn tại.',
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
