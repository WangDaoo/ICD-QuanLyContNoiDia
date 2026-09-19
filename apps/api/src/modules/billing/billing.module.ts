import { Module } from '@nestjs/common';
import { ContainersModule } from '../containers/containers.module';
import { BillingController } from './billing.controller';
import { TariffController } from './tariff.controller';
import { BillableQuantityCalculator } from './calculator/billable-quantity.calculator';
import { ServiceOrderPolicy } from './policies/service-order.policy';
import { TariffPolicy } from './policies/tariff.policy';
import { BillingCalculationService } from './services/billing-calculation.service';
import { ServiceOrderService } from './services/service-order.service';
import { TariffService } from './services/tariff.service';

@Module({
  imports: [ContainersModule],
  controllers: [
    TariffController,
    BillingController,
  ],
  providers: [
    TariffPolicy,
    ServiceOrderPolicy,
    BillableQuantityCalculator,
    TariffService,
    BillingCalculationService,
    ServiceOrderService,
  ],
  exports: [
    TariffService,
    BillingCalculationService,
    ServiceOrderService,
    BillableQuantityCalculator,
  ],
})
export class BillingModule {}
