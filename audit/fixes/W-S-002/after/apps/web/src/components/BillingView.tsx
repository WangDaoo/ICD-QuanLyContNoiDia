import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceOrder, Invoice, Payment, TariffRule } from '../types';
import {
  Receipt,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { NavTabId } from './Sidebar';

interface BillingViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigate, targetVisitId }) => {
  const {
    containerVisits,
    serviceOrders,
    invoices,
    payments,
    tariffRules,
    createServiceOrder,
    recordPayment,
    tariffs,
    createTariff,
    addTariffRule,
    activateTariff,
    retireTariff,
    confirmServiceOrder,
    cancelServiceOrder,
    issueInvoice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'INVOICES' | 'ORDERS' | 'TARIFFS'>('INVOICES');
  const [showCreateSoModal, setShowCreateSoModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New SO Form state
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    targetVisitId || containerVisits[0]?.id || ''
  );
  const { previewServiceOrder } = useApp();
  const [preview, setPreview] = useState<{items:any[];totalAmountVnd:number}|null>(null);
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    let current = true; setPreview(null); setPreviewError('');
    if (!showCreateSoModal || !selectedVisitId) return;
    previewServiceOrder(selectedVisitId).then(value => {if(current) setPreview(value);}).catch(error => {if(current) setPreviewError(error instanceof Error ? error.message : 'Không tính được phí.');});
    return () => {current = false;};
  },[showCreateSoModal,selectedVisitId,previewServiceOrder]);

  // Payment Form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CHUYEN_KHOAN' | 'TIEN_MAT'>('CHUYEN_KHOAN');
  const paymentPending = useRef(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Tariff management form state
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [tariffName, setTariffName] = useState('Biểu giá mới');
  const [tariffFrom, setTariffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [tariffTo, setTariffTo] = useState('');
  const [showRuleModal, setShowRuleModal] = useState<{ tariffId: string } | null>(null);
  const [ruleForm, setRuleForm] = useState({ serviceType: 'STORAGE', serviceName: 'Phí lưu bãi', containerType: 'ALL', unit: 'ngày', unitPriceVnd: 200000, freeDays: 5 });

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmountVnd, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmountVnd, 0);
  const totalDebt = totalInvoiced - totalPaid;

  const handleCreateSo = async (e: React.FormEvent) => {
    e.preventDefault();
    const visit = containerVisits.find((c) => c.id === selectedVisitId);
    if (!visit) return;

    if (!preview || previewError) return;
    const result = await createServiceOrder(visit.id);
    alert(result.message);
    if (result.success) setShowCreateSoModal(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentPending.current) return;
    paymentPending.current = true;
    setIsPaying(true);
    setPaymentError('');
    try {
      const result = await recordPayment(selectedInvoice.id, payAmount, payMethod);
      if (!result.success) {
        setPaymentError(result.message);
        return;
      }
      alert(result.message);
      setShowPayModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Kh\u00f4ng th\u1ec3 ghi nh\u1eadn thanh to\u00e1n. Vui l\u00f2ng th\u1eed l\u1ea1i.');
    } finally {
      paymentPending.current = false;
      setIsPaying(false);
    }
  };

  const closePaymentModal = () => {
    if (!paymentPending.current) setShowPayModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>Dịch vụ & Thanh toán (Billing & Invoices)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tính toán biểu phí lưu bãi, tiếp nhận, rút ruột (Stripping), kiểm định và xuất hóa đơn đối soát
          </p>
        </div>

        <button
          onClick={() => setShowCreateSoModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Đơn dịch vụ (Service Order)</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Tổng phí đã xuất Hóa đơn</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalInvoiced.toLocaleString()}₫</div>
          <div className="text-slate-400 mt-1">{invoices.length} hóa đơn phát hành</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Đã thu thực tế</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{totalPaid.toLocaleString()}₫</div>
          <div className="text-slate-400 mt-1">{payments.length} lượt giao dịch đã ghi nhận</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Công nợ chưa thu</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{totalDebt.toLocaleString()}₫</div>
          <div className="text-slate-400 mt-1">Ảnh hưởng trực tiếp đến điều kiện cấp Gate Pass</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 text-xs font-bold [&>button]:whitespace-nowrap">
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`pb-2.5 px-3 border-b-2 transition ${
            activeTab === 'INVOICES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hóa đơn phát hành ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`pb-2.5 px-3 border-b-2 transition ${
            activeTab === 'ORDERS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Đơn dịch vụ (Service Orders) ({serviceOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('TARIFFS')}
          className={`pb-2.5 px-3 border-b-2 transition ${
            activeTab === 'TARIFFS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Biểu phí dịch vụ (Tariffs) ({tariffRules.length})
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Số Hóa đơn</th>
                <th className="py-3 px-4">Container</th>
                <th className="py-3 px-4">Chủ hàng (Consignee)</th>
                <th className="py-3 px-4">Ngày xuất</th>
                <th className="py-3 px-4">Hạn TT</th>
                <th className="py-3 px-4">Tổng tiền</th>
                <th className="py-3 px-4">Đã thanh toán</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const remaining = inv.totalAmountVnd - inv.paidAmountVnd;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{inv.invoiceNo}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{inv.containerNumber}</td>
                    <td className="py-3 px-4 text-slate-800">{inv.consigneeName}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(inv.dueAt).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.totalAmountVnd.toLocaleString()}₫</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{inv.paidAmountVnd.toLocaleString()}₫</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {remaining > 0 ? (
                        <button
                          disabled={isPaying}
                          onClick={() => {
                            if (paymentPending.current) return;
                            setSelectedInvoice(inv);
                            setPayAmount(remaining);
                            setPaymentError('');
                            setShowPayModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                        >
                          Ghi nhận Thanh toán
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã trả đủ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: SERVICE ORDERS */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          {serviceOrders.map((so) => (
            <div key={so.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-sm text-slate-900">{so.orderCode}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-semibold rounded">
                    {so.containerNumber}
                  </span>
                  <span className="text-slate-600">{so.consigneeName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    so.status === 'INVOICED' || so.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    so.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                    so.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {so.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-sm text-slate-900">
                    Tổng: <span className="text-blue-600">{so.totalAmountVnd.toLocaleString()}₫</span>
                  </div>
                  {so.status === 'DRAFT' && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={async () => alert((await confirmServiceOrder(so.id)).message)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold">Xác nhận</button>
                      <button
                        onClick={async () => {
                          const reason = window.prompt('Lý do hủy Service Order:');
                          if (reason) alert((await cancelServiceOrder(so.id, reason)).message);
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                  {so.status === 'CONFIRMED' && (
                    <button
                      onClick={async () => {
                        const days = window.prompt('Hạn thanh toán (số ngày kể từ hôm nay):', '7');
                        if (days) {
                          const due = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
                          const res = await issueInvoice(so.id, due);
                          alert(res.message);
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold"
                    >
                      Phát hành Hóa đơn
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 font-medium">
                      <th className="pb-1">Tên dịch vụ</th>
                      <th className="pb-1">Số lượng</th>
                      <th className="pb-1">Đơn vị</th>
                      <th className="pb-1">Đơn giá</th>
                      <th className="pb-1 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {so.items.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="py-1.5 font-medium">{item.serviceName}</td>
                        <td className="py-1.5">{item.quantity}</td>
                        <td className="py-1.5">{item.unit}</td>
                        <td className="py-1.5">{item.unitPriceVnd.toLocaleString()}₫</td>
                        <td className="py-1.5 font-bold text-right">{item.amountVnd.toLocaleString()}₫</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TARIFFS */}
      {activeTab === 'TARIFFS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTariffModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tạo Bảng giá (Tariff)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tariffs.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-slate-800">{t.name}</div>
                    <div className="text-slate-500">Hiệu lực: {t.effectiveFrom} {t.effectiveTo ? `→ ${t.effectiveTo}` : ''}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : t.status === 'RETIRED' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => setShowRuleModal({ tariffId: t.id })} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold">
                    + Quy tắc giá
                  </button>
                  {t.status === 'DRAFT' && (
                    <button onClick={async () => alert((await activateTariff(t.id)).message)} className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-bold border border-emerald-200">
                      Kích hoạt
                    </button>
                  )}
                  {t.status === 'ACTIVE' && (
                    <button onClick={async () => alert((await retireTariff(t.id)).message)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200">
                      Ngừng sử dụng
                    </button>
                  )}
                  <span className="text-slate-400 ml-auto">{t.ruleIds.length} quy tắc</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Mã dịch vụ</th>
                <th className="py-3 px-4">Tên dịch vụ</th>
                <th className="py-3 px-4">Áp dụng Container</th>
                <th className="py-3 px-4">Đơn vị tính</th>
                <th className="py-3 px-4">Đơn giá quy định</th>
                <th className="py-3 px-4">Ngày miễn phí (Free days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tariffRules.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{tr.serviceType}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{tr.serviceName}</td>
                  <td className="py-3 px-4 font-semibold text-blue-700">{tr.containerType || 'ALL'}</td>
                  <td className="py-3 px-4 text-slate-600">{tr.unit}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{tr.unitPriceVnd.toLocaleString()}₫</td>
                  <td className="py-3 px-4 text-slate-600">{tr.freeDays ? `${tr.freeDays} ngày` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create Tariff Modal */}
      {showTariffModal && (
        <ModalOverlay aria-labelledby="billing-dialog-1-title" onClose={() => setShowTariffModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">Tạo Bảng giá mới</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="billing-tariff-name" className="block font-semibold text-slate-700 mb-1">Tên bảng giá*</label>
                <input id="billing-tariff-name" value={tariffName} onChange={(e) => setTariffName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="billing-tariff-from" className="block font-semibold text-slate-700 mb-1">Hiệu lực từ*</label>
                  <input id="billing-tariff-from" type="date" value={tariffFrom} onChange={(e) => setTariffFrom(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label htmlFor="billing-tariff-to" className="block font-semibold text-slate-700 mb-1">Hiệu lực đến</label>
                  <input id="billing-tariff-to" type="date" value={tariffTo} onChange={(e) => setTariffTo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
              <button onClick={() => setShowTariffModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium">Hủy</button>
              <button
                onClick={async () => {
                  const result = await createTariff(tariffName, tariffFrom, tariffTo || undefined);
                  alert(result.message);
                  if (result.success) setShowTariffModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                Tạo
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Add Tariff Rule Modal */}
      {showRuleModal && (
        <ModalOverlay aria-labelledby="billing-dialog-2-title" onClose={() => setShowRuleModal(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-2-title" className="text-base font-bold text-slate-900 mb-4">Thêm Quy tắc giá</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="billing-rule-form-service-type" className="block font-semibold text-slate-700 mb-1">Mã loại dịch vụ*</label>
                <select id="billing-rule-form-service-type" value={ruleForm.serviceType} onChange={(e) => setRuleForm({ ...ruleForm, serviceType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="RECEPTION">RECEPTION — Tiếp nhận</option>
                  <option value="STORAGE">STORAGE — Lưu bãi</option>
                  <option value="MOVEMENT">MOVEMENT — Di chuyển nội bãi</option>
                  <option value="STRIPPING">STRIPPING — Rút hàng</option>
                  <option value="INSPECTION">INSPECTION — Kiểm định</option>
                </select>
              </div>
              <p className="text-slate-500">Tên dịch vụ và đơn vị tính lấy từ danh mục. Quy tắc này áp dụng mọi kích thước và loại container.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="billing-rule-form-unit-price-vnd" className="block font-semibold text-slate-700 mb-1">Đơn giá (VNĐ)</label>
                  <input id="billing-rule-form-unit-price-vnd" type="number" value={ruleForm.unitPriceVnd} onChange={(e) => setRuleForm({ ...ruleForm, unitPriceVnd: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
              <button onClick={() => setShowRuleModal(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium">Hủy</button>
              <button
                onClick={async () => {
                  const result = await addTariffRule(showRuleModal.tariffId, { ...ruleForm, serviceType: ruleForm.serviceType as any, unit: ruleForm.unit as any, containerType: ruleForm.containerType as any });
                  alert(result.message);
                  if (result.success) setShowRuleModal(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create SO Modal */}
      {showCreateSoModal && (
        <ModalOverlay aria-labelledby="billing-dialog-3-title" onClose={() => setShowCreateSoModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-3-title" className="text-base font-bold text-slate-900 mb-4">Tạo Đơn dịch vụ (Service Order) mới</h3>
            <form onSubmit={handleCreateSo} className="space-y-4">
              <div>
                <label htmlFor="billing-selected-visit-id" className="block font-semibold text-slate-700 mb-1">Chọn Container*</label>
                <select id="billing-selected-visit-id"
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                >
                  {containerVisits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.containerNumber} — {c.consigneeName} ({c.containerType})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-slate-500">Phí được backend tính theo tác nghiệp thực tế và biểu giá đang hiệu lực.</p>
              {previewError ? <p role="alert" className="text-rose-700">{previewError}</p> : preview ? <div className="space-y-2 rounded-lg bg-slate-50 p-3">{preview.items.map((item,index) => <div key={index} className="flex flex-wrap justify-between gap-2"><span>{item.serviceName} · {item.quantity} {item.unit}</span><strong>{item.amountVnd.toLocaleString()} ₫</strong></div>)}<div className="border-t pt-2 font-bold">Tổng dự kiến: {preview.totalAmountVnd.toLocaleString()} ₫</div></div> : <p role="status">Đang tính phí từ backend…</p>}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateSoModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!preview || !!previewError || preview.items.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Tạo đơn dịch vụ nháp
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedInvoice && (
        <ModalOverlay aria-labelledby="billing-dialog-4-title" onClose={closePaymentModal} pending={isPaying} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-4-title" className="text-base font-bold text-slate-900 mb-2">Ghi nhận Thanh toán Hóa đơn</h3>
            <p className="text-slate-500 mb-4">
              Hóa đơn <strong>{selectedInvoice.invoiceNo}</strong> ({selectedInvoice.containerNumber}) — Chủ hàng:{' '}
              {selectedInvoice.consigneeName}
            </p>

            <form onSubmit={handleRecordPayment} aria-busy={isPaying} className="space-y-4">
              <div>
                <label htmlFor="billing-pay-amount" className="block font-semibold text-slate-700 mb-1">Số tiền thanh toán (VNĐ)*</label>
                <input id="billing-pay-amount"
                  type="number"
                  required
                  value={payAmount}
                  disabled={isPaying}
                  onChange={(e) => {
                    if (!paymentPending.current) setPayAmount(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-emerald-700"
                />
              </div>

              <div>
                <label htmlFor="billing-pay-method" className="block font-semibold text-slate-700 mb-1">Phương thức thanh toán*</label>
                <select id="billing-pay-method"
                  value={payMethod}
                  disabled={isPaying}
                  onChange={(e) => {
                    if (!paymentPending.current) setPayMethod(e.target.value as 'CHUYEN_KHOAN' | 'TIEN_MAT');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="CHUYEN_KHOAN">Chuyển khoản Ngân hàng (Bank Transfer)</option>
                  <option value="TIEN_MAT">Tiền mặt tại Quầy Thủ quỹ</option>
                </select>
              </div>

              {paymentError && <p role="alert" className="text-rose-700">{paymentError}</p>}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isPaying}
                  onClick={closePaymentModal}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isPaying ? '\u0110ang ghi nh\u1eadn...' : 'X\u00e1c nh\u1eadn Thu ti\u1ec1n'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
