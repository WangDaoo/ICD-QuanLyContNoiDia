import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  PERMISSION_CODES,
} from '../../common/constants/permission-codes.constants';

import {
  Permissions,
} from '../../common/decorators/permissions.decorator';

import {
  RoleService,
} from './role.service';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly roleService:
      RoleService,
  ) {}

  @Permissions(
    PERMISSION_CODES.ROLES_READ,
  )
  @Get()
  async findMany() {
    const permissions =
      await this.roleService
        .findPermissions();

    return {
      data: permissions,
    };
  }
}
