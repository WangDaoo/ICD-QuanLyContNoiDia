import { Injectable, NotFoundException } from '@nestjs/common';
import { ContainerVisitStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { BillingReadinessService } from '../../billing/services/billing-readiness.service';
import { OperationalHoldReadService } from '../../operational-holds/services/operational-hold-read.service';
import { YardReadinessService } from '../../yard/services/yard-readiness.service';
import {
  GATE_PASS_BLOCKER_CODES,
  GatePassBlockerCode,
} from '../constants/gate-pass-blocker-codes.constants';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';

export type GatePassReadinessMode = 'ISSUE' | 'GATE_OUT';

export interface GatePassReadinessResult {
  containerVisitId: string;
  isReady: boolean;
  blockers: GatePassBlockerCode[];
  details: {
    containerStatus: ContainerVisitStatus;
    yardLocation: { id: string; yardSlotId: string } | null;
    activeOperations: {
      movementCount: number;
      inspectionCount: number;
      bookingCount: number;
      hasActiveOperations: boolean;
    };
    inspectionHoldCount: number;
    activeHolds: {
      id: string;
      holdType: string;
      reason: string;
      placedAt: Date;
    }[];
    billing: {
      hasNoOrders: boolean;
      pendingOrders: {
        id: string;
        orderNumber: string;
        status: string;
      }[];
      unpaidInvoices: {
        id: string;
        invoiceNo: string;
        status: string;
        totalAmount: number;
        paidAmount: number;
        outstandingAmount: number;
      }[];
      unbilledServicesCount: number;
      billingConfigMissing: boolean;
    };
  };
}

@Injectable()
export class GatePassReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly yardReadinessService: YardReadinessService,
    private readonly operationalHoldReadService: OperationalHoldReadService,
    private readonly billingReadinessService: BillingReadinessService,
  ) {}

  async evaluateReadiness(
    visitId: string,
    actor: AuthenticatedUser,
    mode: GatePassReadinessMode = 'ISSUE',
    clientTx?: Prisma.TransactionClient,
  ): Promise<GatePassReadinessResult> {
    const db = clientTx ?? this.prisma;

    const visit = await db.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId: actor.icdId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: GATE_PASS_ERROR_CODES.CONTAINER_VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    const [yardData, activeHolds, billingData] = await Promise.all([
      this.yardReadinessService.checkWithDb(db, visit.id),
      this.operationalHoldReadService.findActiveWithDb(db, visit.id),
      this.billingReadinessService.checkWithDb(db as Prisma.TransactionClient, visit.id, actor),
    ]);

    const blockers: GatePassBlockerCode[] = [];

    // 1. Container state blocker
    if (mode === 'ISSUE') {
      if (visit.status !== ContainerVisitStatus.IN_YARD) {
        blockers.push(GATE_PASS_BLOCKER_CODES.CONTAINER_NOT_IN_YARD);
      }
    } else if (mode === 'GATE_OUT') {
      if (visit.status !== ContainerVisitStatus.GATE_PASS_ISSUED) {
        blockers.push(GATE_PASS_BLOCKER_CODES.CONTAINER_NOT_IN_YARD);
      }
    }

    // 2. Yard Position blocker
    if (!yardData.currentLocation) {
      blockers.push(GATE_PASS_BLOCKER_CODES.NO_YARD_POSITION);
    }

    // 3. Yard Active Operations blocker
    if (yardData.activeOperations.hasActiveOperations) {
      blockers.push(GATE_PASS_BLOCKER_CODES.ACTIVE_YARD_OPERATION);
    }

    // 4. Inspection Hold blocker
    if (yardData.inspectionHoldCount > 0) {
      blockers.push(GATE_PASS_BLOCKER_CODES.INSPECTION_HOLD);
    }

    // 5. Operational Hold blocker
    if (activeHolds.length > 0) {
      blockers.push(GATE_PASS_BLOCKER_CODES.OPERATIONAL_HOLD);
    }

    // 6. Billing blockers
    if (billingData.hasNoOrders) {
      blockers.push(GATE_PASS_BLOCKER_CODES.NO_BILLING);
    }

    if (billingData.pendingOrders.length > 0 || billingData.unpaidInvoices.length > 0) {
      blockers.push(GATE_PASS_BLOCKER_CODES.BILLING_INCOMPLETE);
    }

    if (billingData.billingConfigMissing) {
      blockers.push(GATE_PASS_BLOCKER_CODES.BILLING_CONFIGURATION_MISSING);
    }

    if (billingData.unbilledServicesCount > 0) {
      blockers.push(GATE_PASS_BLOCKER_CODES.UNBILLED_SERVICES);
    }

    const uniqueBlockers = Array.from(new Set(blockers));

    return {
      containerVisitId: visit.id,
      isReady: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      details: {
        containerStatus: visit.status,
        yardLocation: yardData.currentLocation,
        activeOperations: yardData.activeOperations,
        inspectionHoldCount: yardData.inspectionHoldCount,
        activeHolds,
        billing: billingData,
      },
    };
  }
}
