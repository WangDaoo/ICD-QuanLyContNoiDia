import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TruckVisit, TruckVisitStatus } from '../types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
} from 'lucide-react';
import { NavTabId } from './Sidebar';

interface TruckVisitsViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
}

export const TruckVisitsView: React.FC<TruckVisitsViewProps> = ({ onNavigate }) => {
  const { truckVisits, createTruckVisit, updateTruckVisitStatus, containerVisits } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Truck Visit form
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [transporter, setTransporter] = useState('');
  const [type, setType] = useState<'GATE_IN' | 'GATE_OUT'>('GATE_IN');
  const [selectedConts, setSelectedConts] = useState<string>('');

  const filteredVisits = truckVisits.filter(
    (tv) =>
      tv.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.visitCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createTruckVisit({
      vehiclePlate: plate,
      driverName: driver,
      driverPhone: phone,
      transporterName: transporter,
      visitType: type,
      containerNumbers: [selectedConts],
      gateLane: undefined,
    });
    alert(result.message);
    if (result.success) setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Quản lý Chuyến xe ra/vào (Truck Visits)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đặt lịch hẹn trước tại cổng (Gate Appointment) nhằm rút ngắn thời gian xếp dỡ và tránh ùn tắc luồng xe
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Chuyến xe mới</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm biển số xe, tên tài xế, mã chuyến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-slate-400">Hiển thị {filteredVisits.length} chuyến xe</span>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVisits.map((tv) => (
          <div key={tv.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`p-1.5 rounded-lg ${tv.visitType === 'GATE_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {tv.visitType === 'GATE_IN' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">{tv.visitCode}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                tv.status === 'ARRIVED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                tv.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {tv.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Biển số xe:</span>{' '}
                <strong className="text-slate-800 font-mono text-sm">{tv.vehiclePlate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Tài xế:</span>{' '}
                <strong className="text-slate-800">{tv.driverName}</strong> ({tv.driverPhone})
              </div>
              <div>
                <span className="text-slate-400">Đơn vị vận tải:</span>{' '}
                <strong className="text-slate-700">{tv.transporterName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Làn cổng:</span>{' '}
                <strong className="text-blue-700">{tv.gateLane || 'Chưa ghi nhận làn'}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Container mang theo:</span>{' '}
                <span className="font-mono font-bold text-blue-700">{tv.containerNumbers.join(', ')}</span>
              </div>
              {tv.status === 'SCHEDULED' && (
                <button
                  onClick={() => updateTruckVisitStatus(tv.id, 'ARRIVED')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs"
                >
                  Xác nhận xe đến cổng (ARRIVED)
                </button>
              )}
              {tv.status === 'ARRIVED' && tv.visitType === 'GATE_IN' && (
                <button
                  onClick={() => onNavigate('gate-in')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                >
                  Tiến hành Tiếp nhận (Gate-in) →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tạo Lịch hẹn Chuyến xe (Truck Visit)</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại chuyến xe</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('GATE_IN')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      type === 'GATE_IN' ? 'bg-emerald-50 border-emerald-600 text-emerald-800' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Vào cổng (Gate-in)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('GATE_OUT')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      type === 'GATE_OUT' ? 'bg-blue-50 border-blue-600 text-blue-800' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Ra cổng (Gate-out)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biển số đầu kéo*</label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tài xế*</label>
                  <input
                    type="text"
                    required
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại*</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hãng vận tải (Transporter)</label>
                <input
                  type="text"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Container gắn chuyến*</label>
                <input
                  type="text"
                  required
                  value={selectedConts}
                  onChange={(e) => setSelectedConts(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Lưu Chuyến Xe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
