import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { yardService, type YardAssignmentCheck } from '../../services/api/yard.service';
import { getBlockGeometry, getSlotsAt } from './yard-model';
import { businessLabel } from '../../lib/business-labels';
import type { YardRecommendation } from '../../types';

export function YardAssignment({
  targetVisitId,
  initialSlotCode,
  onOperation,
}: {
  targetVisitId?: string;
  initialSlotCode?: string;
  /** Navigate to OPS tab with the given action pre-selected for a visitId. */
  onOperation?: (action: 'BOOKING' | 'INSPECTION' | 'MOVE', visitId: string) => void;
}) {
  const {
    containerVisits,
    yardBlocks,
    yardSlots,
    assignYardSlot,
    currentUser,
    isLoading,
    apiReady,
    getSlotRecommendations,
  } = useApp();
  const initialSlot = yardSlots.find((s) => s.slotCode === initialSlotCode);
  const [visitId, setVisitId] = useState(
    targetVisitId ??
      containerVisits.find((v) => v.state === 'IN_YARD' && !v.currentLocation)?.id ??
      '',
  );
  const [block, setBlock] = useState(initialSlot?.blockCode ?? yardBlocks[0]?.blockCode ?? '');
  const [row, setRow] = useState(initialSlot ? String(initialSlot.rowNo) : '');
  const [bay, setBay] = useState(initialSlot ? String(initialSlot.bayNo) : '');
  const [tier, setTier] = useState(initialSlot ? String(initialSlot.tierNo) : '');
  const [result, setResult] = useState<YardAssignmentCheck>();
  const [checkedKey, setCheckedKey] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string }>();
  const [recommendations, setRecommendations] = useState<YardRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const requestSequence = useRef(0);
  const canAssign =
    currentUser.permissionCodes?.some((p) => p === '*' || p === 'yard.update') ?? false;
  const busy = pending || isLoading || !apiReady;
  const resolvedBlock = yardBlocks.some((b) => b.blockCode === block)
    ? block
    : (yardBlocks[0]?.blockCode ?? '');
  const slots = yardSlots.filter((s) => s.blockCode === resolvedBlock);
  const rows = getBlockGeometry(slots).rows;
  const resolvedRow = rows.includes(row) ? row : (rows[0] ?? '');
  const bays = getBlockGeometry(slots.filter((s) => String(s.rowNo) === resolvedRow)).bays;
  const resolvedBay = bays.includes(bay) ? bay : (bays[0] ?? '');
  const tiers = getBlockGeometry(getSlotsAt(slots, resolvedRow, resolvedBay)).tiers;
  const resolvedTier = tiers.includes(tier) ? tier : (tiers[0] ?? '');
  const slot = getSlotsAt(slots, resolvedRow, resolvedBay, resolvedTier)[0];
  const visit = containerVisits.find((v) => v.id === visitId);
  const key = `${visitId}:${slot?.id ?? ''}`;

  // Keep the latest loader without refetching on every context render.
  const loadRecommendations = useRef(getSlotRecommendations);
  loadRecommendations.current = getSlotRecommendations;

  // YARD-01: Fetch slot recommendations whenever visitId changes
  useEffect(() => {
    if (!visitId || !apiReady) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    setRecsLoading(true);
    loadRecommendations
      .current(visitId)
      .then((recs) => {
        if (!cancelled) setRecommendations(recs.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setRecsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visitId, apiReady]);

  // Changing selection invalidates a previous check, including an in-flight response.
  useEffect(() => {
    requestSequence.current++;
    setResult(undefined);
    setCheckedKey('');
    setFeedback(undefined);
  }, [key]);

  const localBlocker = !visit
    ? 'Chọn container cần xếp vị trí.'
    : visit.state !== 'IN_YARD'
      ? 'Container chưa ở trong bãi.'
      : visit.currentLocation
        ? `Container đã có vị trí ${visit.currentLocation}. Dùng lệnh đảo chuyển để di dời.`
        : !slot
          ? 'Chưa có vị trí tại tọa độ này.'
          : !slot.operational
            ? 'Vị trí đang ngưng dùng hoặc bảo trì.'
            : slot.occupiedByContainerId
              ? 'Vị trí đang có container.'
              : '';

  const hasLocationBlocker = !!(visit?.currentLocation);

  // YARD-01: Apply a recommended slot to the manual selector fields
  const applyRecommendation = (rec: YardRecommendation) => {
    setBlock(rec.slot.blockCode);
    setRow(String(rec.slot.rowNo));
    setBay(String(rec.slot.bayNo));
    setTier(String(rec.slot.tierNo));
  };

  const check = async () => {
    if (!visit || !slot || busy || !canAssign) return;
    const sequence = ++requestSequence.current;
    setPending(true);
    setFeedback(undefined);
    setResult(undefined);
    setCheckedKey('');
    try {
      const checked = await yardService.checkSlot(visit.id, slot.id);
      if (sequence === requestSequence.current) {
        setResult(checked);
        setCheckedKey(key);
      }
    } catch (error) {
      if (sequence === requestSequence.current)
        setFeedback({
          success: false,
          message: error instanceof Error ? error.message : 'Không kiểm tra được vị trí.',
        });
    } finally {
      setPending(false);
    }
  };

  const assign = async () => {
    if (
      !visit ||
      !slot ||
      !result?.eligible ||
      checkedKey !== key ||
      localBlocker ||
      !canAssign ||
      busy
    )
      return;
    setPending(true);
    try {
      // Picking a recommended slot (by button or same coordinates) reports it back as feedback.
      const chosenRecommendation = recommendations.find((rec) => rec.slot.id === slot.id);
      const fb = await assignYardSlot(visit.id, slot.slotCode, chosenRecommendation);
      setFeedback(fb);
      setResult(undefined);
      setCheckedKey('');
    } catch (error) {
      setFeedback({
        success: false,
        message: error instanceof Error ? error.message : 'Không xếp được vị trí.',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* YARD-01: Slot recommendations panel */}
      {visitId && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Gợi ý vị trí xếp</h3>
          {recsLoading ? (
            <p className="text-xs text-slate-500">Đang tải gợi ý vị trí…</p>
          ) : recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.map((rec, idx) => {
                // Without an ML probability the backend ranks by rule score only.
                const score =
                  rec.mlProbability !== null
                    ? Math.round((rec.ruleScore + rec.mlProbability * 100) / 2)
                    : Math.round(rec.ruleScore);
                return (
                  <div
                    key={rec.slot.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-700">
                        #{idx + 1} {rec.slot.slotCode}
                      </span>
                      <span className="ml-2 text-slate-500">Điểm: {score}</span>
                      {rec.reasons.length > 0 && (
                        <span className="ml-2 text-slate-500">— {rec.reasons.join(', ')}</span>
                      )}
                    </div>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => applyRecommendation(rec)}
                        className="whitespace-nowrap rounded-md border border-blue-300 px-3 py-1 text-blue-700 hover:bg-blue-50"
                      >
                        Chọn
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Không có gợi ý tự động. Chọn vị trí thủ công bên dưới.
            </p>
          )}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold">Xếp vị trí bãi</h3>
        {!canAssign && (
          <p className="text-xs text-slate-500">
            Tài khoản chỉ có quyền xem bãi, không được xếp vị trí.
          </p>
        )}
        <label className="block text-xs font-semibold">
          Container cần xếp vị trí
          <select
            disabled={busy || !canAssign}
            aria-label="Container cần xếp vị trí"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg p-2 mt-1 bg-white"
          >
            <option value="">— Chọn container —</option>
            {/* YARD-07: add MBL + consignee info to container options */}
            {containerVisits
              .filter((v) => v.state === 'IN_YARD' || v.id === targetVisitId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.containerNumber} · {v.containerType}
                  {v.mblNumber ? ` · MBL: ${v.mblNumber}` : ''}
                  {v.consigneeName ? ` · ${v.consigneeName}` : ''}
                  {v.currentLocation
                    ? ` · Đã có vị trí ${v.currentLocation}`
                    : ' · Chờ xếp vị trí'}
                </option>
              ))}
          </select>
        </label>
        {visit && (
          <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
            {/* YARD-02: show Vietnamese state label */}
            {visit.containerNumber} · {visit.containerType} ·{' '}
            {visit.grossWeightKg.toLocaleString('vi-VN')} kg ·{' '}
            {businessLabel('containerVisitStatus', visit.state)}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label>
            Block
            <select
              aria-label="Block xếp vị trí"
              disabled={busy || !canAssign}
              value={resolvedBlock}
              onChange={(e) => {
                setBlock(e.target.value);
                setRow('');
                setBay('');
                setTier('');
              }}
              className="block w-full border border-slate-300 rounded-lg p-2 mt-1"
            >
              {/* YARD-12: show full block name */}
              {yardBlocks.map((b) => (
                <option key={b.id} value={b.blockCode}>
                  {b.name ? `${b.blockCode} — ${b.name}` : `Block ${b.blockCode}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Row
            <select
              aria-label="Row xếp vị trí"
              disabled={busy || !canAssign}
              value={resolvedRow}
              onChange={(e) => {
                setRow(e.target.value);
                setBay('');
                setTier('');
              }}
              className="block w-full border border-slate-300 rounded-lg p-2 mt-1"
            >
              {rows.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bay
            <select
              aria-label="Bay xếp vị trí"
              disabled={busy || !canAssign}
              value={resolvedBay}
              onChange={(e) => {
                setBay(e.target.value);
                setTier('');
              }}
              className="block w-full border border-slate-300 rounded-lg p-2 mt-1"
            >
              {bays.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tier
            <select
              aria-label="Tier xếp vị trí"
              disabled={busy || !canAssign}
              value={resolvedTier}
              onChange={(e) => setTier(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg p-2 mt-1"
            >
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        {slot && (
          <p className="text-xs text-slate-600">
            {slot.slotCode} · Tải tối đa{' '}
            {slot.maxWeightKg > 0
              ? `${slot.maxWeightKg.toLocaleString('vi-VN')} kg`
              : 'chưa cấu hình'}{' '}
            · {slot.reeferPower ? 'Có điện lạnh' : 'Không điện lạnh'}
          </p>
        )}
        {/* YARD-06: blocker with move shortcut when container already has a location */}
        {hasLocationBlocker && !feedback?.success && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <span>
              Container đã có vị trí {visit!.currentLocation}. Dùng lệnh đảo chuyển để di dời.
            </span>
            {canAssign && onOperation && (
              <button
                type="button"
                onClick={() => onOperation('MOVE', visitId)}
                className="whitespace-nowrap rounded-md bg-amber-800 text-white px-3 py-1 font-semibold hover:bg-amber-900"
              >
                Tạo lệnh đảo chuyển
              </button>
            )}
          </div>
        )}
        {/* regular blocker (not location-based) */}
        {localBlocker && !hasLocationBlocker && !feedback?.success && (
          <p role="status" className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">
            {localBlocker}
          </p>
        )}
        {/* YARD-02: fix check result messages */}
        {result && (
          <div
            role="status"
            className={`rounded-lg p-3 text-xs ${result.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          >
            <strong>
              {result.eligible
                ? 'Vị trí phù hợp — có thể xếp.'
                : 'Vị trí không phù hợp — xem chi tiết bên dưới.'}
            </strong>
            {result.blockers.map((b) => (
              <p key={b.code} className="mt-1">
                {b.message}
              </p>
            ))}
            {result.warnings.map((w) => (
              <p key={w.code} className="mt-1">
                Lưu ý: {w.message}
              </p>
            ))}
          </div>
        )}
        {feedback && (
          <p
            role={feedback.success ? 'status' : 'alert'}
            className={`rounded-lg p-3 text-xs ${feedback.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          >
            {feedback.message}
          </p>
        )}
        {/* YARD-05: next-step actions after successful assignment */}
        {feedback?.success && onOperation && visitId && (
          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <span className="text-slate-500 self-center">Bước tiếp theo:</span>
            <button
              type="button"
              onClick={() => onOperation('BOOKING', visitId)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white"
            >
              Đặt lịch tác nghiệp bãi
            </button>
            <button
              type="button"
              onClick={() => onOperation('INSPECTION', visitId)}
              className="px-4 py-2 border border-blue-300 rounded-lg text-blue-700"
            >
              Tạo yêu cầu kiểm định
            </button>
          </div>
        )}
        {canAssign && (
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              disabled={!visit || !slot || !!localBlocker || busy}
              onClick={check}
              className="px-4 py-2 border border-blue-300 rounded-lg text-blue-700 disabled:opacity-40"
            >
              {/* YARD-02: removed 'backend' wording */}
              {pending ? 'Đang xử lý…' : 'Kiểm tra vị trí'}
            </button>
            <button
              disabled={!result?.eligible || checkedKey !== key || !!localBlocker || busy}
              onClick={assign}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white disabled:opacity-40"
            >
              Xác nhận xếp vị trí bãi
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
