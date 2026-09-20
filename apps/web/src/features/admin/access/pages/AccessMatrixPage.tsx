import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  adminAccessApi,
} from '../api/admin-access.api';

import type {
  AdminBootstrap,
  AdminPermission,
} from '../admin-access.types';

import './AdminAccess.css';

const EMPTY_BOOTSTRAP: AdminBootstrap = {
  users: [],
  roles: [],
  permissions: [],
  currentUserId: null,
};

function permissionGroup(permission: AdminPermission): string {
  if (permission.group) {
    return permission.group;
  }

  if (permission.code.includes('.')) {
    return permission.code.split('.')[0];
  }

  return 'other';
}

export function AccessMatrixPage() {
  const [data, setData] = useState<AdminBootstrap>(EMPTY_BOOTSTRAP);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await adminAccessApi.getBootstrap());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải Access Matrix.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () =>
      Array.from(
        new Set(data.permissions.map(permissionGroup)),
      ).sort(),
    [data.permissions],
  );

  const permissions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return data.permissions.filter((permission) => {
      if (group !== 'ALL' && permissionGroup(permission) !== group) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        permission.code,
        permission.name,
        permission.description,
      ].some((value) => value?.toLowerCase().includes(needle) ?? false);
    });
  }, [data.permissions, search, group]);

  const rolePermissionSets = useMemo(
    () =>
      new Map(
        data.roles.map((role) => [
          role.id,
          new Set(role.permissions),
        ]),
      ),
    [data.roles],
  );

  if (loading) {
    return (
      <div className="admin-access-state">
        <div className="admin-access-spinner" />
        <strong>Đang tải Access Matrix</strong>
      </div>
    );
  }

  return (
    <div className="admin-access-page">
      <div className="admin-access-toolbar">
        <div>
          <span>ADMIN CENTER · RBAC</span>
          <h2>Roles & Permissions</h2>
          <p>Ma trận quyền thực tế từ backend bootstrap.</p>
        </div>

        <div>
          <Link to="/admin/users">← Users</Link>

          <button
            type="button"
            onClick={() => {
              void load();
            }}
          >
            ↻ Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-access-message admin-access-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <section className="access-matrix-summary">
        <article>
          <span>ROLES</span>
          <strong>{data.roles.length}</strong>
        </article>

        <article>
          <span>PERMISSIONS</span>
          <strong>{data.permissions.length}</strong>
        </article>

        <article>
          <span>MODE</span>
          <strong>READ ONLY</strong>
        </article>
      </section>

      <section className="admin-access-panel">
        <div className="access-matrix-filterbar">
          <div className="admin-user-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Permission code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="ALL">Tất cả module</option>
            {groups.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="access-matrix-wrapper">
          <table className="access-matrix-table">
            <thead>
              <tr>
                <th className="access-matrix-permission-column">
                  PERMISSION
                </th>

                {data.roles.map((role) => (
                  <th key={role.id}>
                    <strong>{role.code}</strong>
                    <small>{role.name}</small>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.code}>
                  <td className="access-matrix-permission-column">
                    <code>{permission.code}</code>
                    {permission.name && <strong>{permission.name}</strong>}
                    {permission.description && (
                      <small>{permission.description}</small>
                    )}
                  </td>

                  {data.roles.map((role) => {
                    const granted =
                      rolePermissionSets.get(role.id)?.has(permission.code) ??
                      false;

                    return (
                      <td key={role.id} className="access-matrix-check-cell">
                        <span
                          className={
                            granted
                              ? 'access-matrix-check access-matrix-check--granted'
                              : 'access-matrix-check access-matrix-check--denied'
                          }
                          aria-label={
                            granted ? 'Có quyền' : 'Không có quyền'
                          }
                        >
                          {granted ? '✓' : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-access-note">
        <strong>Access Matrix hiện là read-only</strong>
        <p>
          RC1 không công bố endpoint mutate Role Permission. Frontend chỉ phản ánh
          quyền do backend cấp và không tự thay đổi RBAC bằng state phía client.
        </p>
      </section>
    </div>
  );
}

export default AccessMatrixPage;
