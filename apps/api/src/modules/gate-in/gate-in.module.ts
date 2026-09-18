import { Module } from '@nestjs/common';

import { ContainersModule } from '../containers/containers.module';
import { MovementOrdersModule } from '../movement-orders/movement-orders.module';
import { TruckVisitsModule } from '../truck-visits/truck-visits.module';
import { GateInController } from './gate-in.controller';
import { GateInService } from './gate-in.service';
import { GateInPolicy } from './policies/gate-in.policy';

@Module({
  imports: [ContainersModule, MovementOrdersModule, TruckVisitsModule],
  controllers: [GateInController],
  providers: [GateInService, GateInPolicy],
  exports: [GateInService, GateInPolicy],
})
export class GateInModule {}
