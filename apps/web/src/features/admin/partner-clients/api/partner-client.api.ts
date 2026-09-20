import {
  apiClient,
} from '../../../../services/api/api-client';

import type {
  CreatePartnerApiClientInput,
  PartnerApiClient,
  PartnerApiKeyReveal,
} from '../partner-client.types';

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

function readArray(
  source: UnknownRecord,
  keys: string[],
): unknown[] {
  for (const key of keys) {
    const value =
      source[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function readStringArray(
  source: UnknownRecord,
  keys: string[],
): string[] {
  return readArray(
    source,
    keys,
  ).filter(
    (
      item,
    ): item is string =>
      typeof item === 'string',
  );
}

function normalizeClient(
  raw: unknown,
): PartnerApiClient | null {
  if (!isRecord(raw)) {
    return null;
  }

  const createdBy =
    asRecord(
      raw.createdBy ??
        raw.creator,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'partnerApiClientId',
        'clientId',
      ],
    );

  const partnerCode =
    readString(
      raw,
      [
        'partnerCode',
        'code',
      ],
    );

  const partnerName =
    readString(
      raw,
      [
        'partnerName',
        'name',
      ],
    );

  if (
    !id ||
    !partnerCode ||
    !partnerName
  ) {
    return null;
  }

  return {
    id,

    partnerCode,

    partnerName,

    description:
      readString(
        raw,
        ['description'],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'ACTIVE',

    /*
     * Tuyệt đối không normalize
     * apiKeyHash/api_key_hash.
     */
    keyLast4:
      readString(
        raw,
        [
          'keyLast4',
          'last4',
        ],
      ) ??
      null,

    scopes:
      readStringArray(
        raw,
        [
          'scopes',
          'allowedScopes',
        ],
      ),

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    rotatedAt:
      readString(
        raw,
        ['rotatedAt'],
      ) ??
      null,

    revokedAt:
      readString(
        raw,
        ['revokedAt'],
      ) ??
      null,

    lastRequestAt:
      readString(
        raw,
        [
          'lastRequestAt',
          'lastUsedAt',
        ],
      ) ??
      null,

    createdByName:
      readString(
        raw,
        ['createdByName'],
      ) ??
      readString(
        createdBy,
        [
          'name',
          'email',
        ],
      ) ??
      null,
  };
}

function extractRows(
  response: unknown,
): unknown[] {
  const root =
    unwrapData(response);

  if (Array.isArray(root)) {
    return root;
  }

  if (!isRecord(root)) {
    return [];
  }

  for (const key of [
    'items',
    'partnerClients',
    'clients',
    'records',
  ]) {
    if (
      Array.isArray(
        root[key],
      )
    ) {
      return root[
        key
      ] as unknown[];
    }
  }

  return [];
}

function requireClient(
  response: unknown,
): PartnerApiClient {
  const unwrapped =
    unwrapData(response);

  const root =
    asRecord(unwrapped);

  const client =
    normalizeClient(
      root.client ??
        root.partnerClient ??
        root.partnerApiClient ??
        root,
    );

  if (!client) {
    throw new Error(
      'Backend không trả Partner API Client hợp lệ.',
    );
  }

  return client;
}

function requireReveal(
  response: unknown,
): PartnerApiKeyReveal {
  const unwrapped =
    unwrapData(response);

  const root =
    asRecord(unwrapped);

  const client =
    normalizeClient(
      root.client ??
        root.partnerClient ??
        root.partnerApiClient ??
        root,
    );

  const apiKey =
    readString(
      root,
      [
        'apiKey',
        'plaintextApiKey',
        'plainApiKey',
        'secret',
        'key',
      ],
    );

  if (
    !client ||
    !apiKey
  ) {
    throw new Error(
      'Backend không trả plaintext API Key. Key chỉ có thể hiển thị tại response create/rotate.',
    );
  }

  return {
    client,
    apiKey,
  };
}

export const partnerClientApi = {
  async list():
    Promise<
      PartnerApiClient[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/admin/partner-clients',
      );

    return extractRows(
      response,
    )
      .map(
        normalizeClient,
      )
      .filter(
        (
          item,
        ): item is PartnerApiClient =>
          item !== null,
      );
  },

  async getById(
    id: string,
  ): Promise<PartnerApiClient> {
    const response =
      await apiClient.get<unknown>(
        `/admin/partner-clients/${encodeURIComponent(
          id,
        )}`,
      );

    return requireClient(
      response,
    );
  },

  async create(
    input:
      CreatePartnerApiClientInput,
  ): Promise<PartnerApiKeyReveal> {
    const response =
      await apiClient.post<unknown>(
        '/admin/partner-clients',
        {
          partnerCode:
            input.partnerCode
              .trim()
              .toUpperCase(),

          partnerName:
            input.partnerName.trim(),

          ...(input.description
            ?.trim()
            ? {
                description:
                  input.description.trim(),
              }
            : {}),

          scopes:
            input.scopes,
        },
      );

    return requireReveal(
      response,
    );
  },

  async rotate(
    id: string,
  ): Promise<PartnerApiKeyReveal> {
    const response =
      await apiClient.post<unknown>(
        `/admin/partner-clients/${encodeURIComponent(
          id,
        )}/rotate`,
        {},
      );

    return requireReveal(
      response,
    );
  },

  async revoke(
    id: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/admin/partner-clients/${encodeURIComponent(
        id,
      )}/revoke`,
      {},
    );
  },
};
