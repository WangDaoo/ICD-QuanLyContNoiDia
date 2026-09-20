import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  MovementOrder,
} from '../movement-order.types';

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

function normalizeMovementOrder(
  response: unknown,
): MovementOrder {
  const unwrapped =
    unwrapData(response);

  const root =
    isRecord(unwrapped)
      ? unwrapped
      : {};

  const order =
    isRecord(
      root.movementOrder,
    )
      ? root.movementOrder
      : root;

  const id =
    readString(
      order,
      [
        'id',
        'orderId',
        'movementOrderId',
      ],
    );

  if (!id) {
    throw new Error(
      'Backend không trả movementOrderId sau khi tạo lệnh.',
    );
  }

  return {
    id,

    visitId:
      readString(
        order,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      null,

    status:
      readString(
        order,
        ['status'],
      ) ??
      'DRAFT',

    expiresAt:
      readString(
        order,
        [
          'expiresAt',
          'expiredAt',
        ],
      ) ??
      null,

    authorizedAt:
      readString(
        order,
        ['authorizedAt'],
      ) ??
      null,

    createdAt:
      readString(
        order,
        ['createdAt'],
      ) ??
      null,

    updatedAt:
      readString(
        order,
        ['updatedAt'],
      ) ??
      null,
  };
}

export const movementOrderApi = {
  async create(
    visitId: string,
  ): Promise<MovementOrder> {
    /*
     * Contract RC1 công bố route create
     * nhưng không công bố field bắt buộc.
     *
     * movement_order.expires_at nullable,
     * nên Web gửi body rỗng và để backend
     * áp dụng policy/default.
     */
    const response =
      await apiClient.post<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/movement-orders`,
        {},
      );

    return normalizeMovementOrder(
      response,
    );
  },

  async authorize(
    orderId: string,
  ): Promise<MovementOrder> {
    const response =
      await apiClient.post<unknown>(
        `/movement-orders/${encodeURIComponent(
          orderId,
        )}/authorize`,
        {},
      );

    return normalizeMovementOrder(
      response,
    );
  },

  async createAndAuthorize(
    visitId: string,
  ): Promise<MovementOrder> {
    const created =
      await movementOrderApi.create(
        visitId,
      );

    return movementOrderApi.authorize(
      created.id,
    );
  },
};
