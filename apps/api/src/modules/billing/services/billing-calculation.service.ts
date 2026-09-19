import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { BillableQuantityCalculator } from '../calculator/billable-quantity.calculator';
import { TariffPolicy } from '../policies/tariff.policy';
import { ServiceOrderPolicy } from '../policies/service-order.policy';
import { TariffService } from './tariff.service';

export interface CalculatedBillingItem {
  serviceTypeId: string;
  serviceCode: string;
  serviceName: string;
  unit: string;
  tariffRuleId: string | null;
  sourceType: string;
  sourceId: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  description: string;
}

export interface BillingCalculationResult {
  containerVisitId: string;
  containerNumber: string;
  size: string;
  type: string;
  consigneeId: string;
  consigneeName: string;
  tariffId: string;
  tariffName: string;
  asOfDate: Date;
  items: CalculatedBillingItem[];
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class BillingCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quantityCalculator: BillableQuantityCalculator,
    private readonly tariffPolicy: TariffPolicy,
    private readonly serviceOrderPolicy: ServiceOrderPolicy,
    private readonly tariffService: TariffService,
  ) {}

  async calculateBilling(
    containerVisitId: string,
    asOfDateInput: Date | string | undefined,
    tariffIdInput: string | undefined,
    actor: AuthenticatedUser,
    excludeOrderId?: string,
  ): Promise<BillingCalculationResult> {
    const asOfDate = asOfDateInput ? new Date(asOfDateInput) : new Date();

    const visit = await this.prisma.containerVisit.findFirst({
      where: {
        id: containerVisitId,
        icdId: actor.icdId,
      },
      include: {
        container: true,
        houseBl: {
          include: {
            consignee: true,
          },
        },
        reception: true,
        inspections: true,
        inYardBookings: true,
        yardMovements: true,
        serviceOrders: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.CONTAINER_NOT_BILLABLE,
        message: `Container visit with ID ${containerVisitId} not found`,
      });
    }

    const consigneeId = this.serviceOrderPolicy.assertContainerIsBillable(visit);
    const consigneeName = visit.houseBl?.consignee?.name ?? '';

    const tariff = await this.tariffService.getActiveTariffForDate(
      actor.icdId,
      asOfDate,
      tariffIdInput,
    );

    const serviceTypes = await this.prisma.serviceType.findMany({
      where: { active: true },
    });
    const serviceTypeMap = new Map(serviceTypes.map((st) => [st.code, st]));

    const billableItems = this.quantityCalculator.calculateBillableItems({
      visit,
      asOfDate,
      excludeOrderId,
    });

    const calculatedItems: CalculatedBillingItem[] = [];
    let subtotalAmount = 0;

    for (const billable of billableItems) {
      const serviceType = serviceTypeMap.get(billable.serviceCode);
      if (!serviceType) {
        throw new BadRequestException({
          code: BILLING_ERROR_CODES.SERVICE_TYPE_INVALID,
          message: `Service type definition missing for code: ${billable.serviceCode}`,
        });
      }

      const matchingRule = this.tariffPolicy.findMatchingRule(
        tariff.rules,
        serviceType.id,
        visit.container.size,
        visit.container.type,
      );

      const unitPrice = matchingRule ? Number(matchingRule.unitPrice) : 0;
      const amount = billable.quantity * unitPrice;
      subtotalAmount += amount;

      calculatedItems.push({
        serviceTypeId: serviceType.id,
        serviceCode: serviceType.code,
        serviceName: serviceType.name,
        unit: serviceType.unit,
        tariffRuleId: matchingRule?.id ?? null,
        sourceType: billable.sourceType,
        sourceId: billable.sourceId,
        quantity: billable.quantity,
        unitPrice,
        amount,
        description: billable.description,
      });
    }

    const vatRate = 0.1; // 10%
    const vatAmount = Math.round(subtotalAmount * vatRate);
    const totalAmount = subtotalAmount + vatAmount;

    return {
      containerVisitId: visit.id,
      containerNumber: visit.container.containerNumber,
      size: visit.container.size,
      type: visit.container.type,
      consigneeId,
      consigneeName,
      tariffId: tariff.id,
      tariffName: tariff.name,
      asOfDate,
      items: calculatedItems,
      subtotalAmount,
      vatRate,
      vatAmount,
      totalAmount,
      currency: 'VND',
    };
  }
}
