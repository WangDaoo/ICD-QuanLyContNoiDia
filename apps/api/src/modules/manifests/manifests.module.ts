import { Module } from '@nestjs/common';

import { HouseBlsController } from './controllers/house-bls.controller';

import { ManifestsController } from './controllers/manifests.controller';

import { MasterBlsController } from './controllers/master-bls.controller';

import { HouseBlService } from './services/house-bl.service';

import { ManifestService } from './services/manifest.service';

import { MasterBlService } from './services/master-bl.service';

@Module({
  controllers: [ManifestsController, MasterBlsController, HouseBlsController],
  providers: [ManifestService, MasterBlService, HouseBlService],
  exports: [ManifestService, MasterBlService, HouseBlService],
})
export class ManifestsModule {}
