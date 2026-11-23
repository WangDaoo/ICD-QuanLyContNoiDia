import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, ServiceOrder, ServiceOrderItem, TariffRule } from '../types';
import { AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Plus, Receipt } from 'lucide-react';
import { NavTabId } from './Sidebar';
import { useCommandAction, CommandNotice } from './useCommandAction';
import { vietnamDateInput, vietnamDateTimeInput, vietnamDateTimeToIso, formatVietnamDate } from '../lib/time';
import { CollectionState, ConfirmedResourceValue, ResourceContent } from './CollectionState';
import { isValidPaymentAmount, PAYMENT_AMOUNT_ERROR } from '../services/payment-amount';
import { StatusBadge } from './StatusBadge';
import { SearchableSelect } from './SearchableSelect';
import type { PickerOption } from './SearchableSelect';
import { ConfirmDialog } from './ConfirmDialog';

// BILL-09: payment method display map (kept local to avoid dependency on business-labels)
const PAY_METHOD_LABEL: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  THE: 'Thẻ',
  UNKNOWN: 'Không xác định',
};

/** Returns a YYYY-MM-DD string for today + N days in Vietnam timezone (UTC+7). */
function addDays(n: number): string {
  return vietnamDateInput(Date.now() + n * 86400000);
}

interface BillingViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigate, targetVisitId }) => {
  const {
    currentUser,
    containerVisits,
    serviceOrders,
    invoices,
    payments,
    tariffRules,
    serviceTypes = [],
    resourceStatus = {},
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

  const action = useCommandAction();
  const can = (permission: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === permission) ?? false;

  // --- Tab ---
  const [activeTabValue, setActiveTab] = useViewQueryState('billing', 'section', 'INVOICES');
  const activeTab =
    activeTabValue === 'INVOICES' || activeTabValue === 'ORDERS' || activeTabValue === 'TARIFFS'
      ? activeTabValue
      : 'INVOICES';

  // --- BILL-13: filter chips ---
  const [invoiceFilter, setInvoiceFilter] = useState<string>('ALL');
  const [orderFilter, setOrderFilter] = useState<string>('ALL');

  // --- BILL-09: expandable payment history rows ---
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // --- Create SO modal ---
  const [showCreateSoModal, setShowCreateSoModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    targetVisitId || containerVisits[0]?.id || '',
  );
  const { previewServiceOrder } = useApp();
  const [preview, setPreview] = useState<{
    items: Omit<ServiceOrderItem, 'id'>[];
    totalAmountVnd: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    let current = true;
    setPreview(null);
    setPreviewError('');
    if (!showCreateSoModal || !selectedVisitId) return;
    previewServiceOrder(selectedVisitId)
      .then((value) => { if (current) setPreview(value); })
      .catch((error) => {
        if (current) setPreviewError(error instanceof Error ? error.message : 'Không tính được phí.');
      });
    return () => { current = false; };
  }, [showCreateSoModal, selectedVisitId, previewServiceOrder]);

  // --- BILL-04: cancel SO modal ---
  const [cancelSo, setCancelSo] = useState<ServiceOrder | null>(null);

  // --- BILL-02: issue invoice modal ---
  const [issueSo, setIssueSo] = useState<ServiceOrder | null>(null);
  const [issueDueDate, setIssueDueDate] = useState(addDays(7));

  // --- Payment modal ---
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>(0);
  const [payMethod, setPayMethod] = useState<'CHUYEN_KHOAN' | 'TIEN_MAT'>('CHUYEN_KHOAN');
  const [paymentError, setPaymentError] = useState('');
  // BILL-10: thời điểm thu tiền và số tham chiếu giao dịch được gửi lên backend (paidAt, referenceNo)
  const [payDate, setPayDate] = useState(vietnamDateTimeInput());
  const [payNotes, setPayNotes] = useState('');

