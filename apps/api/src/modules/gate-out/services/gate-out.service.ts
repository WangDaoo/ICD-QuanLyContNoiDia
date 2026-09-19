import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  GatePassStatus,
} from '../../../generated/prisma/client';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { ContainerVisitTransitionService } from '../../containers/services/container-visit-transition.service';
import { GATE_PASS_ERROR_CODES } from '../../gate-pass/constants/gate-pass-error-codes.constants';
import { GatePassLookupService } from '../../gate-pass/services/gate-pass-lookup.service';
import { GatePassReadinessService } from '../../gate-pass/services/gate-pass-readiness.service';
import { GatePassTransitionService } from '../../gate-pass/services/gate-pass-transition.service';
import { YardLocationService } from '../../yard/services/yard-location.service';
import { EdiOutboxService } from '../../edi/services/edi-outbox.service';
import { GATE_OUT_ERROR_CODES } from '../constants/gate-out-error-codes.constants';
import { ConfirmGateOutDto } from '../dto/confirm-gate-out.dto';

@Injectable()
export class GateOutService {
  private readonly logger = new Logger(GateOutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lookupService: GatePassLookupService,
    private readonly gatePassTransitionService: GatePassTransitionService,
    private readonly containerTransitionService: ContainerVisitTransitionService,
    private readonly readinessService: GatePassReadinessService,
    private readonly yardLocationService: YardLocationService,
    private readonly eventService: ContainerEventService,
    private readonly ediOutboxService: EdiOutboxService,
  ) {}

  async confirmGateOut(dto: ConfirmGateOutDto, actor: AuthenticatedUser) {
    const target = await this.lookupService.findTargetByQrTokenOrThrow(
      dto.qrToken,
      actor.icdId,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock ContainerVisit first
      const visit = await this.containerTransitionService.lockForGateOut(
        tx,
        target.containerVisitId,
        actor.icdId,
      );

      // 2. Lock GatePass next
      const gatePass = await this.gatePassTransitionService.lockAndGetOrThrow(
        tx,
        target.id,
        target.containerVisitId,
        actor.icdId,
      );

      const now = new Date();

      // 3. Expiration Check
      if (gatePass.status === GatePassStatus.ACTIVE && gatePass.expiresAt <= now) {
        await this.gatePassTransitionService.markExpired(tx, gatePass.id);
        await this.containerTransitionService.restoreInYardAfterGatePassClosed(tx, {
          visitId: visit.id,
          icdId: actor.icdId,
        });

        await this.eventService.record(tx, {
          containerVisitId: visit.id,
          eventType: CONTAINER_EVENT_TYPES.GATE_PASS_EXPIRED,
          fromStatus: ContainerVisitStatus.GATE_PASS_ISSUED,
          toStatus: ContainerVisitStatus.IN_YARD,
          actorUserId: actor.id,
          referenceType: 'GATE_PASS',
          referenceId: gatePass.id,
          metadataJson: {
            gatePassCode: gatePass.code,
            expiredAt: gatePass.expiresAt.toISOString(),
          },
        });

        throw new ConflictException({
          code: GATE_PASS_ERROR_CODES.EXPIRED,
          message: 'Phiếu ra cổng đã hết hạn.',
        });
      }

      // 4. Status validations
      if (gatePass.status === GatePassStatus.USED) {
        throw new ConflictException({
          code: GATE_PASS_ERROR_CODES.ALREADY_USED,
          message: 'Phiếu ra cổng đã được sử dụng.',
        });
      }

      if (gatePass.status !== GatePassStatus.ACTIVE) {
        throw new ConflictException({
          code: GATE_PASS_ERROR_CODES.INVALID_STATE,
          message: 'Trạng thái Phiếu ra cổng không hợp lệ.',
        });
      }

      if (visit.status !== ContainerVisitStatus.GATE_PASS_ISSUED) {
        throw new ConflictException({
          code: GATE_OUT_ERROR_CODES.CONTAINER_INVALID_STATE,
          message: 'Container Visit không ở trạng thái GATE_PASS_ISSUED.',
        });
      }

      // 5. Re-check readiness blockers at point of gate-out
      const readiness = await this.readinessService.checkWithDb(
        tx,
        visit.id,
        actor.icdId,
        'GATE_OUT',
      );

      if (!readiness.ready || readiness.blockers.length > 0) {
        throw new ConflictException({
          code: GATE_OUT_ERROR_CODES.NOT_READY,
          message: 'Container chưa đủ điều kiện ra cổng.',
          blockers: readiness.blockers,
        });
      }

      // 6. State transitions
      await this.gatePassTransitionService.markUsed(tx, gatePass.id, now);
      await this.containerTransitionService.exitByGateOut(tx, {
        visitId: visit.id,
        icdId: actor.icdId,
        gateOutAt: now,
      });

      // 7. Close Yard Location Log & update current location
      await this.yardLocationService.closeCurrentLocation(tx, visit.id, now);
      await tx.containerVisit.update({
        where: { id: visit.id },
        data: {
          currentLocation: null,
        },
      });

      // 8. Record GATE_OUT event
      await this.eventService.record(tx, {
        containerVisitId: visit.id,
        eventType: CONTAINER_EVENT_TYPES.GATE_OUT,
        fromStatus: ContainerVisitStatus.GATE_PASS_ISSUED,
        toStatus: ContainerVisitStatus.EXITED,
        actorUserId: actor.id,
        referenceType: 'GATE_PASS',
        referenceId: gatePass.id,
        metadataJson: {
          gatePassCode: gatePass.code,
          gateOutAt: now.toISOString(),
          vehiclePlate: gatePass.vehiclePlate,
          receiverName: gatePass.receiverName,
        },
        note: `Container ${visit.container.containerNumber} đã Gate-out với phiếu ${gatePass.code}`,
      });

      // 9. Enqueue CODECO Gate-out message in outbox
      await this.ediOutboxService.enqueueCodecoGateOut(
        visit.id,
        actor.icdId,
        tx,
      );

      return {
        containerVisitId: visit.id,
        containerNumber: visit.container.containerNumber,
        gatePassId: gatePass.id,
        gatePassCode: gatePass.code,
        gateOutAt: now.toISOString(),
        status: ContainerVisitStatus.EXITED,
      };
    });
  }
}
