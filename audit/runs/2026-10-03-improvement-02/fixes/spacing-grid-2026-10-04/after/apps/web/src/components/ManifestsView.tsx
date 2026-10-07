import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { Manifest } from '../types';
import { FileText, Plus, Search, CheckCircle2, Ship, Layers, Check, X } from 'lucide-react';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, DetailAvailability } from './CollectionState';
import { vietnamDateInput } from '../lib/time';
import { asRecord, asString } from '../services/mappers/api-response.mapper';
import { hasWebPermission } from '../services/permissions';

// ISO 6346 Container Number Check Digit Validator
export function validateISO6346(containerNumber: string): { isValid: boolean; message: string } {
  const clean = containerNumber.trim().toUpperCase();
  if (clean.length !== 11) {
    return { isValid: false, message: 'Số container phải có đúng 11 ký tự (4 chữ cái + 7 số)' };
  }

  const charCodeMap: Record<string, number> = {
    A: 10,
    B: 12,
    C: 13,
    D: 14,
    E: 15,
    F: 16,
    G: 17,
    H: 18,
    I: 19,
    J: 20,
    K: 21,
    L: 23,
    M: 24,
    N: 25,
    O: 26,
    P: 27,
    Q: 28,
    R: 29,
    S: 30,
    T: 31,
    U: 32,
    V: 34,
    W: 35,
    X: 36,
    Y: 37,
    Z: 38,
  };

  const letters = clean.substring(0, 4);
  const digits = clean.substring(4, 10);
  const checkDigitProvided = parseInt(clean.substring(10, 11), 10);

  if (!/^[A-Z]{4}$/.test(letters) || !/^\d{6}$/.test(digits) || isNaN(checkDigitProvided)) {
    return { isValid: false, message: 'Định dạng không đúng (4 chữ cái + 6 số + 1 số kiểm tra)' };
  }

  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const val = charCodeMap[letters[i]];
    sum += val * Math.pow(2, i);
  }
  for (let i = 0; i < 6; i++) {
    const val = parseInt(digits[i], 10);
    sum += val * Math.pow(2, i + 4);
  }

  const remainder = sum % 11;
  const calculatedCheckDigit = remainder === 10 ? 0 : remainder;

  if (calculatedCheckDigit === checkDigitProvided) {
    return { isValid: true, message: 'Chuẩn ISO 6346 hợp lệ' };
  } else {
    return {
      isValid: false,
      message: `Sai số kiểm tra check-digit: mong đợi ${calculatedCheckDigit}, thực tế là ${checkDigitProvided}`,
    };
  }
}

