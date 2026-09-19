import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';

import { PermissionsController } from './permissions.controller';

import { RoleService } from './role.service';

import { RolesController } from './roles.controller';

@Module({
  imports: [PrismaModule],

  controllers: [RolesController, PermissionsController],

  providers: [RoleService],

  exports: [RoleService],
})
export class RolesModule {}
