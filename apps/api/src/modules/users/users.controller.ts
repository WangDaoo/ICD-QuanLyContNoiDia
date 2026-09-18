import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import {
  PERMISSION_CODES,
} from '../../common/constants/permission-codes.constants';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

import {
  Permissions,
} from '../../common/decorators/permissions.decorator';

import type {
  AuthenticatedUser,
} from '../../common/types/authenticated-user.types';

import {
  CreateUserDto,
} from './dto/create-user.dto';

import {
  QueryUsersDto,
} from './dto/query-users.dto';

import {
  ReplaceUserRolesDto,
} from './dto/replace-user-roles.dto';

import {
  ResetUserPasswordDto,
} from './dto/reset-user-password.dto';

import {
  UpdateUserDto,
} from './dto/update-user.dto';

import {
  UpdateUserStatusDto,
} from './dto/update-user-status.dto';

import {
  UserService,
} from './user.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userService:
      UserService,
  ) {}

  @Permissions(
    PERMISSION_CODES.USERS_READ,
  )
  @Get()
  findMany(
    @Query()
    query: QueryUsersDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.userService
      .findMany(
        query,
        actor,
      );
  }

  @Permissions(
    PERMISSION_CODES.USERS_READ,
  )
  @Get(':userId')
  async findById(
    @Param('userId')
    userId: string,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    const user =
      await this.userService
        .findById(
          userId,
          actor,
        );

    return {
      data: user,
    };
  }

  @Permissions(
    PERMISSION_CODES.USERS_MANAGE,
  )
  @Post()
  async create(
    @Body()
    dto: CreateUserDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    const user =
      await this.userService
        .create(
          dto,
          actor,
        );

    return {
      data: user,
    };
  }

  @Permissions(
    PERMISSION_CODES.USERS_MANAGE,
  )
  @Patch(':userId')
  async update(
    @Param('userId')
    userId: string,

    @Body()
    dto: UpdateUserDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    const user =
      await this.userService
        .update(
          userId,
          dto,
          actor,
        );

    return {
      data: user,
    };
  }

  @Permissions(
    PERMISSION_CODES.USERS_MANAGE,
  )
  @Patch(':userId/status')
  async updateStatus(
    @Param('userId')
    userId: string,

    @Body()
    dto: UpdateUserStatusDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    const user =
      await this.userService
        .updateStatus(
          userId,
          dto,
          actor,
        );

    return {
      data: user,
    };
  }

  @Permissions(
    PERMISSION_CODES.USERS_MANAGE,
  )
  @Put(':userId/roles')
  async replaceRoles(
    @Param('userId')
    userId: string,

    @Body()
    dto: ReplaceUserRolesDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    const user =
      await this.userService
        .replaceRoles(
          userId,
          dto,
          actor,
        );

    return {
      data: user,
    };
  }

  @Permissions(
    PERMISSION_CODES.USERS_MANAGE,
  )
  @Put(':userId/password')
  resetPassword(
    @Param('userId')
    userId: string,

    @Body()
    dto: ResetUserPasswordDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.userService
      .resetPassword(
        userId,
        dto,
        actor,
      );
  }
}
