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
  ContainersModule,
} from './modules/containers/containers.module';

import {
  HealthModule,
} from './modules/health/health.module';

import {
  ManifestsModule,
} from './modules/manifests/manifests.module';

import {
  MasterDataModule,
} from './modules/master-data/master-data.module';

import {
  MovementOrdersModule,
} from './modules/movement-orders/movement-orders.module';

import {
  RolesModule,
} from './modules/roles/roles.module';

import {
  TruckVisitsModule,
} from './modules/truck-visits/truck-visits.module';

import {
  GateInModule,
} from './modules/gate-in/gate-in.module';

import {
  YardModule,
} from './modules/yard/yard.module';

import {
  BillingModule,
} from './modules/billing/billing.module';

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

    ManifestsModule,

    ContainersModule,

    MovementOrdersModule,

    TruckVisitsModule,

    GateInModule,

    YardModule,

    BillingModule,
  ],
})
export class AppModule {}

