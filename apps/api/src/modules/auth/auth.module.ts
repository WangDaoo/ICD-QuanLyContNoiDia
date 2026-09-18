import {
  Module,
} from '@nestjs/common';

import {
  APP_GUARD,
} from '@nestjs/core';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  PrismaModule,
} from '../../database/prisma.module';

import {
  AuthController,
} from './auth.controller';

import {
  AuthService,
} from './auth.service';

import {
  JwtAuthGuard,
} from './guards/jwt-auth.guard';

import {
  PermissionsGuard,
} from './guards/permissions.guard';

import {
  TokenService,
} from './services/token.service';

@Module({
  imports: [
    PrismaModule,

    /**
     * Secret không đăng ký global tại đây
     * vì Access và Refresh dùng secret khác nhau.
     */
    JwtModule.register({}),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,

    TokenService,

    /**
     * Thứ tự guard:
     *
     * 1. Authentication
     * 2. Authorization
     */
    {
      provide:
        APP_GUARD,

      useClass:
        JwtAuthGuard,
    },

    {
      provide:
        APP_GUARD,

      useClass:
        PermissionsGuard,
    },
  ],

  exports: [
    AuthService,
  ],
})
export class AuthModule {}
