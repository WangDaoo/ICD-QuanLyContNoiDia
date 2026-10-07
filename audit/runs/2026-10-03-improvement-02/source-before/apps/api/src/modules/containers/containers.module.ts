import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersController } from './containers.controller';
import { ContainersService } from './containers.service';
import { ContainerStatePolicy } from './policies/container-state.policy';
import { ContainerEventService } from './services/container-event.service';
import { ContainerVisitTransitionService } from './services/container-visit-transition.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContainersController],
  providers: [
    ContainersService,
    ContainerStatePolicy,
    ContainerEventService,
    ContainerVisitTransitionService,
  ],
  exports: [
    ContainersService,
    ContainerStatePolicy,
    ContainerEventService,
    ContainerVisitTransitionService,
  ],
})
export class ContainersModule {}
