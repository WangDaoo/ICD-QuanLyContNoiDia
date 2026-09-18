import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  validateEnvironment,
} from './config/env.validation';

import {
  AuthModule,
} from './modules/auth/auth.module';

import {
  HealthModule,
} from './modules/health/health.module';

import {
  MasterDataModule,
} from './modules/master-data/master-data.module';

import {
  RolesModule,
} from './modules/roles/roles.module';

import {
  UsersModule,
} from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: [
        '../../.env',
      ],

      validate:
        validateEnvironment,
    }),

    AuthModule,

    HealthModule,

    UsersModule,

    RolesModule,

    MasterDataModule,
  ],
})
export class AppModule {}

