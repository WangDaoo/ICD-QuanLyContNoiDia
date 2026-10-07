import { useViewQueryState } from '../context/useViewQueryState';
import React, { useEffect, useState } from 'react';
import { Grid, List, MapPin, ArrowRightLeft, Warehouse, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { NavTabId } from './Sidebar';
import { YardSiteMap } from './yard/YardSiteMap';
import { YardAssignment } from './yard/YardAssignment';
import { YardOperations } from './yard/YardOperations';
import { useYardDialogFocus } from './yard/useYardDialogFocus';
import { ConfirmedResourceValue } from './CollectionState';

interface Props {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetAssignVisitId?: string;
}
export function YardView({ onNavigate, targetAssignVisitId }: Props) {
  const { yardBlocks, yardSlots, containerVisits, currentUser, createYardBlock, createYardSlot } =
    useApp();
  const [tab, setTab] = useState<'MAP' | 'LIST' | 'ASSIGN' | 'OPS'>(
    targetAssignVisitId ? 'ASSIGN' : 'MAP',
  );
  const [assignSlot, setAssignSlot] = useState('');
  const [operation, setOperation] = useState<{
    action?: 'MOVE' | 'BOOKING' | 'INSPECTION';
    visitId?: string;
  }>({});
  const [modal, setModal] = useState<'BLOCK' | 'SLOT'>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string }>();
  const [filter, setFilter] = useViewQueryState('yard', 'search', '');
  const [blockFilter, setBlockFilter] = useViewQueryState('yard', 'block', 'ALL');
  const [statusFilter, setStatusFilter] = useViewQueryState('yard', 'status', 'ALL');
  const [blockForm, setBlockForm] = useState({ code: '', name: '' });
  const [slotForm, setSlotForm] = useState({
    block: '',
    row: '01',
    bay: '01',
    tier: '1',
    weight: 30000,
    reefer: false,
  });
  const configDialog = useYardDialogFocus(!!modal, () => setModal(undefined), pending);
  const can = (p: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === p) ?? false;
  useEffect(() => {
    if (targetAssignVisitId) {
      setTab('ASSIGN');
      setAssignSlot('');
    }
  }, [targetAssignVisitId]);
  const openConfig = (type: 'BLOCK' | 'SLOT') => {
    setNotice(undefined);
    setModal(type);
    setSlotForm((f) => ({ ...f, block: yardBlocks[0]?.blockCode ?? '' }));
  };
  const saveConfig = async () => {
    if (pending || !can('yard.configure')) return;
    if (modal === 'BLOCK' && (!blockForm.code.trim() || !blockForm.name.trim())) {
      setNotice({ success: false, message: 'Nhập mã và tên Block.' });
      return;
    }
    if (
      modal === 'SLOT' &&
      (!slotForm.block ||
        ![slotForm.row, slotForm.bay, slotForm.tier].every(
          (n) => n.trim().length > 0 && n.trim().length <= 20,
        ) ||
        !Number.isFinite(slotForm.weight) ||
        slotForm.weight <= 0)
    ) {
      setNotice({
        success: false,
        message: 'Chọn Block, nhập nhãn Row/Bay/Tier (1–20 ký tự) và tải trọng lớn hơn 0.',
      });
      return;
    }
    setPending(true);
    try {
      const result =
        modal === 'BLOCK'
          ? await createYardBlock(blockForm.code.trim(), blockForm.name.trim())
          : await createYardSlot(
              slotForm.block,
              slotForm.row,
              slotForm.bay,
              slotForm.tier,
              slotForm.weight,
              slotForm.reefer,
            );
      setNotice(result);
      if (result.success) {
        setModal(undefined);
        setBlockForm({ code: '', name: '' });
      }
    } catch (error) {
      setNotice({
        success: false,
        message: error instanceof Error ? error.message : 'Không lưu được cấu hình bãi.',
      });
    } finally {
      setPending(false);
    }
  };
  const filteredSlots = yardSlots.filter(
    (s) =>
      (blockFilter === 'ALL' || s.blockCode === blockFilter) &&
      (statusFilter === 'ALL' ||
        (statusFilter === 'MAINTENANCE'
          ? !s.operational
          : statusFilter === 'OCCUPIED'
            ? !!s.occupiedByContainerId && s.operational
            : !s.occupiedByContainerId && s.operational)) &&
      `${s.slotCode} ${s.occupiedByContainerNumber ?? ''}`
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <header className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Warehouse size={20} className="text-blue-600" />
            Vận hành Bãi Container
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sơ đồ cảng demo, quản lý vị trí và công việc trong bãi
          </p>
        </div>
        <nav
          aria-label="Chế độ vận hành bãi"
          className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold"
        >
          {(
            [
              ['MAP', 'Sơ đồ 2D Bãi', Grid],
              ['LIST', 'Danh sách Vị trí', List],
              ['ASSIGN', 'Xếp vị trí thủ công', MapPin],
              ['OPS', 'Công việc trong bãi', ArrowRightLeft],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                if (id === 'OPS') setOperation({});
              }}
              className={`px-3 py-2 rounded-md flex items-center gap-1.5 ${tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'MAP' && (
        <>
          <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-900">
            <strong>Thuật toán xếp vị trí:</strong> Đang trong quá trình phát triển
            {can('yard.update') && (
              <button onClick={() => setTab('ASSIGN')} className="ml-3 underline font-semibold">
                Chọn vị trí thủ công
              </button>
            )}
          </div>
          <YardSiteMap
            onContainer={(id) => onNavigate('containers', id)}
            onAssign={(code) => {
              setAssignSlot(code ?? '');
              setTab('ASSIGN');
            }}
            onOperation={(action, visitId) => {
              setOperation({ action, visitId });
              setTab('OPS');
            }}
          />
        </>
      )}
      {tab === 'ASSIGN' && (
        <YardAssignment
          key={`${targetAssignVisitId ?? ''}:${assignSlot}`}
          targetVisitId={targetAssignVisitId}
          initialSlotCode={assignSlot}
        />
      )}
      {tab === 'OPS' && (
        <YardOperations
          key={`${operation.action ?? ''}:${operation.visitId ?? ''}`}
          initialAction={operation.action}
          initialVisitId={operation.visitId}
        />
      )}
      {tab === 'LIST' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 text-xs">
              <input
                aria-label="Tìm danh sách vị trí"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Mã vị trí / container"
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
              <select
                aria-label="Lọc Block danh sách"
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="border border-slate-300 rounded-lg p-2"
              >
                <option value="ALL">Tất cả Block</option>
                {yardBlocks.map((b) => (
                  <option key={b.id} value={b.blockCode}>
                    Block {b.blockCode}
                  </option>
                ))}
              </select>
              <select
                aria-label="Lọc trạng thái vị trí"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg p-2"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="AVAILABLE">Khả dụng</option>
                <option value="OCCUPIED">Có container</option>
                <option value="MAINTENANCE">Ngưng dùng / bảo trì</option>
              </select>
            </div>
            {can('yard.configure') && (
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => openConfig('BLOCK')}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                >
                  + Block bãi
                </button>
                <button
                  onClick={() => openConfig('SLOT')}
                  className="bg-blue-600 text-white rounded-lg px-3 py-2"
                >
                  + Vị trí (Slot)
                </button>
              </div>
            )}
          </div>
          {notice && (
            <p
              role={notice.success ? 'status' : 'alert'}
              className={`m-4 p-3 rounded-lg text-xs ${notice.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
            >
              {notice.message}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Vị trí',
                    'Block',
                    'Row',
                    'Bay',
                    'Tier',
                    'Loại hỗ trợ',
                    'Điện lạnh',
                    'Tải tối đa',
                    'Container hiện tại',
                    'Trạng thái',
                  ].map((h) => (
                    <th key={h} className="p-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSlots.map((s) => {
                  const visit = containerVisits.find((v) => v.id === s.occupiedByContainerId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold">{s.slotCode}</td>
                      <td className="p-3">{s.blockCode}</td>
                      <td className="p-3">{s.rowNo}</td>
                      <td className="p-3">{s.bayNo}</td>
                      <td className="p-3">{s.tierNo}</td>
                      <td className="p-3">{s.supportedType ?? 'Mọi loại'}</td>
                      <td className="p-3">{s.reeferPower ? 'Có' : 'Không'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {s.maxWeightKg > 0
                          ? `${s.maxWeightKg.toLocaleString('vi-VN')} kg`
                          : 'Chưa cấu hình'}
                      </td>
                      <td className="p-3 font-mono">
                        {visit && can('container.read') ? (
                          <button
                            className="text-blue-700 underline"
                            onClick={() => onNavigate('containers', visit.id)}
                          >
                            {visit.containerNumber}
                          </button>
                        ) : (
                          (s.occupiedByContainerNumber ?? '—')
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded px-2 py-1 whitespace-nowrap ${!s.operational ? 'bg-slate-600 text-white' : s.occupiedByContainerId ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-(--icd-yard-empty) text-slate-600'}`}
                        >
                          {!s.operational
                            ? 'Ngưng dùng / bảo trì'
                            : s.occupiedByContainerId
                              ? 'Có container'
                              : 'Khả dụng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSlots.length && (
                  <tr>
                    <td colSpan={10} className="text-center p-6 text-slate-500">
                      Không có vị trí phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-caption text-slate-500 border-t border-slate-200">
            <ConfirmedResourceValue resource="yardSlots">
              {filteredSlots.length}/{yardSlots.length} vị trí
            </ConfirmedResourceValue>
          </p>
        </section>
      )}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <section
            ref={configDialog.ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={modal === 'BLOCK' ? 'Tạo Block bãi' : 'Tạo vị trí bãi'}
            className="bg-white rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto text-xs"
            onKeyDown={configDialog.onKeyDown}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">
                {modal === 'BLOCK' ? 'Tạo Block bãi' : 'Tạo vị trí bãi'}
              </h3>
              <button
                aria-label="Đóng cấu hình bãi"
                disabled={pending}
                onClick={() => setModal(undefined)}
                className="p-2"
              >
                <X size={17} />
              </button>
            </div>
            {modal === 'BLOCK' ? (
              <div className="space-y-3">
                <label className="block">
                  Mã Block
                  <input
                    aria-label="Mã Block mới"
                    value={blockForm.code}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 mt-1"
                  />
                </label>
                <label className="block">
                  Tên Block
                  <input
                    aria-label="Tên Block mới"
                    value={blockForm.name}
                    onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 mt-1"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  Block
                  <select
                    aria-label="Block vị trí mới"
                    value={slotForm.block}
                    onChange={(e) => setSlotForm({ ...slotForm, block: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 mt-1"
                  >
                    {yardBlocks.map((b) => (
                      <option key={b.id} value={b.blockCode}>
                        {b.blockCode} — {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['row', 'bay', 'tier'] as const).map((field) => (
                    <label key={field}>
                      {field.toUpperCase()}
                      <input
                        aria-label={`${field.toUpperCase()} vị trí mới`}
                        type="text"
                        maxLength={20}
                        value={slotForm[field]}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, [field]: e.target.value.toUpperCase() })
                        }
                        className="w-full border border-slate-300 rounded-lg p-2 mt-1"
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  Tải trọng tối đa (kg)
                  <input
                    aria-label="Tải trọng vị trí mới"
                    type="number"
                    min="1"
                    value={slotForm.weight}
                    onChange={(e) => setSlotForm({ ...slotForm, weight: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 mt-1"
                  />
                </label>
                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={slotForm.reefer}
                    onChange={(e) => setSlotForm({ ...slotForm, reefer: e.target.checked })}
                  />
                  Có nguồn điện lạnh
                </label>
              </div>
            )}
            {notice && !notice.success && (
              <p role="alert" className="text-red-800 bg-red-50 p-3 rounded mt-3">
                {notice.message}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                disabled={pending}
                onClick={() => setModal(undefined)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                Hủy
              </button>
              <button
                disabled={pending}
                onClick={saveConfig}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 disabled:opacity-50"
              >
                {pending ? 'Đang lưu…' : 'Tạo'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
