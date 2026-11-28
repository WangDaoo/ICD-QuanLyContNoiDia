import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { createThrottlerOptions } from './common/security/throttler-options';
import { type EnvironmentVariables, validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';

import { AuthModule } from './modules/auth/auth.module';

import { ContainersModule } from './modules/containers/containers.module';

import { HealthModule } from './modules/health/health.module';

import { ManifestsModule } from './modules/manifests/manifests.module';

import { MasterDataModule } from './modules/master-data/master-data.module';

import { MovementOrdersModule } from './modules/movement-orders/movement-orders.module';

import { RolesModule } from './modules/roles/roles.module';

import { TruckVisitsModule } from './modules/truck-visits/truck-visits.module';

import { GateInModule } from './modules/gate-in/gate-in.module';

import { YardModule } from './modules/yard/yard.module';

import { BillingModule } from './modules/billing/billing.module';

import { OperationalHoldsModule } from './modules/operational-holds/operational-holds.module';

import { GatePassModule } from './modules/gate-pass/gate-pass.module';

import { GateOutModule } from './modules/gate-out/gate-out.module';

import { UsersModule } from './modules/users/users.module';

import { RequestContextModule } from './common/request-context/request-context.module';

import { AuditModule } from './modules/audit/audit.module';

import { WorkQueueModule } from './modules/work-queue/work-queue.module';

import { EdiModule } from './modules/edi/edi.module';

import { ReportsModule } from './modules/reports/reports.module';

import { PartnerHandoverModule } from './modules/partner-handover/partner-handover.module';

import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: ['../../.env'],

      validate: validateEnvironment,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createThrottlerOptions({
          ttlMs: config.get('API_THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('API_THROTTLE_LIMIT', { infer: true }),
          authLimit: config.get('AUTH_THROTTLE_LIMIT', { infer: true }),
        }),
    }),

    // Registered once for the whole app: each forRoot() import re-registers every @Cron handler.
    ScheduleModule.forRoot(),

    RequestContextModule,

    PrismaModule,

    AuditModule,

    WorkQueueModule,

    EdiModule,

    ReportsModule,

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

    OperationalHoldsModule,

    GatePassModule,

    GateOutModule,

    PartnerHandoverModule,

    NotificationsModule,

    SettingsModule,

    // Kênh SSE đẩy thông báo thay đổi dữ liệu cho Web và Mobile.
    RealtimeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
