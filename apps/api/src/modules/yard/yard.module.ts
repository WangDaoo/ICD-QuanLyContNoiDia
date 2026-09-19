import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { ContainerInspectionPolicy } from './policies/container-inspection.policy';
import { InYardBookingPolicy } from './policies/in-yard-booking.policy';
import { YardAssignmentPolicy } from './policies/yard-assignment.policy';
import { YardMovementPolicy } from './policies/yard-movement.policy';
import { ContainerInspectionService } from './services/container-inspection.service';
import { InYardBookingService } from './services/in-yard-booking.service';
import { YardAssignmentService } from './services/yard-assignment.service';
import { YardCatalogService } from './services/yard-catalog.service';
import { YardLocationService } from './services/yard-location.service';
import { YardMovementService } from './services/yard-movement.service';
import { YardOperationReadService } from './services/yard-operation-read.service';
import { YardReadinessService } from './services/yard-readiness.service';
import { YardController } from './yard.controller';
import { MlClient } from './recommendation/ml-client.client';
import { YardRecommendationService } from './recommendation/yard-recommendation.service';

@Module({
  imports: [PrismaModule, ContainersModule],
  controllers: [YardController],
  providers: [
    YardAssignmentPolicy,
    YardMovementPolicy,
    ContainerInspectionPolicy,
    InYardBookingPolicy,
    YardCatalogService,
    YardLocationService,
    YardAssignmentService,
    YardMovementService,
    ContainerInspectionService,
    InYardBookingService,
    YardOperationReadService,
    YardReadinessService,
    MlClient,
    YardRecommendationService,
  ],
  exports: [
    YardAssignmentPolicy,
    YardMovementPolicy,
    ContainerInspectionPolicy,
    InYardBookingPolicy,
    YardLocationService,
    YardAssignmentService,
    YardMovementService,
    ContainerInspectionService,
    InYardBookingService,
    YardOperationReadService,
    YardReadinessService,
    MlClient,
    YardRecommendationService,
  ],
})
export class YardModule {}
