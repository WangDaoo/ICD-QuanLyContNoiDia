import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';

import { hashPassword } from '../../common/security/password.util';

import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';

import { PrismaService } from '../../database/prisma.service';

import { USER_ERROR_CODES } from './constants/user-error-codes.constants';

import type { CreateUserDto } from './dto/create-user.dto';

import type { QueryUsersDto } from './dto/query-users.dto';

import type { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';

import type { ResetUserPasswordDto } from './dto/reset-user-password.dto';

import type { UpdateUserDto } from './dto/update-user.dto';

import type { UpdateUserStatusDto } from './dto/update-user-status.dto';

const USER_DETAIL_SELECT = {
  id: true,

  icdId: true,

  name: true,

  email: true,

  active: true,

  createdAt: true,

  updatedAt: true,

  roles: {
    select: {
      role: {
        select: {
          id: true,

          code: true,

          name: true,

          active: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type UserDetailRecord = Prisma.UserGetPayload<{
  select: typeof USER_DETAIL_SELECT;
}>;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryUsersDto, actor: AuthenticatedUser) {
    const { page, pageSize, search, active } = query;

    const where: Prisma.UserWhereInput = {
      /**
       * User management mặc định bị giới hạn
       * trong ICD Site của người đang đăng nhập.
       */
      icdId: actor.icdId,

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
                email: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({
        where,
      }),

      this.prisma.user.findMany({
        where,

        select: USER_DETAIL_SELECT,

        orderBy: {
          createdAt: 'desc',
        },

        skip: (page - 1) * pageSize,

        take: pageSize,
      }),
    ]);

    return {
      data: users.map((user) => this.mapUser(user)),

      meta: {
        page,

        pageSize,

        total,

        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(userId: string, actor: AuthenticatedUser) {
    const user = await this.getByIdOrThrow(userId, actor.icdId);

    return this.mapUser(user);
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    await this.ensureEmailAvailable(dto.email);

    const roles = await this.getActiveRolesOrThrow(dto.roleCodes);

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            icdId: actor.icdId,

            name: dto.name,

            email: dto.email,

            passwordHash,

            active: true,
          },
        });

        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: createdUser.id,

            roleId: role.id,
          })),
        });

        return tx.user.findUniqueOrThrow({
          where: {
            id: createdUser.id,
          },

          select: USER_DETAIL_SELECT,
        });
      });

      return this.mapUser(user);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw this.emailInUse();
      }

      throw error;
    }
  }

  async update(userId: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    if (dto.name === undefined && dto.email === undefined) {
      throw new BadRequestException({
        code: USER_ERROR_CODES.UPDATE_EMPTY,

        message: 'Không có dữ liệu cần cập nhật.',
      });
    }

    const user = await this.getByIdOrThrow(userId, actor.icdId);

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailAvailable(dto.email, user.id);
    }

    try {
      const updated = await this.prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          ...(dto.name !== undefined
            ? {
                name: dto.name,
              }
            : {}),

          ...(dto.email !== undefined
            ? {
                email: dto.email,
              }
            : {}),
        },

        select: USER_DETAIL_SELECT,
      });

      return this.mapUser(updated);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw this.emailInUse();
      }

      throw error;
    }
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto, actor: AuthenticatedUser) {
    /**
     * Không cho user dùng API quản trị
     * để vô hiệu hóa chính mình.
     */
    this.assertNotSelf(userId, actor.id);

    const user = await this.getByIdOrThrow(userId, actor.icdId);

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: {
          id: user.id,
        },

        data: {
          active: dto.active,
        },

        select: USER_DETAIL_SELECT,
      });

      /**
       * User bị deactivate:
       * revoke toàn bộ session ngay lập tức.
       */
      if (!dto.active) {
        await tx.authSession.updateMany({
          where: {
            userId: user.id,

            revokedAt: null,
          },

          data: {
            revokedAt: now,
          },
        });
      }

      return result;
    });

    return this.mapUser(updated);
  }

  async replaceRoles(userId: string, dto: ReplaceUserRolesDto, actor: AuthenticatedUser) {
    /**
     * Việc tự sửa role sẽ được xử lý
     * bằng một use-case khác nếu sau này cần.
     */
    this.assertNotSelf(userId, actor.id);

    const user = await this.getByIdOrThrow(userId, actor.icdId);

    const roles = await this.getActiveRolesOrThrow(dto.roleCodes);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId: user.id,
        },
      });

      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,

          roleId: role.id,
        })),
      });

      return tx.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },

        select: USER_DETAIL_SELECT,
      });
    });

    return this.mapUser(updated);
  }

  async resetPassword(
    userId: string,
    dto: ResetUserPasswordDto,
    actor: AuthenticatedUser,
  ): Promise<{
    success: true;
  }> {
    /**
     * Thay password bản thân sau này sẽ có
     * /auth/change-password riêng.
     */
    this.assertNotSelf(userId, actor.id);

    const user = await this.getByIdOrThrow(userId, actor.icdId);

    const passwordHash = await hashPassword(dto.password);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },

        data: {
          passwordHash,
        },
      });

      /**
       * Password thay đổi:
       * tất cả session cũ mất hiệu lực.
       */
      await tx.authSession.updateMany({
        where: {
          userId: user.id,

          revokedAt: null,
        },

        data: {
          revokedAt: now,
        },
      });
    });

    return {
      success: true,
    };
  }

  private async getByIdOrThrow(userId: string, icdId: string): Promise<UserDetailRecord> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,

        icdId,
      },

      select: USER_DETAIL_SELECT,
    });

    if (!user) {
      throw new NotFoundException({
        code: USER_ERROR_CODES.NOT_FOUND,

        message: 'Không tìm thấy người dùng.',
      });
    }

    return user;
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        email,

        ...(excludeUserId
          ? {
              id: {
                not: excludeUserId,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      throw this.emailInUse();
    }
  }

  private async getActiveRolesOrThrow(roleCodes: readonly string[]) {
    const roles = await this.prisma.role.findMany({
      where: {
        code: {
          in: [...roleCodes],
        },

        active: true,
      },

      select: {
        id: true,

        code: true,
      },
    });

    if (roles.length !== roleCodes.length) {
      throw new BadRequestException({
        code: USER_ERROR_CODES.ROLE_INVALID,

        message: 'Một hoặc nhiều role không tồn tại hoặc đã bị vô hiệu hóa.',
      });
    }

    return roles;
  }

  private assertNotSelf(targetUserId: string, actorUserId: string): void {
    if (targetUserId === actorUserId) {
      throw new ConflictException({
        code: USER_ERROR_CODES.SELF_MANAGEMENT_NOT_ALLOWED,

        message: 'Không thể thực hiện thao tác quản trị này trên chính tài khoản đang đăng nhập.',
      });
    }
  }

  private emailInUse(): ConflictException {
    return new ConflictException({
      code: USER_ERROR_CODES.EMAIL_IN_USE,

      message: 'Email đã được sử dụng.',
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return (
      (
        error as {
          code?: unknown;
        }
      ).code === 'P2002'
    );
  }

  private mapUser(user: UserDetailRecord) {
    return {
      id: user.id,

      icdId: user.icdId,

      name: user.name,

      email: user.email,

      active: user.active,

      roles: user.roles
        .map(({ role }) => ({
          id: role.id,

          code: role.code,

          name: role.name,

          active: role.active,
        }))
        .sort((first, second) => first.code.localeCompare(second.code)),

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,
    };
  }
}
