import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  ManifestContainer,
  ManifestDetail,
  ManifestHouseBl,
  ManifestListItem,
  ManifestMasterBl,
} from '../manifest.types';

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

function readArray(
  source: UnknownRecord,
  keys: string[],
): unknown[] {
  for (const key of keys) {
    const value =
      source[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  return [];
}

function normalizeContainer(
  raw: unknown,
  index: number,
): ManifestContainer | null {
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
      `container-${index}`,

    visitId:
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
      null,

    containerNumber,

    size:
      readString(
        raw,
        ['size'],
      ) ??
      readString(
        container,
        ['size'],
      ) ??
      null,

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
      ) ??
      null,

    isoCode:
      readString(
        raw,
        ['isoCode'],
      ) ??
      readString(
        container,
        ['isoCode'],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      null,
  };
}

function normalizeHouseBl(
  raw: unknown,
  index: number,
): ManifestHouseBl | null {
  if (!isRecord(raw)) {
    return null;
  }

  const consignee =
    asRecord(
      raw.consignee,
    );

  const number =
    readString(
      raw,
      [
        'number',
        'hblNumber',
        'houseBlNumber',
      ],
    );

  if (!number) {
    return null;
  }

  const containers =
    readArray(
      raw,
      [
        'containers',
        'containerVisits',
        'visits',
      ],
    )
      .map(
        normalizeContainer,
      )
      .filter(
        (
          item,
        ): item is ManifestContainer =>
          item !== null,
      );

  return {
    id:
      readString(
        raw,
        ['id'],
      ) ??
      `hbl-${index}`,

    number,

    consigneeName:
      readString(
        raw,
        [
          'consigneeName',
        ],
      ) ??
      readString(
        consignee,
        [
          'name',
          'companyName',
        ],
      ) ??
      null,

    containers,
  };
}

function normalizeMasterBl(
  raw: unknown,
  index: number,
): ManifestMasterBl | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    asRecord(
      raw.shippingLine,
    );

  const number =
    readString(
      raw,
      [
        'number',
        'mblNumber',
        'masterBlNumber',
      ],
    );

  if (!number) {
    return null;
  }

  const houseBls =
    readArray(
      raw,
      [
        'houseBls',
        'hbls',
        'houseBills',
      ],
    )
      .map(
        normalizeHouseBl,
      )
      .filter(
        (
          item,
        ): item is ManifestHouseBl =>
          item !== null,
      );

  return {
    id:
      readString(
        raw,
        ['id'],
      ) ??
      `mbl-${index}`,

    number,

    shippingLineName:
      readString(
        raw,
        [
          'shippingLineName',
        ],
      ) ??
      readString(
        shippingLine,
        [
          'name',
          'code',
        ],
      ) ??
      null,

    houseBls,
  };
}

