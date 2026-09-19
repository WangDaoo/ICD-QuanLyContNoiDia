import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { MovementOrdersController } from './movement-orders.controller';
import { MovementOrdersService } from './movement-orders.service';
import { MovementOrderStatePolicy } from './policies/movement-order-state.policy';

@Module({
  imports: [PrismaModule, ContainersModule],
  controllers: [MovementOrdersController],
  providers: [MovementOrdersService, MovementOrderStatePolicy],
  exports: [MovementOrdersService, MovementOrderStatePolicy],
})
export class MovementOrdersModule {}
