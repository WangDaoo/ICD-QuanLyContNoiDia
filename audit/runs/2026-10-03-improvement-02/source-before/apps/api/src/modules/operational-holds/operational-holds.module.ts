import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { OperationalHoldsController } from './operational-holds.controller';
import { OperationalHoldReadService } from './services/operational-hold-read.service';
import { OperationalHoldService } from './services/operational-hold.service';

@Module({
  imports: [PrismaModule, ContainersModule],
  controllers: [OperationalHoldsController],
  providers: [OperationalHoldService, OperationalHoldReadService],
  exports: [OperationalHoldService, OperationalHoldReadService],
})
export class OperationalHoldsModule {}
