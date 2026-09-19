import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { CodecoCanonicalPayloadV1 } from '../schemas/codeco-canonical-payload.interface';
import { EdiRoutingSnapshot } from '../schemas/edi-routing-snapshot.schema';

export interface CodecoSnapshotResult {
  shippingLineId: string;
  payloadSnapshot: CodecoCanonicalPayloadV1;
  routingSnapshot: EdiRoutingSnapshot;
}

@Injectable()
export class EdiCodecoSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async buildSnapshot(
    containerVisitId: string,
    messageType: 'CODECO_GATE_IN' | 'CODECO_GATE_OUT',
    tx?: Prisma.TransactionClient,
  ): Promise<CodecoSnapshotResult | null> {
    const client = tx ?? this.prisma;

    const visit = await client.containerVisit.findUnique({
      where: { id: containerVisitId },
      include: {
        container: true,
        houseBl: {
          include: {
            masterBl: {
              include: {
                manifest: {
                  include: {
                    shippingLine: true,
                  },
                },
                shippingLine: true,
              },
            },
          },
        },
        reception: {
          include: {
            truckVisit: true,
          },
        },
        gatePasses: {
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!visit) {
      return null;
    }

    const shippingLine =
      visit.houseBl?.masterBl?.shippingLine ??
      visit.houseBl?.masterBl?.manifest?.shippingLine;

    if (!shippingLine) {
      // If no shipping line is mapped to this container visit, cannot route EDI
      return null;
    }

    // Find EDI Route for this shipping line and ICD site
    const route = await client.ediRoute.findUnique({
      where: {
        icdId_shippingLineId: {
          icdId: visit.icdId,
          shippingLineId: shippingLine.id,
        },
      },
    });

    if (!route || !route.enabled) {
      // Route not configured or disabled
      return null;
    }

    const routingSnapshot: EdiRoutingSnapshot = {
      routeId: route.id,
      icdId: route.icdId,
      transport: route.transport,
      outboundFormat: route.outboundFormat,
      partnerTarget: route.partnerTarget,
      credentialRef: route.credentialRef,
      hostKeySha256: route.hostKeySha256,
      timeoutMs: route.timeoutMs,
    };

    const requestId = this.requestContext.getRequestId();
    const manifest = visit.houseBl?.masterBl?.manifest;
    const masterBl = visit.houseBl?.masterBl;
    const houseBl = visit.houseBl;
    const reception = visit.reception;
    const gatePass = visit.gatePasses[0];

    const vehiclePlate =
      reception?.truckVisit?.vehiclePlate ?? gatePass?.vehiclePlate ?? null;

    const eventAt = (
      messageType === 'CODECO_GATE_IN'
        ? (visit.gateInAt ?? reception?.receivedAt ?? new Date())
        : (visit.gateOutAt ?? gatePass?.usedAt ?? new Date())
    ).toISOString();

    const payloadSnapshot: CodecoCanonicalPayloadV1 = {
      schemaVersion: 'CODECO_CANONICAL_JSON_V1',
      messageType,
      eventAt,
      requestId: requestId ?? null,
      containerVisit: {
        id: visit.id,
        state: visit.status,
      },
      container: {
        number: visit.container.containerNumber,
        containerType: visit.container.type,
        isoTypeCode: visit.container.isoCode,
        fullEmptyStatus: visit.category,
      },
      shippingLine: {
        id: shippingLine.id,
        name: shippingLine.name,
        scacCode: shippingLine.scacCode,
      },
      documents: {
        manifestNo: manifest?.manifestNo ?? null,
        masterBlNo: masterBl?.mblNumber ?? null,
        houseBlNo: houseBl?.hblNumber ?? null,
        vesselName: manifest?.vesselName ?? null,
        voyageNo: manifest?.voyageNo ?? null,
        portOfLoading: manifest?.portOfLoading ?? null,
        portOfDischarge: manifest?.portOfDischarge ?? null,
      },
      gate: {
        receptionId: reception?.id ?? null,
        gateInAt: visit.gateInAt?.toISOString() ?? null,
        gateOutAt: visit.gateOutAt?.toISOString() ?? null,
        actualSeal: reception?.actualSeal ?? visit.sealNumber ?? null,
        actualWeight: reception?.actualWeight
          ? reception.actualWeight.toString()
          : visit.grossWeight
            ? visit.grossWeight.toString()
            : null,
        vehiclePlate,
      },
      yard: {
        slotCode: visit.currentLocation ?? null,
        blockCode: null,
      },
    };

    return {
      shippingLineId: shippingLine.id,
      payloadSnapshot,
      routingSnapshot,
    };
  }
}
