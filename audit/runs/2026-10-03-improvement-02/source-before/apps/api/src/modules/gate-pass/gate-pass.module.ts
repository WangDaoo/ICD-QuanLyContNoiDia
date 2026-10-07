import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { ContainersModule } from '../containers/containers.module';
import { OperationalHoldsModule } from '../operational-holds/operational-holds.module';
import { YardModule } from '../yard/yard.module';
import { GatePassController } from './gate-pass.controller';
import { GatePassLookupService } from './services/gate-pass-lookup.service';
import { GatePassReadinessService } from './services/gate-pass-readiness.service';
import { GatePassScanService } from './services/gate-pass-scan.service';
import { GatePassTokenService } from './services/gate-pass-token.service';
import { GatePassTransitionService } from './services/gate-pass-transition.service';
import { GatePassService } from './services/gate-pass.service';

@Module({
  imports: [PrismaModule, ContainersModule, YardModule, OperationalHoldsModule, BillingModule],
  controllers: [GatePassController],
  providers: [
    GatePassService,
    GatePassTokenService,
    GatePassReadinessService,
    GatePassLookupService,
    GatePassTransitionService,
    GatePassScanService,
  ],
  exports: [
    GatePassService,
    GatePassTokenService,
    GatePassReadinessService,
    GatePassLookupService,
    GatePassTransitionService,
    GatePassScanService,
  ],
})
export class GatePassModule {}
