import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TransportConfirmationType,
  TransportHandoverStatus,
} from '../../../../generated/prisma/client';
import type { AcceptHandoverDto } from '../dto/accept-handover.dto';
import type { DeliveryFailedDto } from '../dto/delivery-failed.dto';
import type { MarkInTransitDto } from '../dto/mark-in-transit.dto';
import type { RejectHandoverDto } from '../dto/reject-handover.dto';
import type { WarehouseReceivedDto } from '../dto/warehouse-received.dto';
import type { PartnerApiPrincipal } from '../types/partner-api.types';
import { redactPartnerApiPayload } from '../utils/partner-api-redaction.util';

@Injectable()
export class ExternalHandoverCommandService {
  async lockOwnedHandoverOrThrow(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
  ) {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        partner_api_client_id: string;
        status: string;
        version: number;
      }>
    >(
      `SELECT id, partner_api_client_id, status, version FROM transport_handover WHERE id = ? FOR UPDATE`,
      handoverId,
    );

    const firstRow = rows[0];
    if (!firstRow || firstRow.partner_api_client_id !== principal.clientId) {
      throw new NotFoundException({
        code: 'HANDOVER_NOT_FOUND',
        message: `Handover ${handoverId} not found.`,
      });
    }

    const handover = await tx.transportHandover.findUnique({
      where: { id: handoverId },
      include: {
        warehouse: true,
      },
    });

    if (!handover || handover.partnerApiClientId !== principal.clientId) {
      throw new NotFoundException({
        code: 'HANDOVER_NOT_FOUND',
        message: `Handover ${handoverId} not found.`,
      });
    }

