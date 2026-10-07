import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, ShieldCheck, Plus, UserCog } from 'lucide-react';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, DetailAvailability } from './CollectionState';

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
  const [userForm, setUserForm] = useState({ name: '', email: '', roleCodes: [] as string[] });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const PERMISSIONS_CATALOG = permissions.map((permission) => permission.code);

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
    if (!can('users.manage') || action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() =>
      createManagedUser(userForm.name.trim(), userForm.email.trim(), userForm.roleCodes),
    );
    if (result?.success) {
      setUserForm({ name: '', email: '', roleCodes: [] });
      setShowUserForm(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Người dùng & Phân quyền (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            JwtAuthGuard luôn tải lại role/permission từ DB, không tin dữ liệu role nằm sẵn trong
            JWT.
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
                        >
                          {rc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-caption font-bold ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {u.active ? 'ACTIVE' : 'INACTIVE'}
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
                              {u.roleCodes.includes(r.code) ? `Bỏ ${r.code}` : `Thêm ${r.code}`}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={action.pending}
                          onClick={() => {
                            if (!u.active || window.confirm(`Vô hiệu hóa ${u.name}?`))
                              void action.run(() => toggleUserStatus(u.id));
                          }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollectionState resource="roles" count={roles.length} />
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> {r.name}{' '}
                  <span className="text-slate-400 font-mono text-caption">({r.code})</span>
                </h4>
                {can('roles.manage') &&
                  (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                    <button
                      onClick={() => setEditingRoleId(editingRoleId === r.id ? null : r.id)}
                      className="text-blue-600 font-bold text-caption flex items-center gap-1"
                    >
                      <UserCog className="w-3.5 h-3.5" /> Sửa quyền
                    </button>
                  )}
              </div>
              <DetailAvailability resource="roles" id={r.id} />
              <div className="flex flex-wrap gap-1">
                {r.permissionCodes.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-caption font-mono"
                  >
                    {p}
                  </span>
                ))}
                {r.permissionCodes.length === 0 &&
                  (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                    <span className="text-slate-400 italic text-caption">Chưa có quyền nào</span>
                  )}
              </div>
              {can('roles.manage') &&
                editingRoleId === r.id &&
                (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    <CollectionState resource="permissions" count={PERMISSIONS_CATALOG.length} />
                    {PERMISSIONS_CATALOG.map((code) => {
                      const active = r.permissionCodes.includes(code);
                      return (
                        <button
                          disabled={action.pending}
                          aria-pressed={active}
                          key={code}
                          onClick={() => {
                            if (!can('roles.manage') || action.isPending()) return;
                            void action.run(() =>
                              setRolePermissions(
                                r.id,
                                active
                                  ? r.permissionCodes.filter((c) => c !== code)
                                  : [...r.permissionCodes, code],
                              ),
                            );
                          }}
                          className={`px-2 py-1 rounded-md text-caption font-mono font-bold border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {showUserForm && (
        <ModalOverlay
          pending={action.pending}
          aria-labelledby="users-roles-dialog-1-title"
          onClose={() => {
            if (!action.isPending()) setShowUserForm(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="users-roles-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm người dùng
            </h3>
            <form noValidate onSubmit={createUser} className="space-y-3">
              <FormErrors errors={validation.errors} />
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
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò</label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={userForm.roleCodes.includes(r.code)}
                        onClick={() => toggleRoleCode(r.code)}
                        className={`px-2 py-1 rounded-md text-caption font-bold border ${userForm.roleCodes.includes(r.code) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {r.code}
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
    </div>
  );
};
