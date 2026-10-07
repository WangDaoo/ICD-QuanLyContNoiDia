import React, { useState } from 'react';
import { ArrowRight, MapPin, Search, Warehouse, Zap, X, ArrowRightLeft, ClipboardCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { YardSlot } from '../../types';
import { getBlockGeometry, getSlotsAt, getSlotAppearance, legendForMode, type YardColorMode } from './yard-model';
import { useYardDialogFocus } from './useYardDialogFocus';

interface Props {
  onContainer: (visitId: string) => void;
  onAssign: (slotCode?: string) => void;
  onOperation: (action: 'MOVE' | 'BOOKING' | 'INSPECTION', visitId?: string) => void;
}

export function YardSiteMap({ onContainer, onAssign, onOperation }: Props) {
  const { yardBlocks, yardSlots, containerVisits, holds, inspections, currentUser, yardMovements, bookings } = useApp();
  const [mode, setMode] = useState<YardColorMode>('SLOT');
  const [blockCode, setBlockCode] = useState('');
  const [tier, setTier] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const selectedBlock = yardBlocks.find(b => b.blockCode === blockCode) ?? yardBlocks[0];
  const blockSlots = yardSlots.filter(s => s.blockCode === selectedBlock?.blockCode);
  const geometry = getBlockGeometry(blockSlots);
  const visibleTier = tier === 'ALL' || geometry.tiers.includes(tier) ? tier : 'ALL';
  const selected = yardSlots.find(s => s.id === selectedId);
  const slotDialog = useYardDialogFocus(!!selected, () => setSelectedId(''));
  const describe = (s: YardSlot) => getSlotAppearance(s, containerVisits, holds, inspections, mode);
  const can = (permission: string) => currentUser.permissionCodes?.some(p => p === '*' || p === permission) ?? false;
  const match = (s: YardSlot) => !search.trim() || `${s.slotCode} ${s.occupiedByContainerNumber ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
  const occupied = yardSlots.filter(s => s.occupiedByContainerId).length;
  const available = yardSlots.filter(s => s.operational && !s.occupiedByContainerId).length;
  const held = yardSlots.filter(s => describe(s).hold).length;
  const tasks = [...yardMovements, ...bookings, ...inspections].filter(o => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
  const chip = (s: YardSlot, compact = false) => {
    const a = describe(s);
    return <button key={s.id} type="button" data-slot-id={s.id} data-color-key={a.key}
      aria-label={`Vị trí ${s.slotCode}, ${a.label}${a.container ? ', ' + a.container.containerNumber : ''}${a.hold ? ', Hold' : ''}`}
      onClick={() => { setSelectedId(s.id); setBlockCode(s.blockCode); }}
      title={`${s.slotCode} · ${a.label}${a.container ? ' · ' + a.container.containerNumber : ''}`}
      style={{ background: a.background, color: a.color, borderColor: s.id === selectedId ? '#111827' : a.border, opacity: match(s) ? 1 : 0.28 }}
      className={`rounded border text-left transition hover:ring-2 hover:ring-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${compact ? 'px-1.5 py-1 min-w-0' : 'p-2 min-w-[140px]'} ${s.id === selectedId ? 'ring-2 ring-slate-900' : ''}`}>
      <div className={`font-mono font-bold flex gap-1 items-center justify-between ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <span className="truncate">{compact ? `Tầng ${s.tierNo}` : s.slotCode}</span>{s.reeferPower && <Zap size={11} aria-label="Có nguồn điện lạnh" />}
      </div>
      <div className={`truncate font-mono ${compact ? 'text-[9px]' : 'text-xs mt-1'}`}>{a.container?.containerNumber ?? s.occupiedByContainerNumber ?? a.label}</div>
      {!compact && <div className="text-[10px] mt-1">{a.container?.containerType ?? s.supportedType ?? 'Mọi loại'} · {a.label}</div>}
      {a.hold && <span className="text-[9px] font-bold inline-block px-1 rounded mt-1 bg-white text-red-700 border border-red-300">HOLD</span>}
    </button>;
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[['Đang sử dụng', `${occupied}/${yardSlots.length}`, 'Vị trí có container'], ['Vị trí khả dụng', available, 'Trống và đang hoạt động'], ['Container Hold', held, 'Lệnh giữ hoặc kết quả giám định'], ['Công việc đang mở', tasks, 'Đảo chuyển, booking, giám định']].map(([label, value, caption]) =>
        <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-bold text-slate-900 my-1">{value}</div><div className="text-[11px] text-slate-500">{caption}</div></div>)}
    </div>
    <section className="rounded-xl border border-slate-300 overflow-hidden bg-white">
      <div className="p-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200">
        <div><h3 className="font-bold text-slate-900 flex items-center gap-2"><MapPin size={17} />Sơ đồ tổng thể ICD</h3><p className="text-xs text-slate-500 mt-1">Khung cảng demo · Block và vị trí lấy từ backend · Chọn ô để xem chi tiết</p></div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
          <button aria-pressed={mode === 'SLOT'} onClick={() => setMode('SLOT')} className={`px-3 py-2 rounded-md ${mode === 'SLOT' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>Loại vị trí</button>
          <button aria-pressed={mode === 'STATE'} onClick={() => setMode('STATE')} className={`px-3 py-2 rounded-md ${mode === 'STATE' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>Trạng thái container</button>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 text-[11px]" aria-label="Legend bản đồ">
        <strong className="text-slate-500">Legend</strong>{legendForMode(mode).map(a => <span key={a.key} className="flex gap-1.5 items-center" data-legend-key={a.key}><i className="w-3 h-3 border rounded-sm" style={{ background: a.background, borderColor: a.border }} /><span>{a.label}</span></span>)}
        {mode === 'SLOT' && <span className="font-semibold text-red-700">HOLD: huy hiệu lệnh giữ / giám định</span>}
      </div>
      <div className="p-3 sm:p-5 bg-[#EEF2F6]" data-testid="yard-site-plan">
        <div className="border-2 border-dashed border-slate-400 rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-600"><span className="font-bold uppercase tracking-wide">ICD DEMO · Ranh giới khu đất</span><span>↑ Bắc · Sơ đồ minh họa, không theo tỷ lệ địa lý</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['CỔNG VÀO · Gate-in', 'Khu đệm & trạm cân', 'Điều hành / chứng từ', 'CỔNG RA · Gate-out'].map((name, i) => <div key={name} className="bg-white border border-slate-300 p-3 rounded-lg text-center text-[11px] text-slate-600"><span className={`font-bold ${i === 0 || i === 3 ? 'text-blue-700' : ''}`}>{name}</span><div className="text-[10px] mt-1">Hạ tầng minh họa</div></div>)}
          </div>
          <div className="bg-white rounded border border-slate-300 px-4 py-2 text-[10px] flex items-center justify-between text-slate-500"><span>ĐƯỜNG NỘI BỘ · LÀN TIẾP NHẬN</span><ArrowRight size={16} /><span>LỐI RA →</span></div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_145px] gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {yardBlocks.map(block => {
                const slots = yardSlots.filter(s => s.blockCode === block.blockCode);
                const g = getBlockGeometry(slots);
                const count = slots.filter(s => s.occupiedByContainerId).length;
                return <section key={block.id} className={`bg-[#DCE3EA] border rounded-lg p-3 min-w-0 ${selectedBlock?.id === block.id ? 'border-blue-600 ring-1 ring-blue-500' : 'border-slate-400'}`}>
                  <button onClick={() => { setBlockCode(block.blockCode); setTier('ALL'); }} aria-pressed={selectedBlock?.id === block.id} className="text-left w-full mb-2">
                    <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-800">Block {block.blockCode}</strong><span className="text-[10px] text-slate-600">{count}/{slots.length} vị trí{!block.operational ? ' · Ngưng dùng' : ''}</span></div>
                    <p className="text-[11px] mt-0.5 text-slate-600">{block.name}</p>
                  </button>
                  {slots.length === 0 ? <p className="p-3 bg-white rounded text-xs text-slate-500">Chưa cấu hình vị trí</p> : <div className="overflow-x-auto"><div className="grid gap-1 min-w-fit" style={{ gridTemplateColumns: `28px repeat(${g.bays.length}, minmax(70px, 1fr))` }}>
                    <span /><>{g.bays.map(bay => <span key={bay} className="text-[9px] text-center text-slate-600 font-mono">Bay {bay}</span>)}</>
                    {g.rows.map(row => <React.Fragment key={row}><span className="text-[9px] text-slate-600 font-mono self-center">{row}</span>{g.bays.map(bay => <div key={bay} className="grid gap-1 content-start">{getSlotsAt(slots, row, bay).length ? getSlotsAt(slots, row, bay).map(s => chip(s, true)) : <span className="text-[9px] p-1 text-slate-500 text-center border border-dashed border-slate-400 rounded">—</span>}</div>)}</React.Fragment>)}
                  </div></div>}
                </section>;
              })}
              {yardBlocks.length === 0 && <p className="text-sm text-slate-600 p-5">Chưa có block bãi. Cấu hình trong Danh sách Vị trí.</p>}
            </div>
            <aside className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="rounded-lg border border-slate-400 bg-[#E5EAF0] p-3 text-xs text-slate-600 flex flex-col justify-center text-center"><Warehouse className="mx-auto mb-2" size={22} /><strong>Kho CFS</strong><span className="text-[10px] mt-1">Rút / đóng hàng<br />Hạ tầng minh họa</span></div>
              <div className="rounded-lg border border-slate-400 bg-[#E5EAF0] p-3 text-xs text-slate-600 flex flex-col justify-center text-center"><ClipboardCheck className="mx-auto mb-2" size={22} /><strong>Khu kiểm tra</strong><span className="text-[10px] mt-1">Giám định / kiểm hóa<br />Hạ tầng minh họa</span></div>
            </aside>
          </div>
          <div className="bg-white rounded border border-slate-300 px-4 py-2 text-[10px] flex items-center justify-between text-slate-500"><span>ĐƯỜNG ĐẢO CHUYỂN & PHÒNG CHÁY</span><ArrowRightLeft size={14} /><span>KẾT NỐI KHO / BÃI</span></div>
        </div>
      </div>
    </section>
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
        <div><h3 className="font-bold text-sm">Chi tiết Block {selectedBlock?.blockCode ?? '—'}</h3><p className="text-[11px] text-slate-500 mt-1">{blockSlots.filter(s => s.occupiedByContainerId).length} có container · {blockSlots.filter(s => s.operational && !s.occupiedByContainerId).length} khả dụng · {blockSlots.filter(s => !s.operational).length} ngưng dùng</p></div>
        <div className="flex flex-wrap gap-2 text-xs">
          <select aria-label="Chọn block chi tiết" value={selectedBlock?.blockCode ?? ''} onChange={e => { setBlockCode(e.target.value); setTier('ALL'); }} className="border border-slate-300 rounded-lg px-2 py-2">{yardBlocks.map(b => <option key={b.id} value={b.blockCode}>Block {b.blockCode}</option>)}</select>
          <select aria-label="Chọn tầng hiển thị" value={visibleTier} onChange={e => setTier(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2"><option value="ALL">Tất cả tầng</option>{geometry.tiers.map(t => <option key={t} value={t}>Tầng {t}</option>)}</select>
          <label className="flex gap-2 border border-slate-300 rounded-lg items-center px-2"><Search size={14} /><input aria-label="Tìm vị trí hoặc container trên bản đồ" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã vị trí / container" className="py-2 w-40 outline-none" /></label>
        </div>
      </div>
      <div className="p-4 overflow-x-auto bg-slate-50"><div className="grid gap-2 min-w-fit" style={{ gridTemplateColumns: `48px repeat(${geometry.bays.length || 1}, minmax(150px, 1fr))` }}>
        <span />{geometry.bays.map(b => <span key={b} className="text-[11px] text-center font-semibold text-slate-500">Bay {b}</span>)}
        {geometry.rows.map(row => <React.Fragment key={row}><span className="text-xs text-slate-500 font-semibold self-center">Row {row}</span>{geometry.bays.map(bay => {
          const slots = getSlotsAt(blockSlots, row, bay).filter(s => visibleTier === 'ALL' || String(s.tierNo) === visibleTier);
          return <div key={bay} className="grid gap-2 content-start">{slots.length ? slots.map(s => chip(s)) : <span className="p-4 text-[11px] text-slate-400 border border-dashed border-slate-300 rounded text-center">Chưa cấu hình</span>}</div>;
        })}</React.Fragment>)}
      </div></div>
    </section>
    {selected && (() => {
      const a = describe(selected);
      const activeHold = holds.filter(h => h.containerVisitId === selected.occupiedByContainerId && h.status === 'ACTIVE');
      const holdInspections = inspections.filter(i => i.containerVisitId === selected.occupiedByContainerId && i.status === 'COMPLETED' && i.result === 'HOLD');
      return <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setSelectedId('')}>
        <section ref={slotDialog.ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Chi tiết vị trí ${selected.slotCode}`} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()} onKeyDown={slotDialog.onKeyDown}>
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold">Vị trí {selected.slotCode}</h3><button aria-label="Đóng chi tiết vị trí" onClick={() => setSelectedId('')} className="p-2 rounded hover:bg-slate-100"><X size={18} /></button></div>
          <span className="text-xs px-2 py-1 rounded border" style={{ background: a.background, color: a.color, borderColor: a.border }}>{a.label}</span>
          <dl className="grid grid-cols-2 gap-3 text-xs my-5">
            {[[ 'Block / Row / Bay / Tier', `${selected.blockCode} / ${selected.rowNo} / ${selected.bayNo} / ${selected.tierNo}`], ['Hoạt động', selected.operational ? 'Đang hoạt động' : 'Ngưng dùng / bảo trì'], ['Tải trọng tối đa', selected.maxWeightKg > 0 ? `${selected.maxWeightKg.toLocaleString('vi-VN')} kg` : 'Chưa cấu hình'], ['Nguồn điện lạnh', selected.reeferPower ? 'Có' : 'Không'], ['Loại hỗ trợ', selected.supportedType ?? 'Mọi loại'], ['Container hiện tại', a.container?.containerNumber ?? selected.occupiedByContainerNumber ?? 'Trống'], ['Loại / trọng lượng khai báo', a.container ? `${a.container.containerType} / ${a.container.grossWeightKg.toLocaleString('vi-VN')} kg` : '—'], ['Trạng thái backend', a.container?.state ?? '—']].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800 mt-1 break-words">{value}</dd></div>)}
          </dl>
          {(activeHold.length > 0 || holdInspections.length > 0) && <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-xs text-red-800 mb-4"><strong>HOLD · Đang chặn ra cổng</strong>{activeHold.map(h => <p key={h.id} className="mt-1">{h.holdType}: {h.reason}</p>)}{holdInspections.map(i => <p key={i.id} className="mt-1">Giám định: {i.notes || 'Kết quả HOLD'}</p>)}</div>}
          <div className="flex flex-wrap gap-2 text-xs">
            {a.container && can('container.read') && <button onClick={() => onContainer(a.container!.id)} className="bg-slate-100 border border-slate-300 px-3 py-2 rounded-lg">Hồ sơ container</button>}
            {a.container?.state === 'IN_YARD' && can('yard.move') && <button onClick={() => onOperation('MOVE', a.container!.id)} className="bg-blue-600 text-white px-3 py-2 rounded-lg">Tạo lệnh đảo chuyển</button>}
            {a.container?.state === 'IN_YARD' && can('yard.booking') && <button onClick={() => onOperation('BOOKING', a.container!.id)} className="border border-slate-300 px-3 py-2 rounded-lg">Đặt lịch trong bãi</button>}
            {a.container?.state === 'IN_YARD' && can('yard.inspect') && <button onClick={() => onOperation('INSPECTION', a.container!.id)} className="border border-slate-300 px-3 py-2 rounded-lg">Tạo giám định</button>}
            {!selected.occupiedByContainerId && selected.operational && can('yard.update') && <button onClick={() => onAssign(selected.slotCode)} className="bg-blue-600 text-white px-3 py-2 rounded-lg">Xếp container vào vị trí</button>}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">Điều kiện xuất cổng được kiểm tra riêng tại Phiếu ra cổng; đã cấp phiếu chưa đồng nghĩa đủ điều kiện.</p>
        </section>
      </div>;
    })()}
  </div>;
}
