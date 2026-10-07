from pathlib import Path
ROOT = Path(__file__).resolve().parents[5]
def edit(name, changes):
    file = ROOT / 'apps/web/src/components' / name
    text = file.read_text(encoding='utf-8')
    for old, new in changes:
        if old not in text: raise RuntimeError(f'{name}: missing {old[:90]}')
        text = text.replace(old, new)
    file.write_text(text, encoding='utf-8')

imports = "import { useCommandAction, CommandNotice } from './useCommandAction';\nimport { useFormValidation, FormErrors } from './useFormValidation';\nimport { CollectionState } from './CollectionState';\n"
edit('MasterDataView.tsx', [
 ("type Tab =", "import type { LucideIcon } from 'lucide-react';\n" + imports + "\ntype Tab ="),
 ('    toggleTransporterStatus,','    toggleTransporterStatus, currentUser,'),
 ("  const [tab,", "  const canManage = currentUser.permissionCodes?.some(code => code === '*' || code === 'master_data.manage') ?? false;\n  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [tab,"),
 ('icon: any','icon: LucideIcon'),
 ("  const handleCreate = () => {\n    if (!form.name.trim()) return;\n    if (tab === 'SHIPPING_LINES') createShippingLine(form.name.trim(), form.code.trim() || undefined);\n    if (tab === 'CONSIGNEES') createConsignee({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, email: form.email, address: form.address });\n    if (tab === 'CLEARING_AGENTS') createClearingAgent({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, address: form.address });\n    if (tab === 'TRANSPORTERS') createTransporter({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, address: form.address });",
 "  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (!canManage || action.isPending() || !validation.validate(e.currentTarget)) return;\n    const result = await action.run(() => tab === 'SHIPPING_LINES' ? createShippingLine(form.name.trim(), form.code.trim() || undefined)\n      : tab === 'CONSIGNEES' ? createConsignee({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, email: form.email, address: form.address })\n      : tab === 'CLEARING_AGENTS' ? createClearingAgent({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, address: form.address })\n      : createTransporter({ name: form.name.trim(), taxCode: form.taxCode.trim(), phone: form.phone, address: form.address }));\n    if (!result?.success) return;"),
 ('  const toggleBtn = (onClick: () => void, active: boolean) => (', "  const toggleBtn = (onClick: () => Promise<import('../services/api/operation').CommandResult>, active: boolean) => canManage ? ("),
 ('<button onClick={onClick}', '<button disabled={action.pending} onClick={() => { if (!active || window.confirm("Khóa mục danh mục đã chọn?")) void action.run(onClick); }}'),
 ("      {active ? 'Khóa' : 'Kích hoạt'}\n    </button>\n  );", "      {active ? 'Khóa' : 'Kích hoạt'}\n    </button>\n  ) : <span>Chỉ xem</span>;"),
 ('        <button\n          onClick={() => setShowForm(true)}', '        {canManage && <button\n          onClick={() => { action.clear(); setShowForm(true); }}'),
 ('<span>Thêm mới</span>\n        </button>', '<span>Thêm mới</span>\n        </button>}'),
 ('      <div className="flex gap-1', '      {!showForm && <CommandNotice notice={action.notice} />}\n      <div className="flex gap-1'),
 ('              key={t.id}', '              aria-pressed={tab === t.id}\n              key={t.id}'),
 ('<tbody className="divide-y divide-slate-100">{renderList()}</tbody>', "<tbody className=\"divide-y divide-slate-100\">{renderList()}<tr><td colSpan={4}><CollectionState resource={{ SHIPPING_LINES: 'shippingLines', CONSIGNEES: 'consignees', CLEARING_AGENTS: 'clearingAgents', TRANSPORTERS: 'transporters' }[tab]} count={{ SHIPPING_LINES: shippingLines.length, CONSIGNEES: consignees.length, CLEARING_AGENTS: clearingAgents.length, TRANSPORTERS: transporters.length }[tab]} /></td></tr></tbody>"),
 ('onClose={() => setShowForm(false)}', 'onClose={() => { if (!action.isPending()) setShowForm(false); }}'),
 ('            <div className="space-y-3">', '            <form onSubmit={handleCreate} noValidate className="space-y-3">\n              <FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">'),
 ('<input id="master-data-form-name"', '<input id="master-data-form-name" required {...validation.props("master-data-form-name")}'),
 ('<input id="master-data-form-email"', '<input id="master-data-form-email" type="email" {...validation.props("master-data-form-email")}'),
 ('            </div>\n            <div className="flex justify-end space-x-2 pt-4', '              </fieldset>\n            <div className="flex justify-end space-x-2 pt-4'),
 ('<button onClick={() => { setShowForm(false); resetForm(); }}', '<button type="button" disabled={action.pending} onClick={() => { setShowForm(false); resetForm(); }}'),
 ('<button onClick={handleCreate}', '<button type="submit" disabled={action.pending}'),
 ('rounded-lg font-bold hover:bg-blue-700">Lưu</button>', "rounded-lg font-bold hover:bg-blue-700\">{action.pending ? 'Đang lưu…' : 'Lưu'}</button>"),
 ('            </div>\n          </div>\n        </ModalOverlay>', '            </div>\n            </form>\n          </div>\n        </ModalOverlay>'),
])
edit('UsersRolesView.tsx', [
 ('export const UsersRolesView', imports.replace("import { CollectionState }", "import { CollectionState, DetailAvailability }")+ '\nexport const UsersRolesView'),
 ('const { managedUsers, roles,', 'const { currentUser, managedUsers, roles,'),
 ("  const [tab,", "  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;\n  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [tab,"),
 ("  const editingRole = roles.find((r) => r.id === editingRoleId) || null;", "  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (!can('users.manage') || action.isPending() || !validation.validate(e.currentTarget)) return;\n    const result = await action.run(() => createManagedUser(userForm.name.trim(), userForm.email.trim(), userForm.roleCodes));\n    if (result?.success) { setUserForm({ name: '', email: '', roleCodes: [] }); setShowUserForm(false); }\n  };"),
 ("<button onClick={() => setTab('USERS')}", "<button aria-pressed={tab === 'USERS'} onClick={() => setTab('USERS')}"),
 ("<button onClick={() => setTab('ROLES')}", "<button aria-pressed={tab === 'ROLES'} onClick={() => setTab('ROLES')}"),
 ("{tab === 'USERS' && (", "{tab === 'USERS' && can('users.manage') && ("),
 ('      {tab === \'USERS\' ? (', '      {!showUserForm && <CommandNotice notice={action.notice} />}\n      {tab === \'USERS\' ? ('),
 ('                    <select\n                      value=""', '                    {can("users.manage") ? <><select\n                      aria-label={`Vai trò của ${u.name}`} disabled={action.pending}\n                      value=""'),
 ('                        updateUserRoles(u.id, codes);','                        void action.run(() => updateUserRoles(u.id, codes));'),
 ('onClick={() => toggleUserStatus(u.id)}','disabled={action.pending} onClick={() => { if (!u.active || window.confirm(`Vô hiệu hóa ${u.name}?`)) void action.run(() => toggleUserStatus(u.id)); }}'),
 ("{u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}\n                    </button>", "{u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}\n                    </button></> : <span>Chỉ xem</span>}"),
 ('            </tbody>', '              <tr><td colSpan={5}><CollectionState resource="managedUsers" count={managedUsers.length} /></td></tr>\n            </tbody>'),
 ('          {roles.map((r) => (\n            <div', '          <CollectionState resource="roles" count={roles.length} />\n          {roles.map((r) => (\n            <div'),
 ('                <button onClick={() => setEditingRoleId', '                {can("roles.manage") && <button onClick={() => setEditingRoleId'),
 ('<UserCog className="w-3.5 h-3.5" /> Sửa quyền\n                </button>', '<UserCog className="w-3.5 h-3.5" /> Sửa quyền\n                </button>}'),
 ('              <div className="flex flex-wrap gap-1">\n                {r.permissionCodes', '              <DetailAvailability resource="roles" id={r.id} />\n              <div className="flex flex-wrap gap-1">\n                {r.permissionCodes'),
 ('                        key={code}', '                        disabled={action.pending} aria-pressed={active}\n                        key={code}'),
 ('onClick={() => setRolePermissions(r.id, active ? r.permissionCodes.filter((c) => c !== code) : [...r.permissionCodes, code])}', 'onClick={() => void action.run(() => setRolePermissions(r.id, active ? r.permissionCodes.filter((c) => c !== code) : [...r.permissionCodes, code]))}'),
 ('onClose={() => setShowUserForm(false)}', 'onClose={() => { if (!action.isPending()) setShowUserForm(false); }}'),
 ('            <div className="space-y-3">', '            <form noValidate onSubmit={createUser} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">'),
 ('<input id="users-roles-user-form-name"', '<input id="users-roles-user-form-name" required {...validation.props("users-roles-user-form-name")}'),
 ('<input id="users-roles-user-form-email"', '<input id="users-roles-user-form-email" required type="email" {...validation.props("users-roles-user-form-email")}'),
 ('                      onClick={() => toggleRoleCode(r.code)}', '                      type="button" aria-pressed={userForm.roleCodes.includes(r.code)}\n                      onClick={() => toggleRoleCode(r.code)}'),
 ('            </div>\n            <div className="flex justify-end space-x-2 pt-4', '              </fieldset>\n            <div className="flex justify-end space-x-2 pt-4'),
 ('<button onClick={() => setShowUserForm(false)}','<button type="button" disabled={action.pending} onClick={() => setShowUserForm(false)}'),
 ("                onClick={() => {\n                  if (!userForm.name.trim() || !userForm.email.trim()) return;\n                  createManagedUser(userForm.name.trim(), userForm.email.trim(), userForm.roleCodes);\n                  setUserForm({ name: '', email: '', roleCodes: [] });\n                  setShowUserForm(false);\n                }}", '                type="submit" disabled={action.pending}'),
 ('                Tạo\n              </button>', "                {action.pending ? 'Đang lưu…' : 'Tạo'}\n              </button>"),
 ('            </div>\n          </div>\n        </ModalOverlay>', '            </div></form>\n          </div>\n        </ModalOverlay>'),
])
