import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { MovementOrdersModule } from '../movement-orders/movement-orders.module';
import { TruckVisitsModule } from '../truck-visits/truck-visits.module';
import { EdiModule } from '../edi/edi.module';
import { GateInController } from './gate-in.controller';
import { GateInService } from './gate-in.service';
import { GateInPolicy } from './policies/gate-in.policy';

@Module({
  imports: [
    PrismaModule,
    ContainersModule,
    MovementOrdersModule,
    TruckVisitsModule,
    EdiModule,
  ],
  controllers: [GateInController],
  providers: [GateInService, GateInPolicy],
  exports: [GateInService, GateInPolicy],
})
export class GateInModule {}
