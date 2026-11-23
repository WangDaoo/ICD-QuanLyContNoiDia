import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { NavTabId } from './Sidebar';
import { canAccessWebTab, hasWebPermission } from '../services/permissions';
import { businessLabel } from '../lib/business-labels';
import { formatVietnamDateTime } from '../lib/time';
import { SearchableSelect } from './SearchableSelect';
import type { PickerOption } from './SearchableSelect';
import { StatusBadge } from './StatusBadge';
import { gateInService } from '../services/api/gate-in.service';
import type { GateInContextResponse } from '../services/api/gate-in.service';
import type { ContainerVisit, TruckVisit } from '../types';

type GateInMode = 'truck' | 'container';

/** The backend accepts a truck that has arrived or is part-way through (multi-container trucks). */
const AT_GATE_STATUSES = new Set<TruckVisit['status']>(['ARRIVED', 'IN_PROGRESS']);
const EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000;

interface GateInViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  /** Container visit to receive (from container detail / work queue). */
  defaultVisitId?: string;
  /** Truck already at the gate (from the dashboard "Xe đã đến cổng" list). */
  defaultTruckVisitId?: string;
}

export function GateInView({ onNavigate, defaultVisitId, defaultTruckVisitId }: GateInViewProps) {
  const { currentUser, containerVisits, truckVisits, gateInContainer } = useApp();
  const canReceive = hasWebPermission(currentUser, 'gate_in.create');

  const [mode, setMode] = useState<GateInMode>(
    defaultVisitId && !defaultTruckVisitId ? 'container' : 'truck',
  );
  const [truckId, setTruckId] = useState(defaultTruckVisitId || '');
  const [visitId, setVisitId] = useState(defaultVisitId || '');
  const [seal, setSeal] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [received, setReceived] = useState<{ containerNumber: string; at: string; truckId?: string } | null>(
    null,
  );
  const [gateContext, setGateContext] = useState<GateInContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(false);
  const [contextRetry, setContextRetry] = useState(0);

  const resetInputs = () => {
    setSeal('');
    setWeight('');
    setNotes('');
    setMessage('');
  };

  // Follow navigation targets (dashboard truck, container detail, work queue).
  useEffect(() => {
    if (!defaultVisitId && !defaultTruckVisitId) return;
    setMode(defaultVisitId && !defaultTruckVisitId ? 'container' : 'truck');
    setTruckId(defaultTruckVisitId || '');
    setVisitId(defaultVisitId || '');
    setReceived(null);
    resetInputs();
  }, [defaultVisitId, defaultTruckVisitId]);

  const atGateTrucks = truckVisits.filter((t) => t.visitType !== 'GATE_OUT' && AT_GATE_STATUSES.has(t.status));
  const truck = atGateTrucks.find((t) => t.id === truckId);
  const visit = containerVisits.find((c) => c.id === visitId);

  const containersOnTruck = (t: TruckVisit): ContainerVisit[] =>
    containerVisits.filter((c) => t.containerNumbers.includes(c.containerNumber) && c.state !== 'CANCELLED');
  const waitingOnTruck = (t: TruckVisit) => containersOnTruck(t).filter((c) => c.state === 'AUTHORIZED');
  const trucksForVisit = (v: ContainerVisit) => atGateTrucks.filter((t) => t.containerNumbers.includes(v.containerNumber));

  // Truck mode: a truck carrying exactly one container still to receive selects it automatically.
  useEffect(() => {
    if (mode !== 'truck' || !truck || visitId) return;
    const waiting = waitingOnTruck(truck);
    if (waiting.length === 1) setVisitId(waiting[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, truck, visitId, containerVisits]);

  // Container mode: a single matching truck at the gate is selected automatically.
  useEffect(() => {
    if (mode !== 'container' || !visit || truckId) return;
    const trucks = trucksForVisit(visit);
    if (trucks.length === 1) setTruckId(trucks[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, visit, truckId, truckVisits]);

  // Movement order and reception status from the backend for the selected container.
  useEffect(() => {
    setGateContext(null);
    setContextError(false);
    if (!visitId) return;
    let cancelled = false;
    setContextLoading(true);
    gateInService
      .getContext(visitId)
      .then((ctx) => {
        if (!cancelled) setGateContext(ctx);
      })
      .catch(() => {
        if (!cancelled) {
          setGateContext(null);
          setContextError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visitId, contextRetry]);

  const switchMode = (next: GateInMode) => {
    setMode(next);
    setTruckId('');
    setVisitId('');
    resetInputs();
  };
  const chooseTruck = (id: string) => {
    setTruckId(id);
    if (mode === 'truck') {
      setVisitId('');
      resetInputs();
    }
  };
  const chooseVisit = (id: string) => {
    setVisitId(id);
    resetInputs();
    if (mode === 'container') setTruckId('');
  };

  const movementOrder = gateContext?.movementOrder ?? null;
  const moExpiry = typeof movementOrder?.expiresAt === 'string' ? movementOrder.expiresAt : undefined;
  const moExpiresSoon = moExpiry !== undefined && new Date(moExpiry).getTime() - Date.now() < EXPIRY_WARNING_MS;
  const alreadyReceived = gateContext?.alreadyReceived === true;
  const missingMovementOrder = Boolean(gateContext) && !alreadyReceived && !movementOrder;
  const truckMatchesVisit = Boolean(truck && visit && truck.containerNumbers.includes(visit.containerNumber));

  const declaredSeal = visit?.manifestSeal?.trim().toUpperCase() || '';
  const sealMismatch = Boolean(declaredSeal && seal.trim() && seal.trim().toUpperCase() !== declaredSeal);
  const weightValue = Number(weight);
  const weightDiff =
    visit && weight !== '' && Number.isFinite(weightValue) && visit.grossWeightKg > 0
      ? weightValue - visit.grossWeightKg
      : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!visit || !truck || !truckMatchesVisit) {
      setMessage('Chọn chuyến xe đã đến cổng và container có trên xe đó.');
      return;
    }
    if (contextLoading || contextError) {
      setMessage('Chưa kiểm tra được lệnh cho phép vào cổng của container. Bấm "Kiểm tra lại" rồi thử tiếp nhận.');
      return;
    }
    if (!seal.trim() || !Number.isFinite(weightValue) || weightValue <= 0) {
      setMessage('Nhập seal thực tế và trọng lượng thực tế lớn hơn 0.');
      return;
    }
    if (sealMismatch && !notes.trim()) {
      setMessage('Seal thực tế khác seal khai báo: ghi rõ lý do trong ô ghi chú trước khi tiếp nhận.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await gateInContainer({
        visitId: visit.id,
        truckVisitId: truck.id,
        actualSeal: seal.trim().toUpperCase(),
        actualWeightKg: weightValue,
        vehiclePlate: truck.vehiclePlate,
        driverName: truck.driverName,
        conditionNotes: notes.trim() || undefined,
      });
      if (result.success) {
        setReceived({ containerNumber: visit.containerNumber, at: formatVietnamDateTime(new Date()), truckId: truck.id });
      } else {
        setMessage(result.message || 'Tiếp nhận không thành công. Kiểm tra lại thông tin và thử lại.');
      }
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-3 text-sm';

  // ----- Success screen -----
  if (received) {
    const sameTruck = atGateTrucks.find((t) => t.id === received.truckId);
    const moreOnTruck = sameTruck ? waitingOnTruck(sameTruck).filter((c) => c.id !== visitId) : [];
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Header />
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="text-base font-bold">Đã tiếp nhận container {received.containerNumber} vào bãi.</p>
          <p className="mt-1">Thời điểm tiếp nhận: {received.at}.</p>
          <p className="mt-1">Bước tiếp theo: xếp vị trí cho container trong bãi.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canAccessWebTab(currentUser, 'yard') && (
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
              onClick={() => onNavigate('yard', visitId)}
            >
              Xếp vị trí bãi →
            </button>
          )}
          {sameTruck && moreOnTruck.length > 0 && (
            <button
              type="button"
              className="rounded-lg border border-blue-300 bg-white px-4 py-3 font-semibold text-blue-800"
              onClick={() => {
                setReceived(null);
                setMode('truck');
                setTruckId(sameTruck.id);
                setVisitId('');
                resetInputs();
              }}
            >
              Tiếp nhận container còn lại trên xe {sameTruck.vehiclePlate} ({moreOnTruck.length})
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-3"
            onClick={() => {
              setReceived(null);
              setTruckId('');
              setVisitId('');
              resetInputs();
            }}
          >
            Tiếp nhận xe / container khác
          </button>
        </div>
      </div>
    );
  }

  // ----- Pickers -----
  const truckLabel = (t: TruckVisit) => {
    const waiting = waitingOnTruck(t).length;
    const parts = [t.vehiclePlate, t.driverName || 'Chưa có tên tài xế'];
    if (t.gateLane) parts.push(`Làn ${t.gateLane}`);
    parts.push(waiting ? `${waiting} container chờ tiếp nhận` : 'không còn container chờ');
    if (t.status === 'IN_PROGRESS') parts.push('đang làm dở');
    return parts.join(' · ');
  };

  const containerOptions: PickerOption[] = containerVisits
    .filter((c) => c.state === 'AUTHORIZED' || c.state === 'PENDING')
    .map((c) => ({
      value: c.id,
      label: c.containerNumber,
      description: `${businessLabel('containerType', c.containerType)} · ${c.consigneeName || 'Chưa có chủ hàng'} · ${businessLabel('containerVisitStatus', c.state)}`,
      keywords: [c.mblNumber, c.hblNumber, c.shippingLine, c.consigneeName].filter(Boolean).join(' '),
      disabled: c.state !== 'AUTHORIZED',
      disabledReason:
        c.state === 'PENDING' ? 'Chưa có lệnh cho phép vào cổng — cần điều phối duyệt lệnh trước.' : undefined,
    }));

  const truckOptions = mode === 'container' && visit ? trucksForVisit(visit) : atGateTrucks;
  const truckContainers = mode === 'truck' && truck ? containersOnTruck(truck) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Header />

      {!canReceive && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tài khoản chỉ được xem. Cần quyền tiếp nhận vào cổng để xác nhận.
        </p>
      )}

      <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <fieldset className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <legend className="sr-only">Cách bắt đầu tiếp nhận</legend>
          <span className="text-sm font-semibold text-slate-700">Bắt đầu từ:</span>
          {(
            [
              ['truck', 'Xe đã đến cổng'],
              ['container', 'Tìm theo số container'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                mode === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>

        {mode === 'container' && (
          <SearchableSelect
            label="Container cần tiếp nhận"
            options={containerOptions}
            value={visitId}
            onChange={chooseVisit}
            placeholder="Gõ số container, B/L, chủ hàng…"
            required
            emptyText="Không tìm thấy container đang chờ vào cổng."
            hint="Container chưa có lệnh cho phép vào cổng vẫn hiện nhưng không chọn được."
          />
        )}

        {(mode === 'truck' || visit) && (
          <div className="space-y-2">
            <label htmlFor="gate-in-truck" className="block text-sm font-semibold">
              Chuyến xe đã đến cổng*
            </label>
            <select
              id="gate-in-truck"
              value={truckId}
              onChange={(e) => chooseTruck(e.target.value)}
              className={field}
            >
              <option value="">— Chọn xe —</option>
              {truckOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {truckLabel(t)}
                </option>
              ))}
            </select>
            {!truckOptions.length && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {mode === 'container'
                  ? 'Chưa có xe nào chở container này được ghi nhận đến cổng.'
                  : 'Chưa có xe nào được ghi nhận đến cổng.'}{' '}
                {canAccessWebTab(currentUser, 'truck-visits') && (
                  <button type="button" onClick={() => onNavigate('truck-visits')} className="font-bold underline">
                    Ghi nhận xe đến tại Lịch xe ra/vào →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'truck' && truck && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Container trên xe {truck.vehiclePlate}</legend>
            {!truckContainers.length && (
              <p className="text-sm text-rose-800">
                Xe này chưa gắn container nào trong hệ thống. Kiểm tra lại lịch xe.
              </p>
            )}
            {truckContainers.map((c) => {
              const selectable = c.state === 'AUTHORIZED';
              return (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                    visitId === c.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                  } ${selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                >
                  <input
                    type="radio"
                    name="gate-in-container"
                    className="mt-1"
                    checked={visitId === c.id}
                    disabled={!selectable}
                    onChange={() => chooseVisit(c.id)}
                  />
                  <span className="flex-1">
                    <span className="block font-mono font-semibold text-slate-900">{c.containerNumber}</span>
                    <span className="block text-slate-600">
                      {businessLabel('containerType', c.containerType)} · {c.consigneeName || 'Chưa có chủ hàng'}
                    </span>
                    {!selectable && (
                      <span className="block text-caption text-slate-600">
                        {c.state === 'PENDING'
                          ? 'Chưa có lệnh cho phép vào cổng — không thể tiếp nhận.'
                          : 'Không còn chờ tiếp nhận.'}
                      </span>
                    )}
                  </span>
                  <StatusBadge domain="containerVisitStatus" value={c.state} />
                </label>
              );
            })}
          </fieldset>
        )}

        {visit && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-mono text-base font-semibold text-slate-900">{visit.containerNumber}</p>
              <p className="text-slate-700">
                {businessLabel('containerType', visit.containerType)} · {visit.consigneeName || 'Chưa có chủ hàng'}
                {visit.hblNumber ? ` · HBL ${visit.hblNumber}` : ''}
              </p>
              <p className="mt-1 text-slate-700">
                Seal khai báo: <strong>{visit.manifestSeal || 'Chưa khai báo'}</strong> · Trọng lượng khai báo:{' '}
                <strong>{visit.grossWeightKg ? `${visit.grossWeightKg.toLocaleString('vi-VN')} kg` : 'Chưa khai báo'}</strong>
              </p>
              <div className="mt-2" role="status">
                {contextLoading && <p className="text-slate-600">Đang kiểm tra lệnh cho phép vào cổng…</p>}
                {!contextLoading && contextError && (
                  <p role="alert" className="font-semibold text-rose-800">
                    Không kiểm tra được lệnh cho phép vào cổng (mất kết nối hoặc không đủ quyền).{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setContextRetry((value) => value + 1)}
                    >
                      Kiểm tra lại
                    </button>
                  </p>
                )}
                {!contextLoading && movementOrder && (
                  <p className={moExpiresSoon ? 'font-semibold text-rose-800' : 'text-emerald-800'}>
                    Lệnh cho phép vào cổng: còn hiệu lực
                    {moExpiry ? ` đến ${formatVietnamDateTime(moExpiry)}` : ''}
                    {moExpiresSoon ? ' — sắp hết hạn, tiếp nhận ngay hoặc báo điều phối gia hạn.' : '.'}
                  </p>
                )}
              </div>
            </div>

            {alreadyReceived && (
              <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                Container này đã được tiếp nhận vào bãi trước đó, không tiếp nhận lại.
              </p>
            )}
            {missingMovementOrder && (
              <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                Container chưa có lệnh cho phép vào cổng còn hiệu lực nên không thể tiếp nhận.{' '}
                {canAccessWebTab(currentUser, 'movement-orders') && (
                  <button
                    type="button"
                    className="font-bold underline"
                    onClick={() => onNavigate('movement-orders', visit.id)}
                  >
                    Mở lệnh cho phép vào cổng →
                  </button>
                )}
              </div>
            )}
            {truck && !truckMatchesVisit && (
              <p role="alert" className="text-sm text-rose-800">
                Xe {truck.vehiclePlate} không chở container {visit.containerNumber}. Chọn đúng xe.
              </p>
            )}

            {!alreadyReceived && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="gate-in-seal" className="block text-sm font-semibold">
                      Seal thực tế*
                    </label>
                    <input
                      id="gate-in-seal"
                      required
                      value={seal}
                      onChange={(e) => setSeal(e.target.value.toUpperCase())}
                      className={field + ' uppercase'}
                      placeholder="Đọc số seal trên container"
                      autoComplete="off"
                    />
                    {declaredSeal && seal.trim() && !sealMismatch && (
                      <p className="text-caption font-semibold text-emerald-800">Khớp seal khai báo.</p>
                    )}
                    {sealMismatch && (
                      <p className="text-caption font-semibold text-rose-800">
                        Khác seal khai báo ({visit.manifestSeal}) — bắt buộc ghi lý do bên dưới.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="gate-in-weight" className="block text-sm font-semibold">
                      Trọng lượng thực tế (kg)*
                    </label>
                    <input
                      id="gate-in-weight"
                      type="number"
                      inputMode="decimal"
                      required
                      min="0.001"
                      step="0.001"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className={field}
                    />
                    {weightDiff !== null && weightDiff !== 0 && (
                      <p className="text-caption text-slate-700">
                        Chênh so với khai báo: {weightDiff > 0 ? '+' : ''}
                        {weightDiff.toLocaleString('vi-VN')} kg
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="gate-in-notes" className="block text-sm font-semibold">
                    Ghi chú tình trạng container{sealMismatch ? '*' : ''}
                  </label>
                  <textarea
                    id="gate-in-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={field}
                    rows={3}
                    placeholder={sealMismatch ? 'Lý do seal khác khai báo, tình trạng vỏ…' : 'Móp, thủng, rỉ sét… (nếu có)'}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {message && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              busy ||
              contextLoading ||
              contextError ||
              !canReceive ||
              !visit ||
              !truckMatchesVisit ||
              alreadyReceived ||
              missingMovementOrder
            }
            aria-busy={busy || undefined}
            className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? 'Đang tiếp nhận…' : 'Xác nhận tiếp nhận vào cổng'}
          </button>
          {canAccessWebTab(currentUser, 'truck-visits') && (
            <button
              type="button"
              onClick={() => onNavigate('truck-visits')}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
            >
              Lịch xe ra/vào
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">Tiếp nhận container vào cổng</h2>
      <p className="mt-1 text-sm text-slate-600">
        Chọn xe đã đến cổng, chọn container trên xe, đối chiếu seal và cân thực tế rồi xác nhận. Hệ thống kiểm tra lại
        lệnh cho phép vào cổng khi lưu.
      </p>
    </div>
  );
}
