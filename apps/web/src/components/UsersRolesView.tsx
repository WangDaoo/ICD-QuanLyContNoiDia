import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, ShieldCheck, Plus, UserCog, AlertTriangle } from 'lucide-react';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, DetailAvailability } from './CollectionState';
import { ConfirmDialog } from './ConfirmDialog';

export const UsersRolesView: React.FC = () => {
  const {
    currentUser,
    permissions = [],
    detailStatus,
    managedUsers,
    roles,
    createManagedUser,
    updateUserRoles,
    toggleUserStatus,
    setRolePermissions,
  } = useApp();
  const can = (permission: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === permission) ?? false;
  const action = useCommandAction();
  const validation = useFormValidation();
  const [tabValue, setTab] = useViewQueryState('users-roles', 'section', 'USERS');
  const tab = tabValue === 'USERS' || tabValue === 'ROLES' ? tabValue : 'USERS';
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleCodes: [] as string[],
  });
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [passwordTooShort, setPasswordTooShort] = useState(false);

  // Role permissions: draft-edit mode (USERS-03)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [permDraft, setPermDraft] = useState<string[] | null>(null);
  const [showSavePermDialog, setShowSavePermDialog] = useState(false);

  // Roles view mode (USERS-04)
  const [rolesView, setRolesView] = useState<'CARD' | 'MATRIX'>('MATRIX');

  // Self-deactivation guard state (USERS-05)
  const [selfGuardMsg, setSelfGuardMsg] = useState<string | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<{ id: string; name: string } | null>(null);

  const PERMISSIONS_CATALOG = useMemo(() => permissions, [permissions]);

  const getRoleName = (code: string): string => {
    const role = roles.find((r) => r.code === code);
    return role?.name ?? code;
  };

  const getPermissionLabel = (code: string): string => {
    const perm = permissions.find((p) => p.code === code);
    // Use description if it looks like Vietnamese (heuristic: has diacritics or no dot)
    if (perm?.description && perm.description !== code) return perm.description;
    // Fallback: format code nicely
    return code;
  };

  const toggleRoleCode = (code: string) => {
    setUserForm((f) => ({
      ...f,
      roleCodes: f.roleCodes.includes(code)
        ? f.roleCodes.filter((c) => c !== code)
        : [...f.roleCodes, code],
    }));
  };

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMismatch(false);
    setPasswordTooShort(false);
    if (!can('users.manage') || action.isPending() || !validation.validate(e.currentTarget)) return;
    if (userForm.password.length < 12) {
      setPasswordTooShort(true);
      return;
    }
    if (userForm.password !== userForm.confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    const result = await action.run(() =>
      createManagedUser(userForm.name.trim(), userForm.email.trim(), userForm.roleCodes, userForm.password),
    );
    if (result?.success) {
      setUserForm({ name: '', email: '', password: '', confirmPassword: '', roleCodes: [] });
      setShowUserForm(false);
    }
  };

  // Start editing role permissions (USERS-03)
  const startEditPermissions = (roleId: string, currentCodes: string[]) => {
    setEditingRoleId(roleId);
    setPermDraft([...currentCodes]);
  };

  const cancelEditPermissions = () => {
    setEditingRoleId(null);
    setPermDraft(null);
  };

  // Compute changes for confirm dialog summary
  const permChangeSummary = useMemo(() => {
    if (!editingRoleId || !permDraft) return { added: 0, removed: 0 };
    const role = roles.find((r) => r.id === editingRoleId);
    if (!role) return { added: 0, removed: 0 };
    const added = permDraft.filter((c) => !role.permissionCodes.includes(c)).length;
    const removed = role.permissionCodes.filter((c) => !permDraft.includes(c)).length;
    return { added, removed };
  }, [editingRoleId, permDraft, roles]);

  const handleToggleUserStatus = (u: { id: string; name: string; active: boolean }) => {
    // USERS-05: Block self-deactivation
    if (u.active && u.id === currentUser.id) {
      setSelfGuardMsg('Không thể vô hiệu hóa tài khoản đang đăng nhập.');
      return;
    }
    if (u.active) {
      setDeactivatingUser({ id: u.id, name: u.name });
      return;
    }
    void action.run(() => toggleUserStatus(u.id));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Người dùng & Phân quyền</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tài khoản người dùng và phân quyền theo vai trò trong hệ thống.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              aria-pressed={tab === 'USERS'}
              onClick={() => setTab('USERS')}
              className={`px-3 py-2 rounded-md text-xs font-bold ${tab === 'USERS' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Người dùng
            </button>
            <button
              aria-pressed={tab === 'ROLES'}
              onClick={() => setTab('ROLES')}
              className={`px-3 py-2 rounded-md text-xs font-bold ${tab === 'ROLES' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Vai trò
            </button>
          </div>
          {tab === 'USERS' && can('users.manage') && (
            <button
              onClick={() => setShowUserForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm người dùng
            </button>
          )}
        </div>
      </div>

      {!showUserForm && <CommandNotice notice={action.notice} />}

      {/* Self-guard notice (USERS-05) */}
      {selfGuardMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{selfGuardMsg}</span>
          <button
            onClick={() => setSelfGuardMsg(null)}
            className="ml-auto text-amber-600 font-bold"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      {tab === 'USERS' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-caption">
              <tr>
                <th className="text-left px-4 py-3">Họ tên</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Vai trò</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roleCodes.map((rc) => (
                        <span
                          key={rc}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-caption font-bold"
                          title={`Mã: ${rc}`}
                        >
                          {getRoleName(rc)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-caption font-bold ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {u.active ? 'Hoạt động' : 'Đã vô hiệu'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {can('users.manage') ? (
                      <>
                        <select
                          aria-label={`Vai trò của ${u.name}`}
                          disabled={action.pending}
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const codes = u.roleCodes.includes(e.target.value)
                              ? u.roleCodes.filter((c) => c !== e.target.value)
                              : [...u.roleCodes, e.target.value];
                            void action.run(() => updateUserRoles(u.id, codes));
                          }}
                          className="px-2 py-1 border border-slate-300 rounded-md text-caption bg-white"
                        >
                          <option value="">+/- vai trò...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.code}>
                              {u.roleCodes.includes(r.code)
                                ? `Bỏ ${r.name}`
                                : `Thêm ${r.name}`}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={action.pending}
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-3 py-1 rounded-md font-bold text-caption border ${u.active ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                        >
                          {u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </>
                    ) : (
                      <span>Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5}>
                  <CollectionState resource="managedUsers" count={managedUsers.length} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* Roles tab */
        <div className="space-y-4">
          {/* View mode toggle (USERS-04) */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              aria-pressed={rolesView === 'MATRIX'}
              onClick={() => setRolesView('MATRIX')}
              className={`px-3 py-2 rounded-md text-xs font-bold ${rolesView === 'MATRIX' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Dạng ma trận
            </button>
            <button
              aria-pressed={rolesView === 'CARD'}
              onClick={() => setRolesView('CARD')}
              className={`px-3 py-2 rounded-md text-xs font-bold ${rolesView === 'CARD' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Dạng thẻ
            </button>
          </div>

          <CollectionState resource="roles" count={roles.length} />

          {rolesView === 'MATRIX' ? (
            /* Matrix view (USERS-04) */
            <PermissionMatrix
              roles={roles}
              permissions={PERMISSIONS_CATALOG}
              editingRoleId={editingRoleId}
              permDraft={permDraft}
              canManage={can('roles.manage')}
              detailStatus={detailStatus}
              onStartEdit={startEditPermissions}
              onTogglePerm={(code) => {
                if (!permDraft) return;
                setPermDraft(
                  permDraft.includes(code)
                    ? permDraft.filter((c) => c !== code)
                    : [...permDraft, code],
                );
              }}
              onSave={() => setShowSavePermDialog(true)}
              onCancel={cancelEditPermissions}
              getPermissionLabel={getPermissionLabel}
            />
          ) : (
            /* Card view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> {r.name}{' '}
                      <span className="text-slate-400 font-mono text-caption">({r.code})</span>
                    </h4>
                    {can('roles.manage') &&
                      (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                        <button
                          onClick={() => {
                            if (editingRoleId === r.id) {
                              cancelEditPermissions();
                            } else {
                              startEditPermissions(r.id, r.permissionCodes);
                            }
                          }}
                          className="text-blue-600 font-bold text-caption flex items-center gap-1"
                        >
                          <UserCog className="w-3.5 h-3.5" /> {editingRoleId === r.id ? 'Đang sửa' : 'Sửa quyền'}
                        </button>
                      )}
                  </div>
                  <DetailAvailability resource="roles" id={r.id} />
                  <div className="flex flex-wrap gap-1">
                    {(editingRoleId === r.id && permDraft ? permDraft : r.permissionCodes).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-caption font-semibold"
                        title={`Mã: ${p}`}
                      >
                        {getPermissionLabel(p)}
                      </span>
                    ))}
                    {r.permissionCodes.length === 0 &&
                      !(editingRoleId === r.id && permDraft && permDraft.length > 0) &&
                      (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                        <span className="text-slate-400 italic text-caption">Chưa có quyền nào</span>
                      )}
                  </div>
                  {/* Draft editing section in card view */}
                  {can('roles.manage') &&
                    editingRoleId === r.id &&
                    permDraft !== null &&
                    (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-caption text-slate-500 mb-2">Chọn quyền để thêm/bỏ:</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <CollectionState resource="permissions" count={PERMISSIONS_CATALOG.length} />
                          {PERMISSIONS_CATALOG.map((perm) => {
                            const active = permDraft.includes(perm.code);
                            return (
                              <button
                                type="button"
                                disabled={action.pending}
                                aria-pressed={active}
                                key={perm.code}
                                onClick={() => {
                                  setPermDraft(
                                    active
                                      ? permDraft.filter((c) => c !== perm.code)
                                      : [...permDraft, perm.code],
                                  );
                                }}
                                title={`Mã: ${perm.code}`}
                                className={`px-2 py-1 rounded-md text-caption font-semibold border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                              >
                                {getPermissionLabel(perm.code)}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={action.pending}
                            onClick={() => setShowSavePermDialog(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-caption"
                          >
                            Lưu thay đổi
                          </button>
                          <button
                            type="button"
                            disabled={action.pending}
                            onClick={cancelEditPermissions}
                            className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-caption"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add user form modal */}
      {showUserForm && (
        <ModalOverlay
          pending={action.pending}
          aria-labelledby="users-roles-dialog-1-title"
          onClose={() => {
            if (!action.isPending()) setShowUserForm(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs overflow-y-auto max-h-screen">
            <h3 id="users-roles-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm người dùng
            </h3>
            <form noValidate onSubmit={createUser} className="space-y-3">
              <FormErrors errors={validation.errors} />
              {passwordMismatch && (
                <p className="text-rose-700 font-semibold text-caption">
                  Mật khẩu xác nhận không khớp.
                </p>
              )}
              {passwordTooShort && (
                <p className="text-rose-700 font-semibold text-caption">
                  Mật khẩu phải có ít nhất 12 ký tự.
                </p>
              )}
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label
                    htmlFor="users-roles-user-form-name"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Họ tên*
                  </label>
                  <input
                    id="users-roles-user-form-name"
                    required
                    {...validation.props('users-roles-user-form-name')}
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="users-roles-user-form-email"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Email*
                  </label>
                  <input
                    id="users-roles-user-form-email"
                    required
                    type="email"
                    {...validation.props('users-roles-user-form-email')}
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="users-roles-user-form-password"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Mật khẩu* <span className="font-normal text-slate-500">(ít nhất 12 ký tự)</span>
                  </label>
                  <input
                    id="users-roles-user-form-password"
                    required
                    type="password"
                    autoComplete="new-password"
                    value={userForm.password}
                    onChange={(e) => {
                      setPasswordTooShort(false);
                      setPasswordMismatch(false);
                      setUserForm({ ...userForm, password: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="users-roles-user-form-confirm-password"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Nhập lại mật khẩu*
                  </label>
                  <input
                    id="users-roles-user-form-confirm-password"
                    required
                    type="password"
                    autoComplete="new-password"
                    value={userForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordMismatch(false);
                      setUserForm({ ...userForm, confirmPassword: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò</label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={userForm.roleCodes.includes(r.code)}
                        onClick={() => toggleRoleCode(r.code)}
                        title={`Mã: ${r.code}`}
                        className={`px-2 py-1 rounded-md text-caption font-bold border ${userForm.roleCodes.includes(r.code) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowUserForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  {action.pending ? 'Đang lưu…' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {deactivatingUser && (
        <ConfirmDialog
          title="Vô hiệu hóa tài khoản"
          message={`${deactivatingUser.name} sẽ không đăng nhập được web và ứng dụng di động cho đến khi được kích hoạt lại.`}
          confirmLabel="Vô hiệu hóa"
          cancelLabel="Giữ nguyên"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onConfirm={async () => {
            const target = deactivatingUser;
            await action.run(() => toggleUserStatus(target.id));
            setDeactivatingUser(null);
          }}
          onClose={() => setDeactivatingUser(null)}
        />
      )}

      {/* Save permissions confirm dialog (USERS-03) */}
      {showSavePermDialog && editingRoleId && permDraft && (
        <ConfirmDialog
          title="Lưu thay đổi phân quyền"
          message={`Các thay đổi sau sẽ áp dụng cho tất cả người dùng có vai trò ${roles.find((r) => r.id === editingRoleId)?.name ?? ''}.`}
          summary={[
            {
              label: 'Thêm quyền',
              value: permChangeSummary.added > 0 ? `+${permChangeSummary.added} quyền` : 'Không có',
            },
            {
              label: 'Bỏ quyền',
              value:
                permChangeSummary.removed > 0 ? `-${permChangeSummary.removed} quyền` : 'Không có',
            },
          ]}
          confirmLabel="Lưu thay đổi"
          cancelLabel="Quay lại chỉnh sửa"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onConfirm={async () => {
            const result = await action.run(() =>
              setRolePermissions(editingRoleId, permDraft),
            );
            if (result?.success) {
              setShowSavePermDialog(false);
              cancelEditPermissions();
            } else {
              setShowSavePermDialog(false);
            }
          }}
          onClose={() => setShowSavePermDialog(false)}
        />
      )}
    </div>
  );
};

/** Matrix view: roles as columns, permissions as rows (USERS-04) */
interface PermissionMatrixProps {
  roles: Array<{ id: string; name: string; code: string; permissionCodes: string[] }>;
  permissions: Array<{ code: string; description?: string }>;
  editingRoleId: string | null;
  permDraft: string[] | null;
  canManage: boolean;
  detailStatus?: Record<string, Record<string, string>>;
  onStartEdit: (roleId: string, codes: string[]) => void;
  onTogglePerm: (code: string) => void;
  onSave: () => void;
  onCancel: () => void;
  getPermissionLabel: (code: string) => string;
}

function PermissionMatrix({
  roles,
  permissions,
  editingRoleId,
  permDraft,
  canManage,
  detailStatus,
  onStartEdit,
  onTogglePerm,
  onSave,
  onCancel,
  getPermissionLabel,
}: PermissionMatrixProps) {
  const editingRole = roles.find((r) => r.id === editingRoleId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {editingRole && permDraft && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3 text-xs">
          <span className="text-blue-800 font-semibold">
            Đang chỉnh sửa quyền: <strong>{editingRole.name}</strong> — nhấn vào ô checkbox để thêm/bỏ quyền.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
            >
              Lưu thay đổi
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-semibold"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-48">Quyền</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-3 text-center font-bold text-slate-800 whitespace-nowrap">
                  <div>{r.name}</div>
                  <div className="font-mono text-caption text-slate-400">{r.code}</div>
                  {canManage &&
                    (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (editingRoleId === r.id) {
                            onCancel();
                          } else {
                            onStartEdit(r.id, r.permissionCodes);
                          }
                        }}
                        className={`mt-1 text-caption font-semibold px-2 py-0.5 rounded ${editingRoleId === r.id ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
                      >
                        {editingRoleId === r.id ? 'Đang sửa' : 'Sửa'}
                      </button>
                    )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permissions.map((perm) => (
              <tr key={perm.code} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700 font-semibold" title={`Mã: ${perm.code}`}>
                  {getPermissionLabel(perm.code)}
                </td>
                {roles.map((r) => {
                  const isEditing = editingRoleId === r.id && permDraft !== null;
                  const hasPerm = isEditing
                    ? permDraft.includes(perm.code)
                    : r.permissionCodes.includes(perm.code);
                  return (
                    <td key={r.id} className="px-3 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={hasPerm}
                          onChange={() => onTogglePerm(perm.code)}
                          className="rounded w-4 h-4 cursor-pointer"
                          aria-label={`Quyền ${getPermissionLabel(perm.code)} cho vai trò ${r.name}`}
                        />
                      ) : hasPerm ? (
                        <span className="text-emerald-600 font-bold" title="Có quyền">✓</span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
