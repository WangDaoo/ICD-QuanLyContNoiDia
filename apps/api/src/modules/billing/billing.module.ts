import { Module } from '@nestjs/common';
import { ContainersModule } from '../containers/containers.module';
import { BillingController } from './billing.controller';
import { BillingReadinessController } from './billing-readiness.controller';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { TariffController } from './tariff.controller';
import { BillableQuantityCalculator } from './calculator/billable-quantity.calculator';
import { ServiceOrderPolicy } from './policies/service-order.policy';
import { TariffPolicy } from './policies/tariff.policy';
import { BillingCalculationService } from './services/billing-calculation.service';
import { BillingReadinessService } from './services/billing-readiness.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { ServiceOrderService } from './services/service-order.service';
import { TariffService } from './services/tariff.service';

@Module({
  imports: [ContainersModule],
  controllers: [
    TariffController,
    BillingController,
    InvoicesController,
    PaymentsController,
    BillingReadinessController,
  ],
  providers: [
    TariffPolicy,
    ServiceOrderPolicy,
    BillableQuantityCalculator,
    TariffService,
    BillingCalculationService,
    ServiceOrderService,
    InvoiceService,
    PaymentService,
    BillingReadinessService,
  ],
  exports: [
    TariffService,
    BillingCalculationService,
    ServiceOrderService,
    InvoiceService,
    PaymentService,
    BillingReadinessService,
    BillableQuantityCalculator,
  ],
})
export class BillingModule {}
