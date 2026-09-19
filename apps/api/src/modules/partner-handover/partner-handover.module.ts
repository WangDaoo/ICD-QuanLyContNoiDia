import { Module } from '@nestjs/common';
import { CustomerWarehouseController } from './controllers/internal/customer-warehouse.controller';
import { PartnerClientController } from './controllers/internal/partner-client.controller';
import { TransportHandoverController } from './controllers/internal/transport-handover.controller';
import { CustomerWarehouseService } from './services/customer-warehouse.service';
import { HandoverService } from './services/handover.service';
import { PartnerApiLogService } from './services/partner-api-log.service';
import { PartnerClientService } from './services/partner-client.service';

@Module({
  controllers: [
    PartnerClientController,
    CustomerWarehouseController,
    TransportHandoverController,
  ],
  providers: [
    PartnerClientService,
    CustomerWarehouseService,
    HandoverService,
    PartnerApiLogService,
  ],
  exports: [
    PartnerClientService,
    CustomerWarehouseService,
    HandoverService,
    PartnerApiLogService,
  ],
})
export class PartnerHandoverModule {}
