import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  ContainerDetail,
  ContainerListItem,
  ContainerTimelineEvent,
} from '../container.types';

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
      value.trim()
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

function asRecord(
  value: unknown,
): UnknownRecord {
  return isRecord(value)
    ? value
    : {};
}

function normalizePosition(
  raw: unknown,
):
  | ContainerDetail['yardPosition']
  | null {
  if (!isRecord(raw)) {
    if (
      typeof raw === 'string'
    ) {
      return {
        label: raw,
      };
    }

    return null;
  }

  const block =
    readString(
      raw,
      [
        'block',
        'blockCode',
      ],
    );

  const row =
    readString(
      raw,
      [
        'row',
        'rowCode',
      ],
    );

  const bay =
    readString(
      raw,
      [
        'bay',
        'bayCode',
      ],
    );

  const tier =
    readString(
      raw,
      [
        'tier',
        'tierCode',
      ],
    );

  const computedLabel =
    [
      block,
      row,
      bay,
      tier,
    ]
      .filter(Boolean)
      .join('-');

  return {
    id:
      readString(
        raw,
        ['id'],
      ),

    slotId:
      readString(
        raw,
        [
          'slotId',
          'yardSlotId',
        ],
      ),

    block,
    row,
    bay,
    tier,

    label:
      readString(
        raw,
        [
          'label',
          'position',
          'slotCode',
          'locationCode',
        ],
      ) ||
      computedLabel ||
      undefined,

    startedAt:
      readString(
        raw,
        [
          'startedAt',
          'assignedAt',
        ],
      ),
  };
}

function getPositionLabel(
  raw: UnknownRecord,
): string | null {
  const direct =
    readString(
      raw,
      [
        'yardPosition',
        'position',
        'location',
        'yardLocation',
      ],
    );

  if (direct) {
    return direct;
  }

  const location =
    raw.currentLocation ??
    raw.locationLog ??
    raw.yardSlot;

  const normalized =
    normalizePosition(
      location,
    );

  return normalized?.label ??
    null;
}