    return handover;
  }

  async accept(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
    dto: AcceptHandoverDto,
    requestId: string,
  ) {
    const handover = await this.lockOwnedHandoverOrThrow(
      tx,
      handoverId,
      principal,
    );

    if (handover.status !== TransportHandoverStatus.READY_FOR_HANDOVER) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Handover must be in READY_FOR_HANDOVER state to accept. Current state: ${handover.status}.`,
      });
    }

    const acceptedAt = new Date(dto.accepted_at);

    const updated = await tx.transportHandover.update({
      where: { id: handoverId },
      data: {
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        partnerAcceptedAt: acceptedAt,
        version: { increment: 1 },
      },
      select: {
        id: true,
        transportCode: true,
        status: true,
        partnerAcceptedAt: true,
      },
    });

    await tx.transportConfirmation.create({
      data: {
        transportHandoverId: handover.id,
        createdByPartnerClientId: principal.clientId,
        confirmationType: TransportConfirmationType.PARTNER_ACCEPTED,
        partnerRequestId: requestId,
        confirmedAt: acceptedAt,
        note: dto.note ?? null,
        payloadSnapshot: redactPartnerApiPayload(dto),
      },
    });

    return {
      handover_id: updated.id,
      transport_code: updated.transportCode,
      status: updated.status,
      partner_accepted_at: updated.partnerAcceptedAt,
    };
  }

  async reject(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
    dto: RejectHandoverDto,
    requestId: string,
  ) {
    const handover = await this.lockOwnedHandoverOrThrow(
      tx,
      handoverId,
      principal,
    );

    if (handover.status !== TransportHandoverStatus.READY_FOR_HANDOVER) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Handover must be in READY_FOR_HANDOVER state to reject. Current state: ${handover.status}.`,
      });
    }

    const rejectedAt = new Date();

    const updated = await tx.transportHandover.update({
      where: { id: handoverId },
      data: {
        status: TransportHandoverStatus.PARTNER_REJECTED,
        version: { increment: 1 },
      },
      select: {
        id: true,
        transportCode: true,
        status: true,
      },
    });

    await tx.transportConfirmation.create({
      data: {
        transportHandoverId: handover.id,
        createdByPartnerClientId: principal.clientId,
        confirmationType: TransportConfirmationType.DELIVERY_FAILED,
        partnerRequestId: requestId,
        confirmedAt: rejectedAt,
        condition: dto.reason,
        note: dto.note ? `Reason: ${dto.reason}. Note: ${dto.note}` : `Reason: ${dto.reason}`,
        payloadSnapshot: redactPartnerApiPayload(dto),
      },
    });

    return {
      handover_id: updated.id,
      transport_code: updated.transportCode,
      status: updated.status,
      rejected_reason: dto.reason,
    };
  }

  async markInTransit(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
    dto: MarkInTransitDto,
    requestId: string,
  ) {
    const handover = await this.lockOwnedHandoverOrThrow(
      tx,
      handoverId,
      principal,
    );

    if (handover.status !== TransportHandoverStatus.PARTNER_ACCEPTED) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Handover must be in PARTNER_ACCEPTED state to mark as in-transit. Current state: ${handover.status}.`,
      });
    }

    const departedAt = new Date(dto.departed_at);

    const updated = await tx.transportHandover.update({
      where: { id: handoverId },
      data: {
        status: TransportHandoverStatus.IN_TRANSIT,
        departedAt,
        version: { increment: 1 },
      },
      select: {
        id: true,
        transportCode: true,
        status: true,
        departedAt: true,
      },
    });

    await tx.transportConfirmation.create({
      data: {
        transportHandoverId: handover.id,
        createdByPartnerClientId: principal.clientId,
        confirmationType: TransportConfirmationType.IN_TRANSIT,
        partnerRequestId: requestId,
        confirmedAt: departedAt,
        note: dto.partner_trip_code ? `Trip: ${dto.partner_trip_code}` : null,
        payloadSnapshot: redactPartnerApiPayload(dto),
      },
    });

    return {
      handover_id: updated.id,
      transport_code: updated.transportCode,
      status: updated.status,
      departed_at: updated.departedAt,
    };
  }

  async deliveryFailed(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
    dto: DeliveryFailedDto,
    requestId: string,
  ) {
    const handover = await this.lockOwnedHandoverOrThrow(
      tx,
      handoverId,
      principal,
    );

    if (handover.status !== TransportHandoverStatus.IN_TRANSIT) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Handover must be in IN_TRANSIT state to report delivery failure. Current state: ${handover.status}.`,
      });
    }

    const failedAt = new Date(dto.failed_at);

    const updated = await tx.transportHandover.update({
      where: { id: handoverId },
      data: {
        status: TransportHandoverStatus.DELIVERY_FAILED,
        version: { increment: 1 },
      },
      select: {
        id: true,
        transportCode: true,
        status: true,
      },
    });

    await tx.transportConfirmation.create({
      data: {
        transportHandoverId: handover.id,
        createdByPartnerClientId: principal.clientId,
        confirmationType: TransportConfirmationType.DELIVERY_FAILED,
        partnerRequestId: requestId,
        confirmedAt: failedAt,
        condition: dto.reason_code,
        note: dto.reason_description,
        latitude: dto.location?.latitude ? new Prisma.Decimal(dto.location.latitude) : null,
        longitude: dto.location?.longitude ? new Prisma.Decimal(dto.location.longitude) : null,
        accuracyM: dto.location?.accuracy_m ? new Prisma.Decimal(dto.location.accuracy_m) : null,
        payloadSnapshot: redactPartnerApiPayload(dto),
      },
    });

    return {
      handover_id: updated.id,
      transport_code: updated.transportCode,
      status: updated.status,
      failed_at: dto.failed_at,
      reason_code: dto.reason_code,
    };
  }

  async warehouseReceived(
    tx: Prisma.TransactionClient,
    handoverId: string,
    principal: PartnerApiPrincipal,
    dto: WarehouseReceivedDto,
    requestId: string,
  ) {
    const handover = await this.lockOwnedHandoverOrThrow(
      tx,
      handoverId,
      principal,
    );

    if (handover.status !== TransportHandoverStatus.IN_TRANSIT) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Handover must be in IN_TRANSIT state to confirm warehouse receipt. Current state: ${handover.status}.`,
      });
    }

    if (handover.warehouse.code !== dto.warehouse_code) {
      throw new BadRequestException({
        code: 'WAREHOUSE_MISMATCH',
        message: `Warehouse code '${dto.warehouse_code}' does not match handover destination warehouse code '${handover.warehouse.code}'.`,
      });
    }

    const receivedAt = new Date(dto.received_at);

    const updated = await tx.transportHandover.update({
      where: { id: handoverId },
      data: {
        status: TransportHandoverStatus.PARTNER_CONFIRMED,
        partnerConfirmedAt: receivedAt,
        version: { increment: 1 },
      },
      select: {
        id: true,
        transportCode: true,
        status: true,
        partnerConfirmedAt: true,
      },
    });

    await tx.transportConfirmation.create({
      data: {
        transportHandoverId: handover.id,
        createdByPartnerClientId: principal.clientId,
        confirmationType: TransportConfirmationType.WAREHOUSE_RECEIVED,
        partnerRequestId: requestId,
        confirmedAt: receivedAt,
        receiverName: dto.receiver_name,
        receiverPhone: dto.receiver_phone ?? null,
        condition: dto.condition ?? null,
        note: dto.note ?? null,
        latitude: dto.location?.latitude ? new Prisma.Decimal(dto.location.latitude) : null,
        longitude: dto.location?.longitude ? new Prisma.Decimal(dto.location.longitude) : null,
        accuracyM: dto.location?.accuracy_m ? new Prisma.Decimal(dto.location.accuracy_m) : null,
        proofImageUrl: dto.proof?.image_url ?? null,
        signatureUrl: dto.proof?.signature_url ?? null,
        payloadSnapshot: redactPartnerApiPayload(dto),
      },
    });

    return {
      handover_id: updated.id,
      transport_code: updated.transportCode,
      status: updated.status,
      partner_confirmed_at: updated.partnerConfirmedAt,
    };
  }
}

