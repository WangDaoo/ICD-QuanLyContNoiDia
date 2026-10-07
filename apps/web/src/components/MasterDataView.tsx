import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Plus, Ship, Building2, ClipboardCheck, TruckIcon } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState } from './CollectionState';

type Tab = 'SHIPPING_LINES' | 'CONSIGNEES' | 'CLEARING_AGENTS' | 'TRANSPORTERS';

export const MasterDataView: React.FC = () => {
  const {
    shippingLines,
    consignees,
    clearingAgents,
    transporters,
    createShippingLine,
    toggleShippingLineStatus,
    createConsignee,
    toggleConsigneeStatus,
    createClearingAgent,
    toggleClearingAgentStatus,
    createTransporter,
    toggleTransporterStatus,
    currentUser,
  } = useApp();

  const canManage =
    currentUser.permissionCodes?.some((code) => code === '*' || code === 'master_data.manage') ??
    false;
  const action = useCommandAction();
  const validation = useFormValidation();
  const [tabValue, setTab] = useViewQueryState('master-data', 'section', 'SHIPPING_LINES');
  const tab: Tab =
    tabValue === 'SHIPPING_LINES' ||
    tabValue === 'CONSIGNEES' ||
    tabValue === 'CLEARING_AGENTS' ||
    tabValue === 'TRANSPORTERS'
      ? tabValue
      : 'SHIPPING_LINES';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    taxCode: '',
    phone: '',
    email: '',
    address: '',
  });

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'SHIPPING_LINES', label: 'Hãng tàu (Shipping Line)', icon: Ship },
    { id: 'CONSIGNEES', label: 'Chủ hàng (Consignee)', icon: Building2 },
    { id: 'CLEARING_AGENTS', label: 'Đại lý Hải quan', icon: ClipboardCheck },
    { id: 'TRANSPORTERS', label: 'Đơn vị Vận tải', icon: TruckIcon },
  ];

  const resetForm = () =>
    setForm({ name: '', code: '', taxCode: '', phone: '', email: '', address: '' });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManage || action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() =>
      tab === 'SHIPPING_LINES'
        ? createShippingLine(form.name.trim(), form.code.trim() || undefined)
        : tab === 'CONSIGNEES'
          ? createConsignee({
              name: form.name.trim(),
              taxCode: form.taxCode.trim(),
              phone: form.phone,
              email: form.email,
              address: form.address,
            })
          : tab === 'CLEARING_AGENTS'
            ? createClearingAgent({
                name: form.name.trim(),
                taxCode: form.taxCode.trim(),
                phone: form.phone,
                address: form.address,
              })
            : createTransporter({
                name: form.name.trim(),
                taxCode: form.taxCode.trim(),
                phone: form.phone,
                address: form.address,
              }),
    );
    if (!result?.success) return;
    resetForm();
    setShowForm(false);
  };

  const renderList = () => {
    if (tab === 'SHIPPING_LINES') {
      return shippingLines.map((s) => (
        <tr key={s.id} className="hover:bg-slate-50">
          <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
          <td className="px-4 py-3 font-mono text-slate-500">{s.scacCode || '—'}</td>
          <td className="px-4 py-3">{statusBadge(s.active)}</td>
          <td className="px-4 py-3 text-right">
            {toggleBtn(() => toggleShippingLineStatus(s.id), s.active, s.name)}
          </td>
        </tr>
      ));
    }
    if (tab === 'CONSIGNEES') {
      return consignees.map((c) => (
        <tr key={c.id} className="hover:bg-slate-50">
          <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
          <td className="px-4 py-3 font-mono text-slate-500">{c.taxCode}</td>
          <td className="px-4 py-3">{statusBadge(c.active)}</td>
          <td className="px-4 py-3 text-right">
            {toggleBtn(() => toggleConsigneeStatus(c.id), c.active, c.name)}
          </td>
        </tr>
      ));
    }
    if (tab === 'CLEARING_AGENTS') {
      return clearingAgents.map((c) => (
        <tr key={c.id} className="hover:bg-slate-50">
          <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
          <td className="px-4 py-3 font-mono text-slate-500">{c.taxCode || '—'}</td>
          <td className="px-4 py-3">{statusBadge(c.active)}</td>
          <td className="px-4 py-3 text-right">
            {toggleBtn(() => toggleClearingAgentStatus(c.id), c.active, c.name)}
          </td>
        </tr>
      ));
    }
    return transporters.map((t) => (
      <tr key={t.id} className="hover:bg-slate-50">
        <td className="px-4 py-3 font-bold text-slate-800">{t.name}</td>
        <td className="px-4 py-3 font-mono text-slate-500">{t.taxCode || '—'}</td>
        <td className="px-4 py-3">{statusBadge(t.active)}</td>
        <td className="px-4 py-3 text-right">
          {toggleBtn(() => toggleTransporterStatus(t.id), t.active, t.name)}
        </td>
      </tr>
    ));
  };

  const statusBadge = (active: boolean) => (
    <span
      className={`px-2 py-1 rounded-full text-caption font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
    >
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
  const toggleBtn = (
    onClick: () => Promise<import('../services/api/operation').CommandResult>,
    active: boolean,
    targetName: string,
  ) =>
    canManage ? (
      <button
        disabled={action.pending}
        onClick={() => {
          if (!active || window.confirm(`Khóa mục danh mục ${targetName}?`))
            void action.run(onClick);
        }}
        className={`px-3 py-1 rounded-md font-bold text-caption border ${active ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
      >
        {active ? 'Khóa' : 'Kích hoạt'}
      </button>
    ) : (
      <span>Chỉ xem</span>
    );

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Danh mục dùng chung (Master Data)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Catalog dùng chung cho Manifest/HBL/Truck Visit. Không hard-delete — chỉ khóa
            (active=false) để giữ lịch sử.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              action.clear();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>
        )}
      </div>

      {!showForm && <CommandNotice notice={action.notice} />}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit max-w-full">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              aria-pressed={tab === t.id}
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-caption">
            <tr>
              <th className="text-left px-4 py-3">Tên</th>
              <th className="text-left px-4 py-3">Mã số</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {renderList()}
            <tr>
              <td colSpan={4}>
                <CollectionState
                  resource={
                    {
                      SHIPPING_LINES: 'shippingLines',
                      CONSIGNEES: 'consignees',
                      CLEARING_AGENTS: 'clearingAgents',
                      TRANSPORTERS: 'transporters',
                    }[tab]
                  }
                  count={
                    {
                      SHIPPING_LINES: shippingLines.length,
                      CONSIGNEES: consignees.length,
                      CLEARING_AGENTS: clearingAgents.length,
                      TRANSPORTERS: transporters.length,
                    }[tab]
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showForm && (
        <ModalOverlay
          pending={action.pending}
          aria-labelledby="master-data-dialog-1-title"
          onClose={() => {
            if (!action.isPending()) setShowForm(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="master-data-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm {tabs.find((t) => t.id === tab)?.label}
            </h3>
            <form onSubmit={handleCreate} noValidate className="space-y-3">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label
                    htmlFor="master-data-form-name"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Tên*
                  </label>
                  <input
                    id="master-data-form-name"
                    required
                    {...validation.props('master-data-form-name')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                {tab === 'SHIPPING_LINES' ? (
                  <div>
                    <label
                      htmlFor="master-data-form-code"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Mã SCAC
                    </label>
                    <input
                      id="master-data-form-code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="master-data-form-tax-code"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Mã số thuế
                    </label>
                    <input
                      id="master-data-form-tax-code"
                      value={form.taxCode}
                      onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
                {tab !== 'SHIPPING_LINES' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="master-data-form-phone"
                        className="block font-semibold text-slate-700 mb-1"
                      >
                        Điện thoại
                      </label>
                      <input
                        id="master-data-form-phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="master-data-form-address"
                        className="block font-semibold text-slate-700 mb-1"
                      >
                        Địa chỉ
                      </label>
                      <input
                        id="master-data-form-address"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                {tab === 'CONSIGNEES' && (
                  <div>
                    <label
                      htmlFor="master-data-form-email"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="master-data-form-email"
                      type="email"
                      {...validation.props('master-data-form-email')}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </fieldset>
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  {action.pending ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
