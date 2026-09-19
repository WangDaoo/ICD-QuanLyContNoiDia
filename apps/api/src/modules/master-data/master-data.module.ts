import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';

import { ShippingLinesController } from './controllers/shipping-lines.controller';

import { ConsigneesController } from './controllers/consignees.controller';

import { ClearingAgentsController } from './controllers/clearing-agents.controller';

import { TransportersController } from './controllers/transporters.controller';

import { ShippingLineService } from './services/shipping-line.service';

import { ConsigneeService } from './services/consignee.service';

import { ClearingAgentService } from './services/clearing-agent.service';

import { TransporterService } from './services/transporter.service';

@Module({
  imports: [PrismaModule],

  controllers: [
    ShippingLinesController,
    ConsigneesController,
    ClearingAgentsController,
    TransportersController,
  ],

  providers: [ShippingLineService, ConsigneeService, ClearingAgentService, TransporterService],

  exports: [ShippingLineService, ConsigneeService, ClearingAgentService, TransporterService],
})
export class MasterDataModule {}
