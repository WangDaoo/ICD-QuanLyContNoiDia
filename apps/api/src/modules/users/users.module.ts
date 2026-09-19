import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';

import { UserService } from './user.service';

import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule],

  controllers: [UsersController],

  providers: [UserService],

  exports: [UserService],
})
export class UsersModule {}
