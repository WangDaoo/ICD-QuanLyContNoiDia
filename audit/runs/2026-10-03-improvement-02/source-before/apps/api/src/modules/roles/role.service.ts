import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ROLE_CODES } from '../../common/constants/role-codes.constants';

import { Prisma } from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { ROLE_ERROR_CODES } from './constants/role-error-codes.constants';

import type { CreateRoleDto } from './dto/create-role.dto';

import type { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';

import type { UpdateRoleDto } from './dto/update-role.dto';

const ROLE_DETAIL_SELECT = {
  id: true,

  code: true,

  name: true,

  description: true,

  active: true,

  createdAt: true,

  updatedAt: true,

  permissions: {
    select: {
      permission: {
        select: {
          id: true,

          code: true,

          name: true,

          description: true,

          active: true,
        },
      },
    },
  },

  _count: {
    select: {
      users: true,
    },
  },
} satisfies Prisma.RoleSelect;

type RoleDetailRecord = Prisma.RoleGetPayload<{
  select: typeof ROLE_DETAIL_SELECT;
}>;

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,

        code: true,

        name: true,

        description: true,

        active: true,

        createdAt: true,

        updatedAt: true,

        _count: {
          select: {
            users: true,

            permissions: true,
          },
        },
      },

      orderBy: {
        code: 'asc',
      },
    });

    return roles.map((role) => ({
      id: role.id,

      code: role.code,

      name: role.name,

      description: role.description,

      active: role.active,

      userCount: role._count.users,

      permissionCount: role._count.permissions,

      createdAt: role.createdAt,

      updatedAt: role.updatedAt,
    }));
  }

  async findById(roleId: string) {
    const role = await this.getByIdOrThrow(roleId);

    return this.mapRole(role);
  }

  async findPermissions() {
    return this.prisma.permission.findMany({
      select: {
        id: true,

        code: true,

        name: true,

        description: true,

        active: true,

        createdAt: true,

        updatedAt: true,
      },

      orderBy: {
        code: 'asc',
      },
    });
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: {
        code: dto.code,
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      throw this.codeInUse();
    }

    try {
      const role = await this.prisma.role.create({
        data: {
          code: dto.code,

          name: dto.name,

          description: dto.description,

          active: true,
        },

        select: ROLE_DETAIL_SELECT,
      });

      return this.mapRole(role);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw this.codeInUse();
      }

      throw error;
    }
  }

  async update(roleId: string, dto: UpdateRoleDto) {
    if (dto.name === undefined && dto.description === undefined && dto.active === undefined) {
      throw new BadRequestException({
        code: ROLE_ERROR_CODES.UPDATE_EMPTY,

        message: 'Không có dữ liệu cần cập nhật.',
      });
    }

    const role = await this.getByIdOrThrow(roleId);

    /**
     * ADMIN là system role bắt buộc.
     *
     * Không cho deactivate.
     */
    if (role.code === ROLE_CODES.ADMIN && dto.active === false) {
      throw this.systemRoleProtected();
    }

    const updated = await this.prisma.role.update({
      where: {
        id: role.id,
      },

      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name,
            }
          : {}),

        ...(dto.description !== undefined
          ? {
              description: dto.description,
            }
          : {}),

        ...(dto.active !== undefined
          ? {
              active: dto.active,
            }
          : {}),
      },

      select: ROLE_DETAIL_SELECT,
    });

    return this.mapRole(updated);
  }

  async replacePermissions(roleId: string, dto: ReplaceRolePermissionsDto) {
    const role = await this.getByIdOrThrow(roleId);

    /**
     * ADMIN luôn nhận toàn bộ permission catalog.
     *
     * Không cho chỉnh thủ công để tránh
     * tự khóa quyền quản trị hệ thống.
     */
    if (role.code === ROLE_CODES.ADMIN) {
      throw this.systemRoleProtected();
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [...dto.permissionCodes],
        },

        active: true,
      },

      select: {
        id: true,

        code: true,
      },
    });

    if (permissions.length !== dto.permissionCodes.length) {
      throw new BadRequestException({
        code: ROLE_ERROR_CODES.PERMISSION_INVALID,

        message: 'Một hoặc nhiều permission không tồn tại hoặc đã bị vô hiệu hóa.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,

            permissionId: permission.id,
          })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: {
          id: role.id,
        },

        select: ROLE_DETAIL_SELECT,
      });
    });

    return this.mapRole(updated);
  }

  private async getByIdOrThrow(roleId: string): Promise<RoleDetailRecord> {
    const role = await this.prisma.role.findUnique({
      where: {
        id: roleId,
      },

      select: ROLE_DETAIL_SELECT,
    });

    if (!role) {
      throw new NotFoundException({
        code: ROLE_ERROR_CODES.NOT_FOUND,

        message: 'Không tìm thấy role.',
      });
    }

    return role;
  }

  private mapRole(role: RoleDetailRecord) {
    return {
      id: role.id,

      code: role.code,

      name: role.name,

      description: role.description,

      active: role.active,

      userCount: role._count.users,

      permissions: role.permissions
        .map(({ permission }) => ({
          id: permission.id,

          code: permission.code,

          name: permission.name,

          description: permission.description,

          active: permission.active,
        }))
        .sort((first, second) => first.code.localeCompare(second.code)),

      createdAt: role.createdAt,

      updatedAt: role.updatedAt,
    };
  }

  private codeInUse(): ConflictException {
    return new ConflictException({
      code: ROLE_ERROR_CODES.CODE_IN_USE,

      message: 'Role code đã tồn tại.',
    });
  }

  private systemRoleProtected(): ConflictException {
    return new ConflictException({
      code: ROLE_ERROR_CODES.SYSTEM_ROLE_PROTECTED,

      message: 'ADMIN là system role được bảo vệ và không được thực hiện thao tác này.',
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
}