export const ManifestsView: React.FC = () => {
  const {
    currentUser,
    detailStatus,
    manifests,
    shippingLines,
    consignees,
    clearingAgents,
    addManifest,
    addMasterBl,
    addHouseBl,
    submitManifest,
    cancelManifest,
  } = useApp();
  const can = (permission: string) => hasWebPermission(currentUser, permission);

  const action = useCommandAction();
  const validation = useFormValidation();
  const [showMblModal, setShowMblModal] = useState(false);
  const [showHblModal, setShowHblModal] = useState<{ mblId: string } | null>(null);
  const [mblNumber, setMblNumber] = useState('');
  const [mblLine, setMblLine] = useState('');
  const [hblForm, setHblForm] = useState({
    hblNumber: '',
    consigneeName: '',
    clearingAgentName: '',
    cargoDescription: '',
    grossWeightKg: 0,
    packageCount: 0,
  });

  const [selectedManifestId, setSelectedManifestId] = useViewQueryState(
    'manifests',
    'selection',
    manifests[0]?.id || '',
  );
  const selectedManifest = manifests.find((m) => m.id === selectedManifestId) || null;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useViewQueryState('manifests', 'search', '');

  // Form State for new Manifest
  const [newVessel, setNewVessel] = useState('');
  const [newVoyage, setNewVoyage] = useState('');
  const [newShippingLine, setNewShippingLine] = useState('');
  const [newEta, setNewEta] = useState(vietnamDateInput());
  const [newPol, setNewPol] = useState('VNSGN (Cát Lái)');
  const [newPod, setNewPod] = useState('VNICD (ICD Hưng Yên)');

  // ISO test input
  const [testContainerInput, setTestContainerInput] = useState('CSQU3054383');

  useEffect(() => {
    if (!selectedManifestId && manifests.length) setSelectedManifestId(manifests[0].id);
  }, [manifests, selectedManifestId]);

  const handleCreateManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('manifest.create') || action.isPending() || !newVessel.trim() || !newVoyage.trim() || !newShippingLine) return;

    const manifest: Manifest = {
      id: '',
      manifestNo: '',
      vesselName: newVessel.trim(),
      voyageNo: newVoyage.trim(),
      shippingLine: newShippingLine,
      eta: newEta,
      portOfLoading: newPol,
      portOfDischarge: newPod,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      masterBills: [],
    };

    const result = await action.run(() => addManifest(manifest));
    if (result?.success) {
      setSelectedManifestId(asString(asRecord(result.data).id) || '');
      setShowCreateModal(false);
    }
  };

  const saveMbl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('manifest.update') || !selectedManifest || action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() =>
      addMasterBl(selectedManifest.id, mblNumber.trim().toUpperCase(), mblLine),
    );
    if (result?.success) {
      setMblNumber('');
      setShowMblModal(false);
    }
  };
  const saveHbl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !selectedManifest ||
      !showHblModal ||
      !can('manifest.update') ||
      action.isPending() ||
      !validation.validate(e.currentTarget)
    )
      return;
    const result = await action.run(() =>
      addHouseBl(selectedManifest.id, showHblModal.mblId, hblForm),
    );
    if (result?.success) {
      setHblForm({
        hblNumber: '',
        consigneeName: '',
        clearingAgentName: '',
        cargoDescription: '',
        grossWeightKg: 0,
        packageCount: 0,
      });
      setShowHblModal(null);
    }
  };

  const isoCheck = validateISO6346(testContainerInput);

  return (
    <div className="space-y-6">
      {!showCreateModal && !showMblModal && !showHblModal && (
        <CommandNotice notice={action.notice} />
      )}
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Bản lược khai hàng hóa (Manifest) & Vận đơn</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách tàu cập, Master Bill (MBL), House Bill (HBL) và đối soát chuẩn
            container ISO 6346
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            hidden={!can('manifest.create')}
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Manifest mới</span>
          </button>
        </div>
      </div>

      {/* ISO 6346 Quick Validator Card */}
      <ReadOnlyNotice writePermissions={['manifest.create', 'manifest.update', 'manifest.submit', 'manifest.cancel', 'master_bl.create', 'master_bl.update', 'house_bl.create', 'house_bl.update']} />
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-blue-950">
              Công cụ đối soát nhanh chuẩn Container ISO 6346
            </div>
            <div className="text-blue-800">
              Kiểm tra trọng số check-digit thời gian thực cho mã container 11 ký tự
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={testContainerInput}
            onChange={(e) => setTestContainerInput(e.target.value)}
            placeholder="Ví dụ: CSQU3054383"
            className="px-3 py-2 font-mono font-bold bg-white border border-blue-300 rounded-lg text-slate-800 w-44 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span
            className={`px-3 py-2 rounded-lg font-semibold flex items-center space-x-1 ${
              isoCheck.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isoCheck.isValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>{isoCheck.message}</span>
          </span>
        </div>
      </div>

      {/* Manifests List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã Manifest, tên tàu, voyage..."
              aria-label="Tìm Manifest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <CollectionState
              resource="manifests"
              count={
                manifests.filter(
                  (m) =>
                    m.manifestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.vesselName.toLowerCase().includes(searchTerm.toLowerCase()),
                ).length
              }
              total={manifests.length}
              filtered={!!searchTerm}
              onClear={() => setSearchTerm('')}
            />
            {manifests
              .filter(
                (m) =>
                  m.manifestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.vesselName.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((m) => {
                const isSelected = selectedManifest?.id === m.id;
                return (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    key={m.id}
                    onClick={() => setSelectedManifestId(m.id)}
                    className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-700">
                        {m.manifestNo}
                      </span>
                      <span
                        className={`px-2 py-1 text-caption font-bold rounded-full ${
                          m.status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </span>
                    <span className="block text-xs font-bold text-slate-800 mt-1 flex items-center space-x-2">
                      <Ship className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.vesselName}</span>
                      <span className="text-slate-400 font-normal">({m.voyageNo})</span>
                    </span>
                    <span className="block flex items-center justify-between mt-2 text-caption text-slate-500">
                      <span>
                        Hãng: <strong className="text-slate-700">{m.shippingLine}</strong>
                      </span>
                      <span>ETA: {new Date(m.eta).toLocaleDateString('vi-VN')}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right 2 Columns: Detailed Breakdown */}
        <div className="lg:col-span-2">
          {selectedManifest ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-6">
              {/* Manifest Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedManifest.manifestNo}
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                      Hãng tàu: {selectedManifest.shippingLine}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tàu: <strong>{selectedManifest.vesselName}</strong> · Voyage:{' '}
                    <strong>{selectedManifest.voyageNo}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="text-slate-500">ETA Ngày đến:</div>
                    <div className="font-bold text-slate-800">
                      {new Date(selectedManifest.eta).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  {selectedManifest.status === 'DRAFT' && (
                    <div className="flex items-center gap-2">
                      <button
                        hidden={!can('manifest.update')}
                        onClick={() => setShowMblModal(true)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-caption font-bold rounded-lg"
                      >
                        + Master BL
                      </button>
                      <button
                        hidden={!can('manifest.submit')}
                        disabled={action.pending}
                        onClick={async () => {
                          await action.run(() => submitManifest(selectedManifest.id));
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-caption font-bold rounded-lg"
                      >
                        Submit Manifest
                      </button>
                      <button
                        hidden={!can('manifest.cancel')}
                        disabled={action.pending}
                        onClick={async () => {
                          const reason = window.prompt('Lý do hủy Manifest:');
                          if (reason) {
                            await action.run(() => cancelManifest(selectedManifest.id, reason));
                          }
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-caption font-bold rounded-lg border border-rose-200"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <DetailAvailability resource="manifests" id={selectedManifest.id} />
              {/* Master Bills & House Bills Tree */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Danh sách Master BL & House BL liên kết</span>
                </h4>

                <div className="space-y-3">
                  {selectedManifest.masterBills.map((mbl) => (
                    <div
                      key={mbl.id}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-slate-200 text-slate-800 font-mono text-xs font-bold rounded">
                            Master BL
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {mbl.mblNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            Hãng: {mbl.shippingLine}
                          </span>
                          {selectedManifest.status === 'DRAFT' && (
                            <button
                              hidden={!can('manifest.update')}
                              onClick={() => setShowHblModal({ mblId: mbl.id })}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-caption font-bold rounded border border-blue-200"
                            >
                              + House BL
                            </button>
                          )}
                        </div>
                      </div>

                      {mbl.houseBills.length === 0 &&
                        (!detailStatus?.manifests?.[selectedManifest.id] ||
                          detailStatus.manifests[selectedManifest.id] === 'ready') && (
                          <div className="text-caption text-slate-400 italic pl-4">
                            Chưa có House BL nào.
                          </div>
                        )}

                      {/* House BLs List */}
                      <div className="pl-4 border-l-2 border-blue-200 space-y-2 mt-3">
                        {mbl.houseBills.map((hbl) => (
                          <div
                            key={hbl.id}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-700">
                                {hbl.hblNumber}
                              </span>
                              <span className="text-slate-500 font-semibold">
                                {hbl.packageCount} kiện ·{' '}
                                {(hbl.grossWeightKg ?? 0).toLocaleString()} kg
                              </span>
                            </div>
                            <div className="text-slate-800">
                              Chủ hàng (Consignee): <strong>{hbl.consigneeName}</strong>
                            </div>
                            <div className="text-slate-500">
                              Mô tả hàng: <span>{hbl.cargoDescription}</span>
                            </div>
                            <div className="text-caption text-slate-400">
                              Đại lý thông quan: {hbl.clearingAgentName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Chọn một Manifest bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalOverlay
          aria-labelledby="manifests-dialog-1-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowCreateModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 id="manifests-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">
              Tạo Bản lược khai (Manifest) mới
            </h3>
            <CommandNotice notice={action.notice} />
            <form onSubmit={handleCreateManifest} className="space-y-4 text-xs">
              <p className="text-slate-500">Mã Manifest được backend cấp sau khi lưu.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manifests-new-vessel"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Tên Tàu (Vessel)*
                  </label>
                  <input
                    id="manifests-new-vessel"
                    type="text"
                    required
                    placeholder="Ví dụ: WAN HAI 502"
                    value={newVessel}
                    onChange={(e) => setNewVessel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manifests-new-voyage"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Số Chuyến (Voyage)*
                  </label>
                  <input
                    id="manifests-new-voyage"
                    type="text"
                    required
                    placeholder="Ví dụ: V.245N"
                    value={newVoyage}
                    onChange={(e) => setNewVoyage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manifests-new-shipping-line"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Hãng tàu (Shipping Line)*
                  </label>
                  <select
                    id="manifests-new-shipping-line"
                    value={newShippingLine}
                    onChange={(e) => setNewShippingLine(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Chọn hãng tàu</option>
                    {shippingLines
                      .filter((line) => line.active)
                      .map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="manifests-new-eta"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Ngày tàu đến (ETA)*
                  </label>
                  <input
                    id="manifests-new-eta"
                    type="date"
                    required
                    value={newEta}
                    onChange={(e) => setNewEta(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manifests-new-pol"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Cảng xếp hàng (POL)
                  </label>
                  <input
                    id="manifests-new-pol"
                    type="text"
                    value={newPol}
                    onChange={(e) => setNewPol(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manifests-new-pod"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Cảng dỡ / Cảng đích (POD)
                  </label>
                  <input
                    id="manifests-new-pod"
                    type="text"
                    value={newPod}
                    onChange={(e) => setNewPod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Xác nhận lưu Manifest
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Add Master BL Modal */}
      {showMblModal && selectedManifest && (
        <ModalOverlay
          aria-labelledby="manifests-dialog-2-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowMblModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="manifests-dialog-2-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm Master BL vào {selectedManifest.manifestNo}
            </h3>
            <form noValidate onSubmit={saveMbl} className="space-y-3">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label
                    htmlFor="manifests-mbl-number"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Số MBL*
                  </label>
                  <input
                    id="manifests-mbl-number"
                    required
                    {...validation.props('manifests-mbl-number')}
                    type="text"
                    value={mblNumber}
                    onChange={(e) => setMblNumber(e.target.value)}
                    placeholder="Ví dụ: MBL20260920001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manifests-mbl-line"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Hãng tàu*
                  </label>
                  <select
                    id="manifests-mbl-line"
                    required
                    {...validation.props('manifests-mbl-line')}
                    value={mblLine}
                    onChange={(e) => setMblLine(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Chọn hãng tàu</option>
                    {shippingLines
                      .filter((line) => line.active)
                      .map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name}
                        </option>
                      ))}
                  </select>
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowMblModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Lưu Master BL
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Add House BL Modal */}
      {showHblModal && selectedManifest && (
        <ModalOverlay
          aria-labelledby="manifests-dialog-3-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowHblModal(null);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="manifests-dialog-3-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm House BL
            </h3>
            <form noValidate onSubmit={saveHbl} className="space-y-3">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label
                    htmlFor="manifests-hbl-form-hbl-number"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Số HBL*
                  </label>
                  <input
                    id="manifests-hbl-form-hbl-number"
                    required
                    {...validation.props('manifests-hbl-form-hbl-number')}
                    type="text"
                    value={hblForm.hblNumber}
                    onChange={(e) => setHblForm({ ...hblForm, hblNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manifests-hbl-form-consignee-name"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Chủ hàng (Consignee)*
                  </label>
                  <select
                    id="manifests-hbl-form-consignee-name"
                    required
                    {...validation.props('manifests-hbl-form-consignee-name')}
                    value={hblForm.consigneeName}
                    onChange={(e) => setHblForm({ ...hblForm, consigneeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Chọn từ danh mục</option>
                    {consignees
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="manifests-hbl-form-clearing-agent-name"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Đại lý thông quan
                  </label>
                  <select
                    id="manifests-hbl-form-clearing-agent-name"
                    value={hblForm.clearingAgentName}
                    onChange={(e) => setHblForm({ ...hblForm, clearingAgentName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Chọn từ danh mục</option>
                    {clearingAgents
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="manifests-hbl-form-cargo-description"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Mô tả hàng hóa
                  </label>
                  <input
                    id="manifests-hbl-form-cargo-description"
                    type="text"
                    value={hblForm.cargoDescription}
                    onChange={(e) => setHblForm({ ...hblForm, cargoDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="manifests-hbl-form-gross-weight-kg"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Trọng lượng (kg)
                    </label>
                    <input
                      id="manifests-hbl-form-gross-weight-kg"
                      type="number"
                      value={hblForm.grossWeightKg}
                      onChange={(e) =>
                        setHblForm({ ...hblForm, grossWeightKg: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="manifests-hbl-form-package-count"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Số kiện
                    </label>
                    <input
                      id="manifests-hbl-form-package-count"
                      type="number"
                      value={hblForm.packageCount}
                      onChange={(e) =>
                        setHblForm({ ...hblForm, packageCount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowHblModal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Lưu House BL
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
