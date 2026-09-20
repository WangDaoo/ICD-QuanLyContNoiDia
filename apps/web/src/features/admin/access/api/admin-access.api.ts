import { apiClient } from '../../../../services/api/api-client';
import type {
  AdminBootstrap,
  AdminPermission,
  AdminRole,
  AdminUser,
  UpdateAdminUserInput,
} from '../admin-access.types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && 'data' in value) {
    return value.data;
  }
  return value;
}

function readString(source: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function readBoolean(source: UnknownRecord, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function readArray(source: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function normalizePermissionCode(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim()) {
    return raw;
  }
  if (!isRecord(raw)) {
    return null;
  }
  return readString(raw, ['code', 'permissionCode', 'key', 'name']) ?? null;
}

function normalizePermission(raw: unknown): AdminPermission | null {
  if (typeof raw === 'string') {
    return {
      code: raw,
      group: raw.includes('.') ? raw.split('.')[0] : 'other',
    };
  }

  if (!isRecord(raw)) {
    return null;
  }

  const code = normalizePermissionCode(raw);
  if (!code) {
    return null;
  }

  return {
    id: readString(raw, ['id']) ?? null,
    code,
    name: readString(raw, ['displayName', 'name', 'label']) ?? null,
    description: readString(raw, ['description']) ?? null,
    group:
      readString(raw, ['group', 'module', 'category']) ??
      (code.includes('.') ? code.split('.')[0] : 'other'),
  };
}

function normalizeRole(raw: unknown): AdminRole | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, ['id', 'roleId']);
  const code = readString(raw, ['code', 'roleCode', 'key', 'name']);

  if (!id || !code) {
    return null;
  }

  const permissions = readArray(raw, ['permissions', 'rolePermissions'])
    .map(normalizePermissionCode)
    .filter((value): value is string => value !== null);

  return {
    id,
    code: code.toUpperCase(),
    name: readString(raw, ['displayName', 'label', 'name']) ?? code,
    description: readString(raw, ['description']) ?? null,
    permissions: Array.from(new Set(permissions)),
  };
}

function normalizeUser(raw: unknown): AdminUser | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, ['id', 'userId']);
  const email = readString(raw, ['email']);

  if (!id || !email) {
    return null;
  }

  const directRole = asRecord(raw.role);
  const roleList = readArray(raw, ['roles', 'userRoles']);
  const firstRole = roleList.length > 0 ? asRecord(roleList[0]) : {};
  const role = Object.keys(directRole).length > 0 ? directRole : firstRole;

  const roleId =
    readString(raw, ['roleId']) ??
    readString(role, ['id', 'roleId']) ??
    null;

  const roleCode =
    readString(raw, ['roleCode', 'role']) ??
    readString(role, ['code', 'roleCode', 'name']) ??
    null;

  const explicitActive = readBoolean(raw, ['active', 'isActive', 'enabled']);
  const status = readString(raw, ['status']);
  const active =
    explicitActive ??
    (status
      ? !['INACTIVE', 'DISABLED', 'DEACTIVATED'].includes(status.toUpperCase())
      : true);

  return {
    id,
    email,
    name: readString(raw, ['name', 'displayName', 'fullName']) ?? email,
    active,
    status: status ?? (active ? 'ACTIVE' : 'INACTIVE'),
    roleId,
    roleCode: roleCode?.toUpperCase() ?? null,
    roleName: readString(role, ['displayName', 'label', 'name']) ?? roleCode ?? null,
    createdAt: readString(raw, ['createdAt']) ?? null,
    updatedAt: readString(raw, ['updatedAt']) ?? null,
    lastLoginAt: readString(raw, ['lastLoginAt', 'lastSignedInAt']) ?? null,
  };
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }
  if (
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: unknown }).response !== null &&
    'status' in ((error as { response: { status: unknown } }).response) &&
    typeof ((error as { response: { status: unknown } }).response).status === 'number'
  ) {
    return ((error as { response: { status: number } }).response).status;
  }
  return undefined;
}

