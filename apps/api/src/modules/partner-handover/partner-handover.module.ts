import { Module } from '@nestjs/common';
import { CustomerWarehouseController } from './controllers/internal/customer-warehouse.controller';
import { PartnerClientController } from './controllers/internal/partner-client.controller';
import { TransportHandoverController } from './controllers/internal/transport-handover.controller';
import { ExternalHandoversController } from './external/controllers/external-handovers.controller';
import { PartnerExternalExceptionFilter } from './external/filters/partner-external-exception.filter';
import { PartnerApiKeyGuard } from './external/guards/partner-api-key.guard';
import { PartnerScopeGuard } from './external/guards/partner-scope.guard';
import { PartnerReadLogInterceptor } from './external/interceptors/partner-read-log.interceptor';
import { ExternalHandoverCommandService } from './external/services/external-handover-command.service';
import { ExternalHandoverQueryService } from './external/services/external-handover-query.service';
import { PartnerApiAuthService } from './external/services/partner-api-auth.service';
import { PartnerApiCommandExecutorService } from './external/services/partner-api-command-executor.service';
import { PartnerApiIdempotencyService } from './external/services/partner-api-idempotency.service';
import { CustomerWarehouseService } from './services/customer-warehouse.service';
import { HandoverService } from './services/handover.service';
import { PartnerApiLogService } from './services/partner-api-log.service';
import { PartnerClientService } from './services/partner-client.service';

@Module({
  controllers: [
    PartnerClientController,
    CustomerWarehouseController,
    TransportHandoverController,
    ExternalHandoversController,
  ],
  providers: [
    PartnerClientService,
    CustomerWarehouseService,
    HandoverService,
    PartnerApiLogService,
    PartnerApiAuthService,
    PartnerApiKeyGuard,
    PartnerScopeGuard,
    PartnerExternalExceptionFilter,
    PartnerReadLogInterceptor,
    PartnerApiIdempotencyService,
    PartnerApiCommandExecutorService,
    ExternalHandoverQueryService,
    ExternalHandoverCommandService,
  ],
  exports: [
    PartnerClientService,
    CustomerWarehouseService,
    HandoverService,
    PartnerApiLogService,
    PartnerApiAuthService,
    ExternalHandoverQueryService,
    ExternalHandoverCommandService,
  ],
})
export class PartnerHandoverModule {}