function normalizeListItem(
  raw: unknown,
  index: number,
): ContainerListItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const container =
    asRecord(
      raw.container,
    );

  const visit =
    asRecord(
      raw.visit ??
        raw.containerVisit,
    );

  const consignee =
    asRecord(
      raw.consignee ??
        container.consignee,
    );

  const hbl =
    asRecord(
      raw.houseBl ??
        raw.hbl ??
        container.houseBl,
    );

  const mbl =
    asRecord(
      raw.masterBl ??
        raw.mbl ??
        container.masterBl,
    );

  const containerNumber =
    readString(
      raw,
      [
        'containerNumber',
        'containerNo',
        'number',
      ],
    ) ??
    readString(
      container,
      [
        'containerNumber',
        'containerNo',
        'number',
      ],
    );

  if (!containerNumber) {
    return null;
  }

  const visitId =
    readString(
      raw,
      [
        'visitId',
        'containerVisitId',
      ],
    ) ??
    readString(
      visit,
      ['id'],
    ) ??
    readString(
      raw,
      ['id'],
    ) ??
    `visit-${index}`;

  return {
    id:
      readString(
        container,
        ['id'],
      ) ??
      readString(
        raw,
        [
          'containerId',
          'id',
        ],
      ) ??
      containerNumber,

    visitId,

    containerNumber,

    size:
      readString(
        raw,
        ['size'],
      ) ??
      readString(
        container,
        ['size'],
      ),

    type:
      readString(
        raw,
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
      ),

    isoCode:
      readString(
        raw,
        ['isoCode'],
      ) ??
      readString(
        container,
        ['isoCode'],
      ),

    status:
      readString(
        raw,
        ['status'],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      'UNKNOWN',

    yardPosition:
      getPositionLabel(
        raw,
      ),

    consigneeName:
      readString(
        consignee,
        [
          'name',
          'companyName',
        ],
      ) ??
      readString(
        raw,
        [
          'consigneeName',
        ],
      ) ??
      null,

    hblNumber:
      readString(
        hbl,
        [
          'number',
          'hblNumber',
        ],
      ) ??
      readString(
        raw,
        ['hblNumber'],
      ) ??
      null,

    mblNumber:
      readString(
        mbl,
        [
          'number',
          'mblNumber',
        ],
      ) ??
      readString(
        raw,
        ['mblNumber'],
      ) ??
      null,

    gateInAt:
      readString(
        raw,
        ['gateInAt'],
      ) ??
      readString(
        visit,
        ['gateInAt'],
      ) ??
      null,

    gateOutAt:
      readString(
        raw,
        ['gateOutAt'],
      ) ??
      readString(
        visit,
        ['gateOutAt'],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      readString(
        visit,
        ['createdAt'],
      ) ??
      null,
  };
}

function normalizeList(
  response: unknown,
): ContainerListItem[] {
  const unwrapped =
    unwrapData(response);

  let rows: unknown[] = [];

  if (
    Array.isArray(unwrapped)
  ) {
    rows = unwrapped;
  } else if (
    isRecord(unwrapped)
  ) {
    const candidate =
      unwrapped.items ??
      unwrapped.records ??
      unwrapped.results ??
      unwrapped.containers;

    if (
      Array.isArray(candidate)
    ) {
      rows = candidate;
    }
  }

  return rows
    .map(
      normalizeListItem,
    )
    .filter(
      (
        item,
      ): item is ContainerListItem =>
        item !== null,
    );
}

function normalizeDetail(
  response: unknown,
  visitId: string,
): ContainerDetail {
  const unwrapped =
    unwrapData(response);

  const root =
    asRecord(unwrapped);

  const container =
    asRecord(
      root.container,
    );

  const visit =
    asRecord(
      root.visit ??
        root.containerVisit,
    );

  const manifest =
    asRecord(
      root.manifest,
    );

  const masterBl =
    asRecord(
      root.masterBl ??
        root.mbl,
    );

  const houseBl =
    asRecord(
      root.houseBl ??
        root.hbl,
    );

  const consignee =
    asRecord(
      root.consignee,
    );

  const clearingAgent =
    asRecord(
      root.clearingAgent,
    );

  const truckVisit =
    asRecord(
      root.truckVisit,
    );

  const containerNumber =
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
    'UNKNOWN';

  return {
    id:
      readString(
        container,
        ['id'],
      ) ??
      readString(
        root,
        [
          'containerId',
          'id',
        ],
      ) ??
      containerNumber,

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

    containerNumber,

    size:
      readString(
        root,
        ['size'],
      ) ??
      readString(
        container,
        ['size'],
      ),

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
      ),

    isoCode:
      readString(
        root,
        ['isoCode'],
      ) ??
      readString(
        container,
        ['isoCode'],
      ),

    sealNumber:
      readString(
        root,
        [
          'sealNumber',
          'seal',
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
          'weight',
        ],
      ) ??
      readNumber(
        container,
        [
          'grossWeight',
          'weight',
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
      'UNKNOWN',

    manifest:
      Object.keys(
        manifest,
      ).length
        ? {
            id:
              readString(
                manifest,
                ['id'],
              ),

            manifestNumber:
              readString(
                manifest,
                [
                  'manifestNumber',
                  'number',
                  'code',
                ],
              ) ??
              null,

            vesselName:
              readString(
                manifest,
                [
                  'vesselName',
                  'vessel',
                ],
              ) ??
              null,

            voyageNumber:
              readString(
                manifest,
                [
                  'voyageNumber',
                  'voyage',
                ],
              ) ??
              null,
          }
        : null,

    masterBl:
      Object.keys(
        masterBl,
      ).length
        ? {
            id:
              readString(
                masterBl,
                ['id'],
              ),

            number:
              readString(
                masterBl,
                [
                  'number',
                  'mblNumber',
                ],
              ) ??
              null,
          }
        : null,

    houseBl:
      Object.keys(
        houseBl,
      ).length
        ? {
            id:
              readString(
                houseBl,
                ['id'],
              ),

            number:
              readString(
                houseBl,
                [
                  'number',
                  'hblNumber',
                ],
              ) ??
              null,
          }
        : null,

    consignee:
      Object.keys(
        consignee,
      ).length
        ? {
            id:
              readString(
                consignee,
                ['id'],
              ),

            name:
              readString(
                consignee,
                [
                  'name',
                  'companyName',
                ],
              ) ??
              null,
          }
        : null,

    clearingAgent:
      Object.keys(
        clearingAgent,
      ).length
        ? {
            id:
              readString(
                clearingAgent,
                ['id'],
              ),

            name:
              readString(
                clearingAgent,
                [
                  'name',
                  'companyName',
                ],
              ) ??
              null,
          }
        : null,

    truckVisit:
      Object.keys(
        truckVisit,
      ).length
        ? {
            id:
              readString(
                truckVisit,
                ['id'],
              ),

            vehiclePlate:
              readString(
                truckVisit,
                [
                  'vehiclePlate',
                  'truckPlate',
                ],
              ) ??
              null,

            trailerPlate:
              readString(
                truckVisit,
                [
                  'trailerPlate',
                ],
              ) ??
              null,

            driverName:
              readString(
                truckVisit,
                [
                  'driverName',
                ],
              ) ??
              null,

            status:
              readString(
                truckVisit,
                ['status'],
              ) ??
              null,
          }
        : null,

    yardPosition:
      normalizePosition(
        root.currentLocation ??
          root.yardPosition ??
          root.location ??
          root.yardSlot,
      ),

    gateInAt:
      readString(
        root,
        ['gateInAt'],
      ) ??
      readString(
        visit,
        ['gateInAt'],
      ) ??
      null,

    gateOutAt:
      readString(
        root,
        ['gateOutAt'],
      ) ??
      readString(
        visit,
        ['gateOutAt'],
      ) ??
      null,

    createdAt:
      readString(
        root,
        ['createdAt'],
      ) ??
      readString(
        visit,
        ['createdAt'],
      ) ??
      null,

    updatedAt:
      readString(
        root,
        ['updatedAt'],
      ) ??
      readString(
        visit,
        ['updatedAt'],
      ) ??
      null,
  };
}

function getEventTitle(
  type: string,
): string {
  switch (
    type.toUpperCase()
  ) {
    case 'CREATED':
      return 'Container Visit được tạo';

    case 'AUTHORIZED':
      return 'Movement Order được ủy quyền';

    case 'GATE_IN':
      return 'Container Gate-in';

    case 'YARD_ASSIGNED':
      return 'Đã xếp vị trí bãi';

    case 'YARD_MOVED':
      return 'Di chuyển nội bộ';

    case 'INSPECTION_STARTED':
      return 'Bắt đầu kiểm tra';

    case 'INSPECTION_COMPLETED':
      return 'Hoàn tất kiểm tra';

    case 'GATE_PASS_ISSUED':
      return 'Gate Pass được phát hành';

    case 'GATE_OUT':
    case 'EXITED':
      return 'Container Gate-out';

    default:
      return type
        .replaceAll(
          '_',
          ' ',
        )
        .toLowerCase()
        .replace(
          /^./,
          (value) =>
            value.toUpperCase(),
        );
  }
}

function normalizeEvents(
  response: unknown,
): ContainerTimelineEvent[] {
  const unwrapped =
    unwrapData(response);

  let rows: unknown[] = [];

  if (
    Array.isArray(unwrapped)
  ) {
    rows = unwrapped;
  } else if (
    isRecord(unwrapped)
  ) {
    const candidate =
      unwrapped.items ??
      unwrapped.events ??
      unwrapped.records;

    if (
      Array.isArray(candidate)
    ) {
      rows = candidate;
    }
  }

  return rows
    .map(
      (
        raw,
        index,
      ):
        | ContainerTimelineEvent
        | null => {
        if (!isRecord(raw)) {
          return null;
        }

        const type =
          readString(
            raw,
            [
              'type',
              'eventType',
              'code',
            ],
          ) ??
          'EVENT';

        const createdAt =
          readString(
            raw,
            [
              'createdAt',
              'occurredAt',
              'eventAt',
              'timestamp',
            ],
          );

        if (!createdAt) {
          return null;
        }

        const actor =
          asRecord(
            raw.actor ??
              raw.user,
          );

        return {
          id:
            readString(
              raw,
              ['id'],
            ) ??
            `event-${index}`,

          type,

          title:
            readString(
              raw,
              [
                'title',
                'eventName',
              ],
            ) ??
            getEventTitle(
              type,
            ),

          description:
            readString(
              raw,
              [
                'description',
                'message',
                'notes',
              ],
            ) ??
            null,

          createdAt,

          actorName:
            readString(
              raw,
              [
                'actorName',
                'username',
              ],
            ) ??
            readString(
              actor,
              [
                'name',
                'email',
              ],
            ) ??
            null,

          metadata:
            isRecord(
              raw.metadata,
            )
              ? raw.metadata
              : undefined,
        };
      },
    )
    .filter(
      (
        event,
      ): event is ContainerTimelineEvent =>
        event !== null,
    )
    .sort(
      (left, right) =>
        Date.parse(
          right.createdAt,
        ) -
        Date.parse(
          left.createdAt,
        ),
    );
}

export const containerApi = {
  async list(
    search?: string,
  ): Promise<
    ContainerListItem[]
  > {
    const query =
      search?.trim()
        ? `?search=${encodeURIComponent(
            search.trim(),
          )}`
        : '';

    const response =
      await apiClient.get<unknown>(
        `/containers${query}`,
      );

    return normalizeList(
      response,
    );
  },

  async getDetail(
    visitId: string,
  ): Promise<ContainerDetail> {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}`,
      );

    return normalizeDetail(
      response,
      visitId,
    );
  },

  async getEvents(
    visitId: string,
  ): Promise<
    ContainerTimelineEvent[]
  > {
    try {
      const response =
        await apiClient.get<unknown>(
          `/containers/${encodeURIComponent(
            visitId,
          )}/events`,
        );

      return normalizeEvents(
        response,
      );
    } catch {
      /*
       * Timeline phụ không được làm
       * Container Detail fail toàn bộ.
       */
      return [];
    }
  },
};
