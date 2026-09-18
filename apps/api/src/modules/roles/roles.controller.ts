import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import {
  PERMISSION_CODES,
} from '../../common/constants/permission-codes.constants';

import {
  Permissions,
} from '../../common/decorators/permissions.decorator';

import {
  CreateRoleDto,
} from './dto/create-role.dto';

import {
  ReplaceRolePermissionsDto,
} from './dto/replace-role-permissions.dto';

import {
  UpdateRoleDto,
} from './dto/update-role.dto';

import {
  RoleService,
} from './role.service';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly roleService:
      RoleService,
  ) {}

  @Permissions(
    PERMISSION_CODES.ROLES_READ,
  )
  @Get()
  async findMany() {
    const roles =
      await this.roleService
        .findMany();

    return {
      data: roles,
    };
  }

  @Permissions(
    PERMISSION_CODES.ROLES_READ,
  )
  @Get(':roleId')
  async findById(
    @Param('roleId')
    roleId: string,
  ) {
    const role =
      await this.roleService
        .findById(
          roleId,
        );

    return {
      data: role,
    };
  }

  @Permissions(
    PERMISSION_CODES.ROLES_MANAGE,
  )
  @Post()
  async create(
    @Body()
    dto: CreateRoleDto,
  ) {
    const role =
      await this.roleService
        .create(
          dto,
        );

    return {
      data: role,
    };
  }

  @Permissions(
    PERMISSION_CODES.ROLES_MANAGE,
  )
  @Patch(':roleId')
  async update(
    @Param('roleId')
    roleId: string,

    @Body()
    dto: UpdateRoleDto,
  ) {
    const role =
      await this.roleService
        .update(
          roleId,
          dto,
        );

    return {
      data: role,
    };
  }

  @Permissions(
    PERMISSION_CODES.ROLES_MANAGE,
  )
  @Put(':roleId/permissions')
  async replacePermissions(
    @Param('roleId')
    roleId: string,

    @Body()
    dto:
      ReplaceRolePermissionsDto,
  ) {
    const role =
      await this.roleService
        .replacePermissions(
          roleId,
          dto,
        );

    return {
      data: role,
    };
  }
}
