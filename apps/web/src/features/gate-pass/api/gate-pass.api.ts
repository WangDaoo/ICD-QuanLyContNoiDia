import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  CreateGatePassInput,
  GateOutInput,
  GateOutResult,
  GatePass,
  GatePassBlocker,
  GatePassReadiness,
  GatePassScanResult,
  GatePassSnapshot,
} from '../gate-pass.types';

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

function readBoolean(
  source: UnknownRecord,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'boolean'
    ) {
      return value;
    }
  }

  return undefined;
}

function getErrorStatus(
  error: unknown,
): number | undefined {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return undefined;
  }

  if (
    'status' in error &&
    typeof error.status ===
      'number'
  ) {
    return error.status;
  }

  if (
    'response' in error &&
    typeof error.response ===
      'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status ===
      'number'
  ) {
    return error.response
      .status;
  }

  return undefined;
}

async function postWithValidationFallback(
  url: string,
  bodies:
    Record<string, unknown>[],
): Promise<unknown> {
  let lastError:
    unknown = null;

  for (
    let index = 0;
    index < bodies.length;
    index += 1
  ) {
    try {
      return await apiClient.post<unknown>(
        url,
        bodies[index],
      );
    } catch (error) {
      lastError =
        error;

      const status =
        getErrorStatus(
          error,
        );

      const hasNext =
        index <
        bodies.length - 1;

      /*
       * Chỉ retry DTO variant
       * nếu request bị reject
       * ở validation layer.
       *
       * Không retry conflict/server
       * để tránh duplicate mutation.
       */
      if (
        !hasNext ||
        (
          status !== 400 &&
          status !== 422
        )
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}

function normalizeBlocker(
  raw: unknown,
): GatePassBlocker | null {
  if (
    typeof raw === 'string'
  ) {
    return {
      code: raw,
    };
  }

  if (!isRecord(raw)) {
    return null;
  }

  const code =
    readString(
      raw,
      [
        'code',
        'blockerCode',
        'type',
      ],
    );

  if (!code) {
    return null;
  }

  return {
    code,

    message:
      readString(
        raw,
        [
          'message',
          'reason',
          'description',
        ],
      ) ??
      null,

    details:
      raw.details ??
      raw.metadata,
  };
}

function normalizeReadiness(
  raw: unknown,
): GatePassReadiness {
  const root =
    asRecord(raw);

  const blockersRaw =
    Array.isArray(
      root.blockers,
    )
      ? root.blockers
      : Array.isArray(
            root.reasons,
          )
        ? root.reasons
        : [];

  const blockers =
    blockersRaw
      .map(
        normalizeBlocker,
      )
      .filter(
        (
          item,
        ): item is GatePassBlocker =>
          item !== null,
      );

  const explicitReady =
    readBoolean(
      root,
      [
        'ready',
        'isReady',
        'valid',
        'eligible',
      ],
    );

  return {
    ready:
      explicitReady ??
      blockers.length ===
        0,

    blockers,
  };
}

function normalizeGatePass(
  raw: unknown,
): GatePass | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    readString(
      raw,
      [
        'id',
        'gatePassId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    visitId:
      readString(
        raw,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      null,

    code:
      readString(
        raw,
        [
          'code',
          'gatePassCode',
          'passCode',
        ],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'ACTIVE',

    issuedAt:
      readString(
        raw,
        [
          'issuedAt',
          'createdAt',
        ],
      ) ??
      null,

    expiresAt:
      readString(
        raw,
        [
          'expiresAt',
          'expiredAt',
        ],
      ) ??
      null,

    usedAt:
      readString(
        raw,
        ['usedAt'],
      ) ??
      null,

    vehiclePlate:
      readString(
        raw,
        [
          'vehiclePlate',
          'truckPlate',
        ],
      ) ??
      null,

    receiverName:
      readString(
        raw,
        [
          'receiverName',
          'recipientName',
          'pickupPersonName',
        ],
      ) ??
      null,

    receiverIdNumber:
      readString(
        raw,
        [
          'receiverIdNumber',
          'recipientIdNumber',
          'identityNumber',
          'idNumber',
        ],
      ) ??
      null,

    qrToken:
      readString(
        raw,
        [
          'qrToken',
          'token',
          'qrCodeToken',
        ],
      ) ??
      null,
  };
}

function normalizeSnapshot(
  response: unknown,
  visitId: string,
): GatePassSnapshot {
  const root =
    asRecord(
      unwrapData(
        response,
      ),
    );

  const readinessRaw =
    root.readiness ??
    root.readinessCheck ??
    root.gatePassReadiness ??
    root;

  const gatePassRaw =
    root.gatePass ??
    root.activeGatePass ??
    root.pass;

  return {
    visitId:
      readString(
        root,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      visitId,

    readiness:
      normalizeReadiness(
        readinessRaw,
      ),

    gatePass:
      normalizeGatePass(
        gatePassRaw,
      ),
  };
}

function requireGatePass(
  response: unknown,
): GatePass {
  const root =
    asRecord(
      unwrapData(response),
    );

  const gatePass =
    normalizeGatePass(
      root.gatePass ??
      root.pass ??
      root,
    );

  if (!gatePass) {
    throw new Error(
      'Backend không trả Gate Pass hợp lệ.',
    );
  }

  return gatePass;
}

function normalizeScanResult(
  response: unknown,
): GatePassScanResult {
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

  const gatePass =
    normalizeGatePass(
      root.gatePass ??
      root.pass ??
      root,
    );

  if (!gatePass) {
    throw new Error(
      'Không tìm thấy Gate Pass từ dữ liệu scan.',
    );
  }

  const visitId =
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
    gatePass.visitId;

  if (!visitId) {
    throw new Error(
      'Backend không trả visitId sau khi scan Gate Pass.',
    );
  }

  const readinessRaw =
    root.readiness ??
    root.readinessCheck ??
    root.gatePassReadiness;

  return {
    visitId,

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
      null,

    containerStatus:
      readString(
        root,
        [
          'containerStatus',
          'visitStatus',
        ],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      null,

    yardPosition:
      readString(
        root,
        [
          'yardPosition',
          'position',
          'location',
        ],
      ) ??
      null,

    gatePass,

    readiness:
      readinessRaw
        ? normalizeReadiness(
            readinessRaw,
          )
        : null,
  };
}

function normalizeGateOut(
  response: unknown,
): GateOutResult {
  const root =
    asRecord(
      unwrapData(response),
    );

  const visit =
    asRecord(
      root.containerVisit ??
      root.visit,
    );

  const gatePass =
    asRecord(
      root.gatePass,
    );

  const visitId =
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
    );

  if (!visitId) {
    throw new Error(
      'Backend không trả visitId sau Gate-out.',
    );
  }

  return {
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

    containerStatus:
      readString(
        root,
        [
          'containerStatus',
          'status',
        ],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      'EXITED',

    gatePassId:
      readString(
        root,
        ['gatePassId'],
      ) ??
      readString(
        gatePass,
        ['id'],
      ) ??
      null,

    gatePassStatus:
      readString(
        root,
        ['gatePassStatus'],
      ) ??
      readString(
        gatePass,
        ['status'],
      ) ??
      'USED',

    gateOutAt:
      readString(
        root,
        [
          'gateOutAt',
          'exitedAt',
          'createdAt',
        ],
      ) ??
      null,
  };
}

export const gatePassApi = {
  async getSnapshot(
    visitId: string,
  ): Promise<GatePassSnapshot> {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/gate-pass`,
      );

    return normalizeSnapshot(
      response,
      visitId,
    );
  },

  async create(
    visitId: string,
    input:
      CreateGatePassInput,
  ): Promise<GatePass> {
    const vehiclePlate =
      input.vehiclePlate
        ?.trim()
        .toUpperCase();

    const receiverName =
      input.receiverName
        .trim();

    const receiverIdNumber =
      input.receiverIdNumber
        .trim();

    const response =
      await postWithValidationFallback(
        `/containers/${encodeURIComponent(
          visitId,
        )}/gate-pass`,
        [
          {
            ...(vehiclePlate
              ? {
                  vehiclePlate,
                }
              : {}),

            receiverName,

            receiverIdNumber,
          },

          /*
           * Compatibility với DTO
           * gọi field là recipient*.
           */
          {
            ...(vehiclePlate
              ? {
                  vehiclePlate,
                }
              : {}),

            recipientName:
              receiverName,

            recipientIdNumber:
              receiverIdNumber,
          },
        ],
      );

    return requireGatePass(
      response,
    );
  },

  async scan(
    scanValue: string,
  ): Promise<GatePassScanResult> {
    const value =
      scanValue.trim();

    if (!value) {
      throw new Error(
        'QR token / Gate Pass code không được để trống.',
      );
    }

    const response =
      await postWithValidationFallback(
        '/gate-pass/scan',
        [
          {
            qrToken:
              value,
          },

          {
            token:
              value,
          },

          {
            code:
              value,
          },
        ],
      );

    return normalizeScanResult(
      response,
    );
  },

  async gateOut(
    input:
      GateOutInput,
  ): Promise<GateOutResult> {
    const bodies:
      Record<
        string,
        unknown
      >[] = [
        {
          gatePassId:
            input.gatePassId,
        },
      ];

    if (
      input.scanValue
        ?.trim()
    ) {
      bodies.push(
        {
          gatePassId:
            input.gatePassId,

          qrToken:
            input.scanValue.trim(),
        },

        {
          qrToken:
            input.scanValue.trim(),
        },

        {
          token:
            input.scanValue.trim(),
        },

        {
          code:
            input.scanValue.trim(),
        },
      );
    }

    const response =
      await postWithValidationFallback(
        '/gate-out',
        bodies,
      );

    return normalizeGateOut(
      response,
    );
  },
};
