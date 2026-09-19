import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { YardAssignmentPolicy } from './policies/yard-assignment.policy';
import { YardAssignmentService } from './services/yard-assignment.service';
import { YardCatalogService } from './services/yard-catalog.service';
import { YardLocationService } from './services/yard-location.service';
import { YardController } from './yard.controller';

@Module({
  imports: [
    PrismaModule,
    ContainersModule,
  ],
  controllers: [
    YardController,
  ],
  providers: [
    YardAssignmentPolicy,
    YardCatalogService,
    YardLocationService,
    YardAssignmentService,
  ],
  exports: [
    YardAssignmentPolicy,
    YardLocationService,
    YardAssignmentService,
  ],
})
export class YardModule {}
