import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { TruckVisitStatePolicy } from './policies/truck-visit-state.policy';
import { TruckVisitTransitionService } from './services/truck-visit-transition.service';
import { TruckVisitService } from './truck-visit.service';
import { TruckVisitsController } from './truck-visits.controller';

@Module({
  imports: [PrismaModule, ContainersModule],
  controllers: [TruckVisitsController],
  providers: [TruckVisitService, TruckVisitTransitionService, TruckVisitStatePolicy],
  exports: [TruckVisitService, TruckVisitTransitionService, TruckVisitStatePolicy],
})
export class TruckVisitsModule {}
