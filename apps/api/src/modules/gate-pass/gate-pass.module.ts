import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { ContainersModule } from '../containers/containers.module';
import { OperationalHoldsModule } from '../operational-holds/operational-holds.module';
import { YardModule } from '../yard/yard.module';
import { GatePassController } from './gate-pass.controller';
import { GatePassReadinessService } from './services/gate-pass-readiness.service';
import { GatePassService } from './services/gate-pass.service';

@Module({
  imports: [PrismaModule, ContainersModule, YardModule, OperationalHoldsModule, BillingModule],
  controllers: [GatePassController],
  providers: [GatePassService, GatePassReadinessService],
  exports: [GatePassService, GatePassReadinessService],
})
export class GatePassModule {}
