import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { NavTabId } from './Sidebar';
import { canAccessWebTab } from '../services/permissions';
export function GateInView({onNavigate,defaultVisitId}:{onNavigate:(tab:NavTabId,contextId?:string)=>void;defaultVisitId?:string}) {
  const {currentUser,containerVisits,truckVisits,gateInContainer} = useApp();
  const [visitId,setVisitId] = useState(defaultVisitId || '');const [truckId,setTruckId] = useState('');
  const [seal,setSeal] = useState('');const [weight,setWeight] = useState('');const [notes,setNotes] = useState('');
  const [busy,setBusy] = useState(false);const [message,setMessage] = useState('');const [received,setReceived] = useState(false);
  const eligible = containerVisits.filter(c => ['PENDING','AUTHORIZED'].includes(c.state));
  const visit = containerVisits.find(c => c.id === visitId);
  const trucks = truckVisits.filter(t => t.status === 'ARRIVED' && t.containerNumbers.includes(visit?.containerNumber || ''));
  useEffect(() => {if(defaultVisitId) setVisitId(defaultVisitId);},[defaultVisitId]);
  useEffect(() => {setTruckId('');setSeal('');setWeight('');setNotes('');setMessage('');},[visitId]);
  const submit = async (event:React.FormEvent) => {
    event.preventDefault();
    const truck = trucks.find(t => t.id === truckId);
    if (!visit || !truck || busy) {setMessage('Chọn container và chuyến xe đã đến cổng.');return;}
    if (!seal.trim() || !Number.isFinite(Number(weight)) || Number(weight)<=0) {setMessage('Nhập seal thực tế và trọng lượng dương.');return;}
    if (seal.trim().toUpperCase() !== visit.manifestSeal.toUpperCase() && !notes.trim()) {setMessage('Seal khác khai báo: cần ghi rõ lý do.');return;}
    setBusy(true);setMessage('');
    try {const result = await gateInContainer({visitId:visit.id,truckVisitId:truck.id,actualSeal:seal.trim().toUpperCase(),actualWeightKg:Number(weight),vehiclePlate:truck.vehiclePlate,driverName:truck.driverName,conditionNotes:notes});setMessage(result.message);setReceived(result.success);}
    finally {setBusy(false);}
  };
  const field='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm';
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Tiếp nhận container vào cổng</h2><p className="mt-1 text-sm text-slate-500">Đối chiếu xe đã đến, seal và trọng lượng thực tế trước khi tiếp nhận.</p></div>
    {message ? <p role={received ? 'status' : 'alert'} className={'rounded-xl border p-4 text-sm '+(received ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800')}>{message}</p> : null}
    {received ? <div className="flex flex-wrap gap-3">{canAccessWebTab(currentUser,'yard') ? <button className="rounded-lg bg-blue-600 px-4 py-3 text-white" onClick={() => onNavigate('yard',visitId)}>Xếp vị trí bãi</button> : null}<button className="rounded-lg border px-4 py-3" onClick={() => {setReceived(false);setVisitId('');setMessage('');}}>Tiếp nhận container tiếp theo</button></div> :
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block space-y-2 text-sm font-semibold"><span>Container chờ tiếp nhận</span><select required value={visitId} onChange={e => setVisitId(e.target.value)} className={field}><option value="">Chọn container</option>{eligible.map(c => <option key={c.id} value={c.id}>{c.containerNumber} · {c.state}</option>)}</select></label>
      {visit ? <p className="text-sm text-slate-600">Seal khai báo: <strong>{visit.manifestSeal || 'Chưa khai báo'}</strong> · Trọng lượng khai báo: {visit.grossWeightKg.toLocaleString()} kg</p> : null}
      <label className="block space-y-2 text-sm font-semibold"><span>Chuyến xe đã đến cổng</span><select required value={truckId} onChange={e => setTruckId(e.target.value)} className={field}><option value="">Chọn xe ARRIVED</option>{trucks.map(t => <option key={t.id} value={t.id}>{t.vehiclePlate} · {t.driverName} · {t.gateLane || ''}</option>)}</select></label>
      {visit && !trucks.length ? <p className="text-sm text-amber-800">Chưa có chuyến xe phù hợp đã đến cổng. Kiểm tra Chuyến xe ra/vào.</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block space-y-2 text-sm font-semibold"><span>Seal thực tế</span><input required value={seal} onChange={e => setSeal(e.target.value)} className={field} /></label><label className="block space-y-2 text-sm font-semibold"><span>Trọng lượng thực tế (kg)</span><input type="number" required min="0.001" step="0.001" value={weight} onChange={e => setWeight(e.target.value)} className={field} /></label></div>
      <label className="block space-y-2 text-sm font-semibold"><span>Ghi chú tình trạng container</span><textarea value={notes} onChange={e => setNotes(e.target.value)} className={field} rows={3} /></label>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !truckId} className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu với backend…' : 'Xác nhận gate-in'}</button><button type="button" onClick={() => onNavigate('truck-visits')} className="rounded-lg border px-4 py-3">Xem chuyến xe</button></div>
    </form>}
  </div>;
}
