import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  adminAccessApi,
} from '../api/admin-access.api';

import type {
  AdminBootstrap,
  AdminUser,
} from '../admin-access.types';

import './AdminAccess.css';

const EMPTY_BOOTSTRAP: AdminBootstrap = {
  users: [],
  roles: [],
  permissions: [],
  currentUserId: null,
};

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('vi-VN');
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (
      error as {
        body?: {
          error?: {
            message?: string;
          };
          message?: string | string[];
        };
      }
    ).body;

    if (body?.error?.message) {
      return body.error.message;
    }

    if (typeof body?.message === 'string') {
      return body.message;
    }

    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Không thể xử lý người dùng.';
}

function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'admin-user-status admin-user-status--active'
          : 'admin-user-status admin-user-status--inactive'
      }
    >
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

export function AdminUsersPage() {
  const [data, setData] = useState<AdminBootstrap>(EMPTY_BOOTSTRAP);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await adminAccessApi.getBootstrap());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roleMap = useMemo(
    () => new Map(data.roles.map((role) => [role.id, role])),
    [data.roles],
  );

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toUpperCase();

    return data.users.filter((user) => {
      if (roleFilter !== 'ALL' && user.roleCode !== roleFilter) {
        return false;
      }

      if (statusFilter === 'ACTIVE' && !user.active) {
        return false;
      }

      if (statusFilter === 'INACTIVE' && user.active) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        user.email,
        user.name,
        user.roleCode,
        user.roleName,
      ].some((value) => value?.toUpperCase().includes(needle) ?? false);
    });
  }, [data.users, search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: data.users.length,
      active: data.users.filter((user) => user.active).length,
      inactive: data.users.filter((user) => !user.active).length,
      admins: data.users.filter((user) => user.roleCode === 'ADMIN').length,
    }),
    [data.users],
  );

  function openEdit(user: AdminUser) {
    const resolvedRole = data.roles.find(
      (role) => role.id === user.roleId || role.code === user.roleCode,
    );

    setEditingUser(user);
    setFormName(user.name);
    setFormRoleId(resolvedRole?.id ?? '');
    setFormActive(user.active);
    setError(null);
    setSuccess(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    const selectedRole = roleMap.get(formRoleId);

    if (!formName.trim()) {
      setError('Tên người dùng không được để trống.');
      return;
    }

    if (!selectedRole) {
      setError('Vui lòng chọn Role.');
      return;
    }

    const isSelf = editingUser.id === data.currentUserId;

    if (isSelf && !formActive) {
      setError('ADMIN không thể tự deactivate tài khoản đang đăng nhập.');
      return;
    }

    if (
      isSelf &&
      editingUser.roleCode === 'ADMIN' &&
      selectedRole.code !== 'ADMIN'
    ) {
      setError('ADMIN không thể tự bỏ role ADMIN của chính mình.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await adminAccessApi.updateUser(editingUser.id, {
        name: formName,
        roleId: selectedRole.id,
        roleCode: selectedRole.code,
        active: formActive,
      });

      setEditingUser(null);
      setSuccess(
        `Đã cập nhật ${editingUser.email}. Nếu Role hoặc trạng thái thay đổi, backend sẽ revoke phiên đăng nhập của user theo policy.`,
      );

      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    const isSelf = user.id === data.currentUserId;

    if (isSelf && user.active) {
      setError('Bạn không thể tự deactivate tài khoản đang đăng nhập.');
      return;
    }

    const role = data.roles.find(
      (item) => item.id === user.roleId || item.code === user.roleCode,
    );

    if (!role) {
      setError('Không xác định được Role của user.');
      return;
    }

    const nextActive = !user.active;
    const message = nextActive
      ? `Kích hoạt lại ${user.email}?`
      : `Deactivate ${user.email}?\n\nUser sẽ phải đăng nhập lại nếu backend revoke refresh token.`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      setActionId(user.id);
      setError(null);
      setSuccess(null);

      await adminAccessApi.updateUser(user.id, {
        name: user.name,
        roleId: role.id,
        roleCode: role.code,
        active: nextActive,
      });

      setSuccess(
        nextActive
          ? `Đã kích hoạt ${user.email}.`
          : `Đã deactivate ${user.email}.`,
      );

      await load();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="admin-access-state">
        <div className="admin-access-spinner" />
        <strong>Đang tải Users & Roles</strong>
      </div>
    );
  }

  return (
    <div className="admin-access-page">
      <div className="admin-access-toolbar">
        <div>
          <span>ADMIN CENTER · RBAC</span>
          <h2>Users</h2>
          <p>Quản lý tên, Role và trạng thái tài khoản ICD.</p>
        </div>

        <div>
          <Link to="/admin/roles">Access Matrix →</Link>

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

      {success && (
        <div className="admin-access-message admin-access-message--success">
          <strong>✓</strong>
          {success}
        </div>
      )}

      <section className="admin-access-kpis">
        <article>
          <span>USERS</span>
          <strong>{stats.total}</strong>
        </article>

        <article>
          <span>ACTIVE</span>
          <strong>{stats.active}</strong>
        </article>

        <article>
          <span>INACTIVE</span>
          <strong>{stats.inactive}</strong>
        </article>

        <article>
          <span>ADMIN</span>
          <strong>{stats.admins}</strong>
        </article>
      </section>

      <section className="admin-access-panel">
        <div className="admin-user-filterbar">
          <div className="admin-user-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Email, tên, role..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="ALL">Tất cả Role</option>
            {data.roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.code}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">Tất cả status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="admin-access-table-wrapper">
          <table className="admin-access-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>LAST LOGIN</th>
                <th>UPDATED</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === data.currentUserId;

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                      {isSelf && <span className="admin-self-badge">YOU</span>}
                    </td>

                    <td>
                      <span className="admin-role-badge">
                        {user.roleCode ?? user.roleName ?? '—'}
                      </span>
                    </td>

                    <td>
                      <UserStatusBadge active={user.active} />
                    </td>

                    <td>{formatDateTime(user.lastLoginAt)}</td>
                    <td>{formatDateTime(user.updatedAt)}</td>

                    <td>
                      <div className="admin-user-actions">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionId === user.id || (isSelf && user.active)
                          }
                          className={
                            user.active
                              ? 'admin-user-action--danger'
                              : 'admin-user-action--activate'
                          }
                          onClick={() => {
                            void toggleActive(user);
                          }}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="admin-access-empty">Không có user phù hợp.</div>
          )}
        </div>
      </section>

      <section className="admin-access-note">
        <strong>User creation</strong>
        <p>
          RC1 hiện chỉ công bố bootstrap và PATCH user. Web không hiển thị nút
          “Tạo user” cho đến khi backend expose contract create-user chính thức.
        </p>
      </section>

      {editingUser && (
        <div
          className="admin-access-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setEditingUser(null);
            }
          }}
        >
          <form
            className="admin-user-modal"
            onSubmit={(event) => {
              void save(event);
            }}
          >
            <div className="admin-user-modal__heading">
              <div>
                <span>UPDATE USER</span>
                <h3>{editingUser.email}</h3>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                disabled={submitting}
                onClick={() => setEditingUser(null)}
              >
                ×
              </button>
            </div>

            <label className="admin-user-field">
              <span>Email</span>
              <input value={editingUser.email} disabled />
            </label>

            <label className="admin-user-field">
              <span>Tên *</span>
              <input
                value={formName}
                disabled={submitting}
                onChange={(event) => setFormName(event.target.value)}
              />
            </label>

            <label className="admin-user-field">
              <span>Role *</span>
              <select
                value={formRoleId}
                disabled={submitting}
                onChange={(event) => setFormRoleId(event.target.value)}
              >
                <option value="">Chọn Role</option>
                {data.roles.map((role) => {
                  const selfAdmin =
                    editingUser.id === data.currentUserId &&
                    editingUser.roleCode === 'ADMIN';

                  return (
                    <option
                      key={role.id}
                      value={role.id}
                      disabled={selfAdmin && role.code !== 'ADMIN'}
                    >
                      {role.code}
                      {role.name !== role.code ? ` · ${role.name}` : ''}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="admin-user-switch">
              <input
                type="checkbox"
                checked={formActive}
                disabled={
                  submitting ||
                  (editingUser.id === data.currentUserId && formActive)
                }
                onChange={(event) => setFormActive(event.target.checked)}
              />
              <span>Tài khoản Active</span>
            </label>

            <div className="admin-user-session-warning">
              <strong>Session policy</strong>
              <span>
                Khi Role hoặc trạng thái account thay đổi, backend phải revoke
                refresh token để quyền mới có hiệu lực ngay.
              </span>
            </div>

            <div className="admin-user-modal__actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setEditingUser(null)}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-access-primary"
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