function normalizeListItem(
  raw: unknown,
  index: number,
): ManifestListItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    asRecord(
      raw.shippingLine,
    );

  const manifestNumber =
    readString(
      raw,
      [
        'manifestNumber',
        'number',
        'code',
      ],
    );

  if (!manifestNumber) {
    return null;
  }

  const masterBls =
    readArray(
      raw,
      [
        'masterBls',
        'mbls',
      ],
    );

  const directHouseBls =
    readArray(
      raw,
      [
        'houseBls',
        'hbls',
      ],
    );

  const directContainers =
    readArray(
      raw,
      [
        'containers',
        'containerVisits',
      ],
    );

  const inferredHouseBlCount =
    masterBls.reduce(
      (
        total: number,
        masterBl,
      ) => {
        if (
          !isRecord(masterBl)
        ) {
          return total;
        }

        return (
          total +
          readArray(
            masterBl,
            [
              'houseBls',
              'hbls',
            ],
          ).length
        );
      },
      0,
    );

  return {
    id:
      readString(
        raw,
        ['id'],
      ) ??
      `manifest-${index}`,

    manifestNumber,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'UNKNOWN',

    vesselName:
      readString(
        raw,
        [
          'vesselName',
          'vessel',
        ],
      ) ??
      null,

    voyageNumber:
      readString(
        raw,
        [
          'voyageNumber',
          'voyage',
        ],
      ) ??
      null,

    shippingLineName:
      readString(
        raw,
        [
          'shippingLineName',
        ],
      ) ??
      readString(
        shippingLine,
        [
          'name',
          'code',
        ],
      ) ??
      null,

    eta:
      readString(
        raw,
        [
          'eta',
          'estimatedArrivalAt',
        ],
      ) ??
      null,

    ata:
      readString(
        raw,
        [
          'ata',
          'actualArrivalAt',
        ],
      ) ??
      null,

    masterBlCount:
      readNumber(
        raw,
        [
          'masterBlCount',
          'mblCount',
        ],
      ) ??
      masterBls.length,

    houseBlCount:
      readNumber(
        raw,
        [
          'houseBlCount',
          'hblCount',
        ],
      ) ??
      (
        directHouseBls.length > 0
          ? directHouseBls.length
          : inferredHouseBlCount
      ),

    containerCount:
      readNumber(
        raw,
        [
          'containerCount',
          'visitCount',
        ],
      ) ??
      directContainers.length,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,
  };
}

function normalizeList(
  response: unknown,
): ManifestListItem[] {
  const unwrapped =
    unwrapData(
      response,
    );

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
      unwrapped.manifests;

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
      ): item is ManifestListItem =>
        item !== null,
    );
}

function normalizeDetail(
  response: unknown,
  manifestId: string,
): ManifestDetail {
  const unwrapped =
    unwrapData(
      response,
    );

  const root =
    asRecord(
      unwrapped,
    );

  const shippingLine =
    asRecord(
      root.shippingLine,
    );

  const masterBls =
    readArray(
      root,
      [
        'masterBls',
        'mbls',
        'masterBills',
      ],
    )
      .map(
        normalizeMasterBl,
      )
      .filter(
        (
          item,
        ): item is ManifestMasterBl =>
          item !== null,
      );

  return {
    id:
      readString(
        root,
        ['id'],
      ) ??
      manifestId,

    manifestNumber:
      readString(
        root,
        [
          'manifestNumber',
          'number',
          'code',
        ],
      ) ??
      'UNKNOWN',

    status:
      readString(
        root,
        ['status'],
      ) ??
      'UNKNOWN',

    vesselName:
      readString(
        root,
        [
          'vesselName',
          'vessel',
        ],
      ) ??
      null,

    voyageNumber:
      readString(
        root,
        [
          'voyageNumber',
          'voyage',
        ],
      ) ??
      null,

    shippingLineName:
      readString(
        root,
        [
          'shippingLineName',
        ],
      ) ??
      readString(
        shippingLine,
        [
          'name',
          'code',
        ],
      ) ??
      null,

    eta:
      readString(
        root,
        [
          'eta',
          'estimatedArrivalAt',
        ],
      ) ??
      null,

    ata:
      readString(
        root,
        [
          'ata',
          'actualArrivalAt',
        ],
      ) ??
      null,

    notes:
      readString(
        root,
        [
          'notes',
          'description',
        ],
      ) ??
      null,

    masterBls,

    createdAt:
      readString(
        root,
        ['createdAt'],
      ) ??
      null,

    updatedAt:
      readString(
        root,
        ['updatedAt'],
      ) ??
      null,
  };
}

export const manifestApi = {
  async list(): Promise<
    ManifestListItem[]
  > {
    const response =
      await apiClient.get<unknown>(
        '/manifests',
      );

    return normalizeList(
      response,
    );
  },

  async getDetail(
    manifestId: string,
  ): Promise<ManifestDetail> {
    const response =
      await apiClient.get<unknown>(
        `/manifests/${encodeURIComponent(
          manifestId,
        )}`,
      );

    return normalizeDetail(
      response,
      manifestId,
    );
  },
};