async function patchWithValidationFallback(
  url: string,
  bodies: Record<string, unknown>[],
): Promise<void> {
  let lastError: unknown = null;

  for (let index = 0; index < bodies.length; index += 1) {
    try {
      await apiClient.patch<unknown>(url, bodies[index]);
      return;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      const hasNext = index < bodies.length - 1;

      /*
       * Chỉ thử DTO variant khác khi request bị từ chối ở validation layer (400/422).
       * Không retry 409 / 500.
       */
      if (!hasNext || (status !== 400 && status !== 422)) {
        throw error;
      }
    }
  }

  throw lastError;
}

function normalizeBootstrap(response: unknown, meResponse: unknown): AdminBootstrap {
  const root = asRecord(unwrapData(response));
  const access = asRecord(root.access ?? root.rbac ?? root.authorization);

  const usersRaw = readArray(root, ['users']);
  const rolesRaw = [
    ...readArray(root, ['roles']),
    ...(readArray(root, ['roles']).length === 0 ? readArray(access, ['roles']) : []),
  ];
  const permissionsRaw = [
    ...readArray(root, ['permissions']),
    ...(readArray(root, ['permissions']).length === 0 ? readArray(access, ['permissions']) : []),
  ];

  const users = usersRaw.map(normalizeUser).filter((item): item is AdminUser => item !== null);
  const roles = rolesRaw.map(normalizeRole).filter((item): item is AdminRole => item !== null);

  const permissionMap = new Map<string, AdminPermission>();

  permissionsRaw
    .map(normalizePermission)
    .filter((item): item is AdminPermission => item !== null)
    .forEach((permission) => {
      permissionMap.set(permission.code, permission);
    });

  /*
   * Nếu bootstrap chỉ embed permissions trong roles, vẫn tạo global matrix.
   */
  roles.forEach((role) => {
    role.permissions.forEach((code) => {
      if (!permissionMap.has(code)) {
        permissionMap.set(code, {
          code,
          group: code.includes('.') ? code.split('.')[0] : 'other',
        });
      }
    });
  });

  const meRoot = asRecord(unwrapData(meResponse));
  const me = asRecord(meRoot.user ?? meRoot.me ?? meRoot);

  return {
    users,
    roles,
    permissions: Array.from(permissionMap.values()).sort((left, right) =>
      left.code.localeCompare(right.code),
    ),
    currentUserId:
      readString(me, ['id', 'userId']) ??
      readString(root, ['currentUserId', 'actorUserId']) ??
      null,
  };
}

export const adminAccessApi = {
  async getBootstrap(): Promise<AdminBootstrap> {
    const [bootstrapResponse, meResponse] = await Promise.all([
      apiClient.get<unknown>('/admin/bootstrap'),
      apiClient.get<unknown>('/auth/me'),
    ]);

    return normalizeBootstrap(bootstrapResponse, meResponse);
  },

  async updateUser(userId: string, input: UpdateAdminUserInput): Promise<void> {
    const name = input.name.trim();
    const url = `/admin/users/${encodeURIComponent(userId)}`;

    /*
     * RC1 công bố PATCH user nhưng tài liệu public không mô tả exact DTO field names.
     * Các variant chỉ được thử tiếp khi validation trả 400/422.
     * Không retry business conflict.
     */
    await patchWithValidationFallback(url, [
      {
        name,
        roleId: input.roleId,
        active: input.active,
      },
      {
        name,
        roleId: input.roleId,
        isActive: input.active,
      },
      {
        name,
        roleCode: input.roleCode,
        active: input.active,
      },
      {
        name,
        role: input.roleCode,
        isActive: input.active,
      },
      {
        name,
        roleId: input.roleId,
        status: input.active ? 'ACTIVE' : 'INACTIVE',
      },
    ]);
  },
};