  // --- Tariff management ---
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [tariffName, setTariffName] = useState('Biểu giá mới');
  const [tariffFrom, setTariffFrom] = useState(vietnamDateInput());
  const [tariffTo, setTariffTo] = useState('');
  const [showRuleModal, setShowRuleModal] = useState<{ tariffId: string } | null>(null);
  const [ruleForm, setRuleForm] = useState<Omit<TariffRule, 'id'>>({
    serviceType: '',
    serviceName: '',
    unit: '',
    unitPriceVnd: 200000,
  });

  // --- Computed totals ---
  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmountVnd, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmountVnd, 0);
  const totalDebt = totalInvoiced - totalPaid;

  // --- BILL-13: filtered lists ---
  const filteredInvoices =
    invoiceFilter === 'ALL' ? invoices : invoices.filter((i) => i.status === invoiceFilter);
  const filteredOrders =
    orderFilter === 'ALL' ? serviceOrders : serviceOrders.filter((o) => o.status === orderFilter);

  // --- BILL-03: container SearchableSelect options ---
  const containerOptions: PickerOption[] = containerVisits.map((c) => ({
    value: c.id,
    label: c.containerNumber,
    description: `${c.containerType} · ${c.consigneeName}`,
    keywords: `${c.consigneeName} ${c.mblNumber ?? ''} ${c.hblNumber ?? ''}`,
  }));

  // --- Handlers ---
  const handleCreateSo = async (e: React.FormEvent) => {
    e.preventDefault();
    const visit = containerVisits.find((c) => c.id === selectedVisitId);
    if (!visit || !can('billing.manage') || action.isPending()) return;
    if (!preview || previewError) return;
    const result = await action.run(() => createServiceOrder(visit.id));
    if (result?.success) setShowCreateSoModal(false);
  };

  // BILL-05: removed alert(); success via action.notice (CommandNotice shows after modal closes)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !can('billing.manage') || action.isPending()) return;
    if (!isValidPaymentAmount(payAmount)) {
      setPaymentError(PAYMENT_AMOUNT_ERROR);
      return;
    }
    const paidAt = payDate ? vietnamDateTimeToIso(payDate) : null;
    if (!paidAt) {
      setPaymentError('Nhập thời điểm thu tiền hợp lệ.');
      return;
    }
    if (new Date(paidAt).getTime() > Date.now() + 60_000) {
      setPaymentError('Thời điểm thu tiền không được ở tương lai.');
      return;
    }
    const inv = selectedInvoice;
    const result = await action.run(() =>
      recordPayment(inv.id, payAmount as number, payMethod, { paidAt, referenceNo: payNotes }),
    );
    if (result?.success) {
      setShowPayModal(false);
      setSelectedInvoice(null);
      setPayDate(vietnamDateTimeInput());
      setPayNotes('');
    } else if (result && !result.success) {
      setPaymentError(result.message);
    }
  };

  const closePaymentModal = () => {
    if (!action.isPending()) {
      setShowPayModal(false);
      setPaymentError('');
    }
  };

  const anyModalOpen =
    showCreateSoModal ||
    showPayModal ||
    showTariffModal ||
    !!showRuleModal ||
    !!cancelSo ||
    !!issueSo;

  return (
    <div className="space-y-6">
      {/* BILL-14: simplified header — removed English subtitle */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>Dịch vụ & Thanh toán</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tính toán biểu phí lưu bãi, tiếp nhận, rút ruột, kiểm định và xuất hóa đơn đối soát
          </p>
        </div>
        {can('billing.manage') && (
          <button
            onClick={() => { action.clear(); setShowCreateSoModal(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đơn dịch vụ</span>
          </button>
        )}
      </div>

      {!anyModalOpen && <CommandNotice notice={action.notice} />}

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Tổng phí đã xuất Hóa đơn</span>
          <ResourceContent resource="invoices" count={invoices.length}>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalInvoiced.toLocaleString()}₫</div>
            <div className="text-slate-400 mt-1">{invoices.length} hóa đơn phát hành</div>
          </ResourceContent>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Đã thu thực tế</span>
          <ResourceContent resource="invoices" count={invoices.length}>
            <div className="text-xl font-bold text-emerald-700 mt-1">{totalPaid.toLocaleString()}₫</div>
            <ResourceContent resource="payments" count={payments.length}>
              <div className="text-slate-400 mt-1">{payments.length} lượt giao dịch đã ghi nhận</div>
            </ResourceContent>
          </ResourceContent>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Công nợ chưa thu</span>
          <ResourceContent resource="invoices" count={invoices.length}>
            <div className="text-xl font-bold text-rose-700 mt-1">{totalDebt.toLocaleString()}₫</div>
            <div className="text-slate-400 mt-1">Ảnh hưởng trực tiếp đến điều kiện cấp Phiếu ra cổng</div>
          </ResourceContent>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 text-xs font-bold [&>button]:whitespace-nowrap">
        {(['INVOICES', 'ORDERS', 'TARIFFS'] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'INVOICES' && (
              <>Hóa đơn phát hành (<ConfirmedResourceValue resource="invoices">{invoices.length}</ConfirmedResourceValue>)</>
            )}
            {tab === 'ORDERS' && (
              <>Đơn dịch vụ (<ConfirmedResourceValue resource="serviceOrders">{serviceOrders.length}</ConfirmedResourceValue>)</>
            )}
            {tab === 'TARIFFS' && (
              <>Biểu phí dịch vụ (<ConfirmedResourceValue resource="tariffs">{tariffRules.length}</ConfirmedResourceValue>)</>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'INVOICES' && (
        <ResourceContent resource="invoices" count={invoices.length}>
          {/* BILL-13: filter chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setInvoiceFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  invoiceFilter === f
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                {f === 'ALL' ? 'Tất cả' : f === 'UNPAID' ? 'Chưa thanh toán' : f === 'PARTIALLY_PAID' ? 'Thanh toán một phần' : 'Đã thanh toán'}
              </button>
            ))}
          </div>

          <div
            role="region"
            aria-label="Bảng hóa đơn, cuộn ngang để xem các cột"
            tabIndex={0}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Số Hóa đơn</th>
                  <th className="py-3 px-4">Container</th>
                  <th className="py-3 px-4">Chủ hàng</th>
                  <th className="py-3 px-4">Ngày xuất</th>
                  <th className="py-3 px-4">Hạn TT</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4">Đã thanh toán</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const remaining = inv.totalAmountVnd - inv.paidAmountVnd;
                  // BILL-12: overdue indicator
                  const isOverdue =
                    (inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID') &&
                    new Date(inv.dueAt) < new Date();
                  const invPayments = payments.filter((p) => p.invoiceId === inv.id);
                  const isExpanded = expandedInvoiceIds.has(inv.id);
                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-slate-50">
                        {/* BILL-09: click invoice number to expand payment history */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleExpand(inv.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Thu gọn' : 'Xem lịch sử thanh toán'} hóa đơn ${inv.invoiceNo}`}
                            className="flex items-center gap-1 font-mono font-bold text-blue-700 hover:underline"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                              : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                            {inv.invoiceNo}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {inv.containerNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-800">{inv.consigneeName}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatVietnamDate(inv.issuedAt)}
                        </td>
                        {/* BILL-12: overdue due-date cell */}
                        <td className={`py-3 px-4 ${isOverdue ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                          {isOverdue && (
                            <AlertTriangle
                              aria-hidden="true"
                              className="inline w-3.5 h-3.5 mr-1"
                            />
                          )}
                          {formatVietnamDate(inv.dueAt)}
                          {isOverdue && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-caption font-bold">
                              Quá hạn
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inv.totalAmountVnd.toLocaleString()}₫
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {inv.paidAmountVnd.toLocaleString()}₫
                        </td>
                        {/* BILL-01: StatusBadge instead of raw code */}
                        <td className="py-3 px-4">
                          <StatusBadge domain="invoiceStatus" value={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {remaining > 0 && can('billing.manage') ? (
                            <button
                              disabled={action.isPending()}
                              onClick={() => {
                                action.clear();
                                setSelectedInvoice(inv);
                                setPayAmount(remaining);
                                setPayDate(vietnamDateTimeInput());
                                setPayNotes('');
                                setPaymentError('');
                                setShowPayModal(true);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                            >
                              Ghi nhận Thanh toán
                            </button>
                          ) : inv.status === 'PAID' ? (
                            // BILL-06: guide to gate-pass after full payment
                            <button
                              onClick={() => onNavigate('gate-pass', inv.containerVisitId)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs flex items-center gap-1 ml-auto"
                            >
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                              Tạo Phiếu ra cổng
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold">Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                      {/* BILL-09: expandable payment history */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={9}
                            className="bg-slate-50 px-6 py-3 border-t border-slate-100"
                          >
                            <div className="text-xs text-slate-700">
                              <div className="font-semibold text-slate-800 mb-2">
                                Lịch sử thanh toán
                              </div>
                              {invPayments.length === 0 ? (
                                <p className="text-slate-500 italic">Chưa có giao dịch nào.</p>
                              ) : (
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="pb-1 pr-4">Ngày thanh toán</th>
                                      <th className="pb-1 pr-4">Phương thức</th>
                                      <th className="pb-1 pr-4">Số tiền</th>
                                      <th className="pb-1">Nhân viên ghi nhận</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {invPayments.map((p) => (
                                      <tr key={p.id} className="border-t border-slate-200">
                                        <td className="py-1.5 pr-4">
                                          {new Date(p.paidAt).toLocaleString('vi-VN', {
                                            timeZone: 'Asia/Ho_Chi_Minh',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </td>
                                        <td className="py-1.5 pr-4">
                                          {PAY_METHOD_LABEL[p.method] ?? p.method}
                                        </td>
                                        <td className="py-1.5 pr-4 font-bold text-emerald-700">
                                          {p.amountVnd.toLocaleString()}₫
                                        </td>
                                        <td className="py-1.5 text-slate-600">{p.recordedBy}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ResourceContent>
      )}

      {/* TAB 2: SERVICE ORDERS */}
      {activeTab === 'ORDERS' && (
        <ResourceContent resource="serviceOrders" count={serviceOrders.length}>
          {/* BILL-13: filter chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(['ALL', 'DRAFT', 'CONFIRMED', 'INVOICED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  orderFilter === f
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                {f === 'ALL'
                  ? 'Tất cả'
                  : f === 'DRAFT'
                  ? 'Nháp'
                  : f === 'CONFIRMED'
                  ? 'Đã xác nhận'
                  : 'Đã lập hóa đơn'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredOrders.map((so) => (
              <div
                key={so.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {so.orderCode}
                    </span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-800 font-mono font-semibold rounded">
                      {so.containerNumber}
                    </span>
                    <span className="text-slate-600">{so.consigneeName}</span>
                    {/* BILL-01: StatusBadge instead of raw code */}
                    <StatusBadge domain="serviceOrderStatus" value={so.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-sm text-slate-900">
                      Tổng:{' '}
                      <span className="text-blue-600">{so.totalAmountVnd.toLocaleString()}₫</span>
                    </div>
                    {so.status === 'DRAFT' && can('billing.manage') && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={action.pending}
                          onClick={() => void action.run(() => confirmServiceOrder(so.id))}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold"
                        >
                          Xác nhận
                        </button>
                        {/* BILL-04: cancel uses ConfirmDialog instead of window.prompt/confirm */}
                        <button
                          disabled={action.pending}
                          onClick={() => { action.clear(); setCancelSo(so); }}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                    {/* BILL-02: issue invoice uses modal instead of window.prompt */}
                    {so.status === 'CONFIRMED' && can('billing.manage') && (
                      <button
                        disabled={action.pending}
                        onClick={() => {
                          action.clear();
                          setIssueSo(so);
                          setIssueDueDate(addDays(7));
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold"
                      >
                        Phát hành Hóa đơn
                      </button>
                    )}
                  </div>
                </div>

                <div
                  role="region"
                  aria-label="Chi tiết dịch vụ, cuộn ngang để xem các cột"
                  tabIndex={0}
                  className="overflow-x-auto"
                >
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
                          <td className="py-2 font-medium">{item.serviceName}</td>
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2">{item.unit}</td>
                          <td className="py-2">{item.unitPriceVnd.toLocaleString()}₫</td>
                          <td className="py-2 font-bold text-right">
                            {item.amountVnd.toLocaleString()}₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </ResourceContent>
      )}

      {/* TAB 3: TARIFFS */}
      {activeTab === 'TARIFFS' && (
        <ResourceContent resource="tariffs" count={tariffs.length}>
          <div className="space-y-4">
            <div className="flex justify-end">
              {can('tariff.manage') && (
                <button
                  onClick={() => { action.clear(); setShowTariffModal(true); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tạo Bảng giá mới
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tariffs.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-slate-800">{t.name}</div>
                      <div className="text-slate-500">
                        Hiệu lực: {t.effectiveFrom}{' '}
                        {t.effectiveTo ? `→ ${t.effectiveTo}` : ''}
                      </div>
                    </div>
                    {/* BILL-01: StatusBadge instead of raw code */}
                    <StatusBadge domain="tariffStatus" value={t.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {can('tariff.manage') && (
                      <button
                        onClick={() => setShowRuleModal({ tariffId: t.id })}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold"
                      >
                        + Quy tắc giá
                      </button>
                    )}
                    {t.status === 'DRAFT' && can('tariff.manage') && (
                      <button
                        disabled={action.pending}
                        onClick={() => void action.run(() => activateTariff(t.id))}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-bold border border-emerald-200"
                      >
                        Kích hoạt
                      </button>
                    )}
                    {t.status === 'ACTIVE' && can('tariff.manage') && (
                      <button
                        disabled={action.pending}
                        onClick={() => {
                          if (window.confirm(`Ngừng sử dụng bảng giá ${t.name}?`))
                            void action.run(() => retireTariff(t.id));
                        }}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200"
                      >
                        Ngừng sử dụng
                      </button>
                    )}
                    <span className="text-slate-400 ml-auto">{t.ruleIds.length} quy tắc</span>
                  </div>
                </div>
              ))}
            </div>

            {/* BILL-11: tariff rules table with parent-tariff column */}
            <div
              role="region"
              aria-label="Bảng biểu phí, cuộn ngang để xem các cột"
              tabIndex={0}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Bảng giá</th>
                    <th className="py-3 px-4">Mã dịch vụ</th>
                    <th className="py-3 px-4">Tên dịch vụ</th>
                    <th className="py-3 px-4">Áp dụng Container</th>
                    <th className="py-3 px-4">Đơn vị tính</th>
                    <th className="py-3 px-4">Đơn giá quy định</th>
                    <th className="py-3 px-4">Ngày miễn phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tariffRules.map((tr) => {
                    const parentTariff = tariffs.find((t) => t.ruleIds.includes(tr.id));
                    return (
                      <tr key={tr.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          {parentTariff ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-slate-800">{parentTariff.name}</span>
                              <StatusBadge domain="tariffStatus" value={parentTariff.status} />
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {tr.serviceType}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{tr.serviceName}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">
                          {tr.containerType || 'Mọi loại'} ·{' '}
                          {tr.containerSize || 'Mọi kích thước'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{tr.unit}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {tr.unitPriceVnd.toLocaleString()}₫
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {tr.freeDays ? `${tr.freeDays} ngày` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ResourceContent>
      )}

      {/* Create Tariff Modal */}
      {showTariffModal && (
        <ModalOverlay
          aria-labelledby="billing-dialog-1-title"
          pending={action.pending}
          onClose={() => { if (!action.isPending()) setShowTariffModal(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-1-title" className="text-base font-bold text-slate-900 mb-4">
              Tạo Bảng giá mới
            </h3>
            <CommandNotice notice={action.notice} />
            <div className="space-y-3">
              <div>
                <label htmlFor="billing-tariff-name" className="block font-semibold text-slate-700 mb-1">
                  Tên bảng giá*
                </label>
                <input
                  id="billing-tariff-name"
                  value={tariffName}
                  onChange={(e) => setTariffName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="billing-tariff-from" className="block font-semibold text-slate-700 mb-1">
                    Hiệu lực từ*
                  </label>
                  <input
                    id="billing-tariff-from"
                    type="date"
                    value={tariffFrom}
                    onChange={(e) => setTariffFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="billing-tariff-to" className="block font-semibold text-slate-700 mb-1">
                    Hiệu lực đến
                  </label>
                  <input
                    id="billing-tariff-to"
                    type="date"
                    value={tariffTo}
                    onChange={(e) => setTariffTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
              <button
                disabled={action.pending}
                onClick={() => setShowTariffModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                disabled={action.pending}
                onClick={async () => {
                  const result = await action.run(() =>
                    createTariff(tariffName, tariffFrom, tariffTo || undefined),
                  );
                  if (result?.success) setShowTariffModal(false);
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
        <ModalOverlay
          aria-labelledby="billing-dialog-2-title"
          pending={action.pending}
          onClose={() => { if (!action.isPending()) setShowRuleModal(null); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-2-title" className="text-base font-bold text-slate-900 mb-4">
              Thêm Quy tắc giá
            </h3>
            <CommandNotice notice={action.notice} />
            <div className="space-y-3">
              <div>
                <label htmlFor="billing-rule-form-service-type" className="block font-semibold text-slate-700 mb-1">
                  Mã loại dịch vụ*
                </label>
                <select
                  id="billing-rule-form-service-type"
                  value={ruleForm.serviceType}
                  required
                  onChange={(e) => {
                    const service = serviceTypes.find((row) => row.code === e.target.value);
                    setRuleForm({
                      ...ruleForm,
                      serviceType: service?.code ?? '',
                      serviceName: service?.name ?? '',
                      unit: service?.unit ?? '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Chọn loại dịch vụ</option>
                  {serviceTypes.map((service) => (
                    <option key={service.id} value={service.code}>
                      {service.code} — {service.name} ({service.unit})
                    </option>
                  ))}
                </select>
                <CollectionState resource="serviceTypes" count={serviceTypes.length} />
              </div>
              <p className="text-slate-500">
                Tên dịch vụ và đơn vị tính lấy từ danh mục. Quy tắc này áp dụng mọi kích thước và
                loại container.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="billing-rule-form-unit-price-vnd" className="block font-semibold text-slate-700 mb-1">
                    Đơn giá (VNĐ)
                  </label>
                  <input
                    id="billing-rule-form-unit-price-vnd"
                    type="number"
                    value={ruleForm.unitPriceVnd}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, unitPriceVnd: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-200">
              <button
                disabled={action.pending}
                onClick={() => setShowRuleModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                disabled={
                  action.pending ||
                  !serviceTypes.some((service) => service.code === ruleForm.serviceType) ||
                  (resourceStatus.serviceTypes !== undefined && resourceStatus.serviceTypes !== 'ready')
                }
                onClick={async () => {
                  if (
                    !can('tariff.manage') ||
                    !serviceTypes.some((service) => service.code === ruleForm.serviceType)
                  )
                    return;
                  const result = await action.run(() =>
                    addTariffRule(showRuleModal.tariffId, ruleForm),
                  );
                  if (result?.success) setShowRuleModal(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create SO Modal — BILL-03: SearchableSelect replaces plain <select> */}
      {showCreateSoModal && (
        <ModalOverlay
          aria-labelledby="billing-dialog-3-title"
          pending={action.pending}
          onClose={() => { if (!action.isPending()) setShowCreateSoModal(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-3-title" className="text-base font-bold text-slate-900 mb-4">
              Tạo Đơn dịch vụ mới
            </h3>
            <CommandNotice notice={action.notice} />
            <form onSubmit={handleCreateSo} className="space-y-4">
              <SearchableSelect
                id="billing-selected-visit-id"
                label="Chọn Container"
                options={containerOptions}
                value={selectedVisitId}
                onChange={setSelectedVisitId}
                placeholder="Gõ số container hoặc tên chủ hàng…"
                required
                disabled={action.pending || Boolean(targetVisitId)}
                emptyText="Không tìm thấy container phù hợp."
              />

              {/* BILL-08: removed "backend" from text */}
              <p className="text-slate-500">
                Phí được tính tự động theo tác nghiệp thực tế và biểu giá đang hiệu lực.
              </p>
              {previewError ? (
                <p role="alert" className="text-rose-700">
                  {previewError}
                </p>
              ) : preview ? (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                  {preview.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {item.serviceName} · {item.quantity} {item.unit}
                      </span>
                      <strong>{item.amountVnd.toLocaleString()} ₫</strong>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-bold">
                    Tổng dự kiến: {preview.totalAmountVnd.toLocaleString()} ₫
                  </div>
                </div>
              ) : (
                // BILL-08: "backend" removed
                <p role="status">Đang tải thông tin chi tiết dịch vụ…</p>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowCreateSoModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    action.pending || !preview || !!previewError || preview.items.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Tạo đơn dịch vụ nháp
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* BILL-04: Cancel SO — ConfirmDialog with required reason, context summary */}
      {cancelSo && (
        <ConfirmDialog
          title="Hủy đơn dịch vụ"
          message="Đơn dịch vụ sẽ bị hủy vĩnh viễn. Thao tác này không thể hoàn tác."
          summary={[
            { label: 'Mã đơn', value: cancelSo.orderCode },
            { label: 'Container', value: cancelSo.containerNumber },
            { label: 'Chủ hàng', value: cancelSo.consigneeName },
            {
              label: 'Tổng tiền',
              value: `${cancelSo.totalAmountVnd.toLocaleString()}₫`,
            },
          ]}
          reason={{
            label: 'Lý do hủy',
            placeholder: 'Nhập lý do hủy đơn dịch vụ…',
          }}
          confirmLabel="Xác nhận Hủy đơn"
          cancelLabel="Giữ lại"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onConfirm={async (reason) => {
            const result = await action.run(() =>
              cancelServiceOrder(cancelSo.id, reason),
            );
            if (result?.success) setCancelSo(null);
          }}
          onClose={() => setCancelSo(null)}
        />
      )}

      {/* BILL-02: Issue Invoice — ConfirmDialog with date picker and context summary */}
      {issueSo && (
        <ConfirmDialog
          title="Phát hành Hóa đơn"
          message="Hóa đơn sẽ được phát hành cho chủ hàng. Vui lòng kiểm tra kỹ trước khi xác nhận."
          summary={[
            { label: 'Đơn dịch vụ', value: issueSo.orderCode },
            { label: 'Container', value: issueSo.containerNumber },
            { label: 'Chủ hàng', value: issueSo.consigneeName },
            {
              label: 'Tổng tiền',
              value: `${issueSo.totalAmountVnd.toLocaleString()}₫`,
            },
          ]}
          confirmLabel="Phát hành Hóa đơn"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onConfirm={async () => {
            if (!issueDueDate) return;
            const result = await action.run(() => issueInvoice(issueSo.id, issueDueDate));
            if (result?.success) setIssueSo(null);
          }}
          onClose={() => setIssueSo(null)}
        >
          <div>
            <label
              htmlFor="billing-issue-due-date"
              className="block font-semibold text-slate-700 mb-1"
            >
              Hạn thanh toán*
            </label>
            <input
              id="billing-issue-due-date"
              type="date"
              value={issueDueDate}
              min={vietnamDateInput()}
              required
              disabled={action.pending}
              onChange={(e) => setIssueDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </ConfirmDialog>
      )}

      {/* Record Payment Modal — BILL-05: no alert, BILL-07: step=1, BILL-09: history, BILL-10: date+notes */}
      {showPayModal && selectedInvoice && (
        <ModalOverlay
          aria-labelledby="billing-dialog-4-title"
          onClose={closePaymentModal}
          pending={action.isPending()}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="billing-dialog-4-title" className="text-base font-bold text-slate-900 mb-3">
              Ghi nhận Thanh toán Hóa đơn
            </h3>

            {/* Invoice context summary */}
            <dl className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200 mb-4">
              <div className="flex items-start justify-between gap-4 px-3 py-2">
                <dt className="text-slate-600">Hóa đơn</dt>
                <dd className="font-semibold text-slate-900">{selectedInvoice.invoiceNo}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-3 py-2">
                <dt className="text-slate-600">Container</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {selectedInvoice.containerNumber}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-3 py-2">
                <dt className="text-slate-600">Chủ hàng</dt>
                <dd className="font-semibold text-slate-900">{selectedInvoice.consigneeName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-3 py-2">
                <dt className="text-slate-600">Còn phải thu</dt>
                <dd className="font-bold text-rose-700">
                  {(
                    selectedInvoice.totalAmountVnd - selectedInvoice.paidAmountVnd
                  ).toLocaleString()}
                  ₫
                </dd>
              </div>
            </dl>

            {/* BILL-09: payment history inside modal */}
            {payments.filter((p) => p.invoiceId === selectedInvoice.id).length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-slate-700 mb-2">Lịch sử thanh toán trước</div>
                {payments
                  .filter((p) => p.invoiceId === selectedInvoice.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between py-1 border-b border-slate-100 last:border-0 text-slate-600"
                    >
                      <span>
                        {new Date(p.paidAt).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </span>
                      <span>{PAY_METHOD_LABEL[p.method] ?? p.method}</span>
                      <span className="font-semibold text-emerald-700">
                        {p.amountVnd.toLocaleString()}₫
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <form onSubmit={handleRecordPayment} aria-busy={action.isPending()} className="space-y-4">
              {/* BILL-07: step=1 for VND whole numbers, with live preview */}
              <div>
                <label htmlFor="billing-pay-amount" className="block font-semibold text-slate-700 mb-1">
                  Số tiền thanh toán (VNĐ)*
                </label>
                <input
                  id="billing-pay-amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={payAmount}
                  disabled={action.isPending()}
                  aria-invalid={Boolean(paymentError) && !isValidPaymentAmount(payAmount)}
                  aria-describedby={paymentError ? 'billing-payment-error' : undefined}
                  onChange={(e) => {
                    setPaymentError('');
                    setPayAmount(e.target.value === '' ? '' : Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-emerald-700"
                />
                {typeof payAmount === 'number' && payAmount > 0 && (
                  <p className="mt-1 text-caption text-emerald-700">
                    → {payAmount.toLocaleString('vi-VN')} ₫
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="billing-pay-method" className="block font-semibold text-slate-700 mb-1">
                  Phương thức thanh toán*
                </label>
                <select
                  id="billing-pay-method"
                  value={payMethod}
                  disabled={action.isPending()}
                  onChange={(e) =>
                    setPayMethod(e.target.value as 'CHUYEN_KHOAN' | 'TIEN_MAT')
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="CHUYEN_KHOAN">Chuyển khoản Ngân hàng</option>
                  <option value="TIEN_MAT">Tiền mặt tại Quầy Thủ quỹ</option>
                </select>
              </div>

              <div>
                <label htmlFor="billing-pay-date" className="block font-semibold text-slate-700 mb-1">
                  Thời điểm thu tiền*
                </label>
                <input
                  id="billing-pay-date"
                  type="datetime-local"
                  required
                  max={vietnamDateTimeInput()}
                  value={payDate}
                  disabled={action.isPending()}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="billing-pay-notes" className="block font-semibold text-slate-700 mb-1">
                  Số tham chiếu giao dịch / số biên lai
                </label>
                <input
                  id="billing-pay-notes"
                  type="text"
                  maxLength={100}
                  value={payNotes}
                  disabled={action.isPending()}
                  onChange={(e) => setPayNotes(e.target.value)}
                  aria-describedby="billing-pay-notes-hint"
                  placeholder={payMethod === 'CHUYEN_KHOAN' ? 'VD: mã giao dịch ngân hàng' : 'VD: số phiếu thu'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <p id="billing-pay-notes-hint" className="mt-1 text-caption text-slate-600">
                  Mỗi số tham chiếu chỉ dùng một lần. Để trống, hệ thống sẽ tự sinh mã.
                </p>
              </div>

              {paymentError && (
                <p id="billing-payment-error" role="alert" className="text-rose-700">
                  {paymentError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.isPending()}
                  onClick={closePaymentModal}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.isPending()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait"
                >
                  {action.isPending() ? 'Đang ghi nhận...' : 'Xác nhận Thu tiền'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
