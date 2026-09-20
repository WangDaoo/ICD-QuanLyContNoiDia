import {
  apiClient,
} from '../../../services/api/api-client';

import {
  containerApi,
} from '../../containers/api/container.api';

import {
  truckVisitApi,
} from '../../truck-visits/api/truck-visit.api';

import type {
  GateInContext,
  GateInRequest,
  GateInResult,
  GateInTruckVisit,
} from '../gate-in.types';

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asRecord(
  value: unknown,
): UnknownRecord {
  return isRecord(value)
    ? value
    : {};
}

function unwrapData(
  value: unknown,
): unknown {
  if (
    isRecord(value) &&
    'data' in value
  ) {
    return value.data;
  }

  return value;
}

function readString(
  source: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      return value;
    }
  }

  return undefined;
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }
  }

  return undefined;
}

function normalizeTruckVisit(
  raw: unknown,
): GateInTruckVisit | null {
  if (!isRecord(raw)) {
    return null;
  }

  const transporter =
    asRecord(
      raw.transporter,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'truckVisitId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    visitNumber:
      readString(
        raw,
        [
          'visitNumber',
          'code',
        ],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'UNKNOWN',

    vehiclePlate:
      readString(
        raw,
        [
          'vehiclePlate',
          'truckPlate',
          'licensePlate',
        ],
      ) ??
      null,

    trailerPlate:
      readString(
        raw,
        ['trailerPlate'],
      ) ??
      null,

    driverName:
      readString(
        raw,
        ['driverName'],
      ) ??
      null,

    transporterId:
      readString(
        raw,
        ['transporterId'],
      ) ??
      readString(
        transporter,
        ['id'],
      ) ??
      null,

    transporterName:
      readString(
        raw,
        ['transporterName'],
      ) ??
      readString(
        transporter,
        [
          'name',
          'companyName',
        ],
      ) ??
      null,

    gateLane:
      readString(
        raw,
        [
          'gateLane',
          'lane',
        ],
      ) ??
      null,
  };
}

function normalizeContext(
  response: unknown,
  visitId: string,
): GateInContext {
  const root =
    asRecord(
      unwrapData(response),
    );

  const container =
    asRecord(
      root.container,
    );

  const visit =
    asRecord(
      root.containerVisit ??
        root.visit,
    );

  const movementOrder =
    asRecord(
      root.movementOrder ??
        root.activeMovementOrder,
    );

  const truckVisit =
    normalizeTruckVisit(
      root.truckVisit ??
        root.currentTruckVisit,
    );

  const availableRaw =
    Array.isArray(
      root.availableTruckVisits,
    )
      ? root.availableTruckVisits
      : [];

  const availableTruckVisits =
    availableRaw
      .map(
        normalizeTruckVisit,
      )
      .filter(
        (
          item,
        ): item is GateInTruckVisit =>
          item !== null,
      );

  return {
    visitId,

    containerId:
      readString(
        root,
        ['containerId'],
      ) ??
      readString(
        container,
        ['id'],
      ) ??
      null,

    containerNumber:
      readString(
        root,
        [
          'containerNumber',
          'containerNo',
        ],
      ) ??
      readString(
        container,
        [
          'containerNumber',
          'containerNo',
          'number',
        ],
      ) ??
      'UNKNOWN',

    visitStatus:
      readString(
        root,
        [
          'visitStatus',
          'status',
        ],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      'UNKNOWN',

    size:
      readString(
        root,
        ['size'],
      ) ??
      readString(
        container,
        ['size'],
      ) ??
      null,

    type:
      readString(
        root,
        [
          'type',
          'containerType',
        ],
      ) ??
      readString(
        container,
        [
          'type',
          'containerType',
        ],
      ) ??
      null,

    isoCode:
      readString(
        root,
        ['isoCode'],
      ) ??
      readString(
        container,
        ['isoCode'],
      ) ??
      null,

    expectedSeal:
      readString(
        root,
        [
          'expectedSeal',
          'manifestSeal',
          'sealNumber',
        ],
      ) ??
      readString(
        container,
        [
          'sealNumber',
          'seal',
        ],
      ) ??
      null,

    grossWeight:
      readNumber(
        root,
        [
          'grossWeight',
          'expectedWeight',
        ],
      ) ??
      readNumber(
        container,
        ['grossWeight'],
      ) ??
      null,

    movementOrder:
      Object.keys(
        movementOrder,
      ).length > 0
        ? {
            id:
              readString(
                movementOrder,
                ['id'],
              ) ??
              null,

            status:
              readString(
                movementOrder,
                ['status'],
              ) ??
              null,

            expiresAt:
              readString(
                movementOrder,
                ['expiresAt'],
              ) ??
              null,
          }
        : null,

    currentTruckVisit:
      truckVisit,

    availableTruckVisits,
  };
}

async function buildFallbackContext(
  visitId: string,
): Promise<GateInContext> {
  const [
    container,
    truckVisits,
  ] =
    await Promise.all([
      containerApi.getDetail(
        visitId,
      ),

      truckVisitApi.list(),
    ]);

  const matchingTruckVisits =
    truckVisits
      .filter(
        (truckVisit) =>
          truckVisit.status ===
            'ARRIVED' &&
          truckVisit.containers.some(
            (item) =>
              item.visitId ===
              visitId,
          ),
      )
      .map(
        (
          truckVisit,
        ): GateInTruckVisit => ({
          id:
            truckVisit.id,

          visitNumber:
            truckVisit.visitNumber,

          status:
            truckVisit.status,

          vehiclePlate:
            truckVisit.vehiclePlate,

          trailerPlate:
            truckVisit.trailerPlate,

          driverName:
            truckVisit.driverName,

          transporterId:
            truckVisit.transporterId,

          transporterName:
            truckVisit.transporterName,

          gateLane:
            truckVisit.gateLane,
        }),
      );

  return {
    visitId,

    containerId:
      container.id,

    containerNumber:
      container.containerNumber,

    visitStatus:
      container.status,

    size:
      container.size ??
      null,

    type:
      container.type ??
      null,

    isoCode:
      container.isoCode ??
      null,

    expectedSeal:
      container.sealNumber ??
      null,

    grossWeight:
      container.grossWeight ??
      null,

    movementOrder:
      null,

    currentTruckVisit:
      matchingTruckVisits[0] ??
      null,

    availableTruckVisits:
      matchingTruckVisits,
  };
}

function normalizeResult(
  response: unknown,
  visitId: string,
): GateInResult {
  const root =
    asRecord(
      unwrapData(response),
    );

  const reception =
    asRecord(
      root.reception ??
        root.containerReception,
    );

  const visit =
    asRecord(
      root.containerVisit ??
        root.visit,
    );

  return {
    visitId:
      readString(
        root,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      readString(
        visit,
        ['id'],
      ) ??
      visitId,

    containerNumber:
      readString(
        root,
        [
          'containerNumber',
          'containerNo',
        ],
      ) ??
      null,

    status:
      readString(
        root,
        ['status'],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      'IN_YARD',

    receptionId:
      readString(
        root,
        ['receptionId'],
      ) ??
      readString(
        reception,
        ['id'],
      ) ??
      null,

    gateInAt:
      readString(
        root,
        ['gateInAt'],
      ) ??
      readString(
        reception,
        [
          'receivedAt',
          'createdAt',
        ],
      ) ??
      null,

    sealMismatch:
      typeof root.sealMismatch ===
      'boolean'
        ? root.sealMismatch
        : undefined,
  };
}

export const gateInApi = {
  async getContext(
    visitId: string,
  ): Promise<GateInContext> {
    try {
      /*
       * Endpoint này đang được Mobile
       * dùng để dựng Gate-in context.
       */
      const response =
        await apiClient.get<unknown>(
          `/containers/${encodeURIComponent(
            visitId,
          )}/gate-in-context`,
        );

      return normalizeContext(
        response,
        visitId,
      );
    } catch {
      /*
       * Không làm Web phụ thuộc cứng
       * vào context endpoint.
       *
       * Nếu endpoint không được expose
       * ở build Web, dựng context từ
       * Container + Truck Visits.
       */
      return buildFallbackContext(
        visitId,
      );
    }
  },

  async submit(
    visitId: string,
    input: GateInRequest,
  ): Promise<GateInResult> {
    const body: GateInRequest = {
      actualSeal:
        input.actualSeal.trim(),

      ...(input.actualWeight !==
      undefined
        ? {
            actualWeight:
              input.actualWeight,
          }
        : {}),

      ...(input.condition
        ? {
            condition:
              input.condition,
          }
        : {}),

      ...(input.notes?.trim()
        ? {
            notes:
              input.notes.trim(),
          }
        : {}),

      ...(input.truckVisitId
        ? {
            truckVisitId:
              input.truckVisitId,
          }
        : {}),

      ...(!input.truckVisitId &&
      input.vehiclePlate?.trim()
        ? {
            vehiclePlate:
              input.vehiclePlate
                .trim()
                .toUpperCase(),
          }
        : {}),

      ...(!input.truckVisitId &&
      input.driverName?.trim()
        ? {
            driverName:
              input.driverName.trim(),
          }
        : {}),

      ...(!input.truckVisitId &&
      input.transporterId?.trim()
        ? {
            transporterId:
              input.transporterId.trim(),
          }
        : {}),
    };

    const response =
      await apiClient.post<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/gate-in`,
        body,
      );

    return normalizeResult(
      response,
      visitId,
    );
  },
};
