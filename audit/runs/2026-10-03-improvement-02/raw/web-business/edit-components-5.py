from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[5]
def edit(name, changes):
    file = ROOT / 'apps/web/src/components' / name
    text = file.read_text(encoding='utf-8')
    for old, new in changes:
        if old not in text: raise RuntimeError(f'{name}: missing {old[:90]}')
        text = text.replace(old, new)
    file.write_text(text, encoding='utf-8')
edit('BillingView.tsx',[
 ('import { ServiceOrder, Invoice, Payment, TariffRule }', 'import { ServiceOrderItem, Invoice, TariffRule }'),
 ('interface BillingViewProps', "import { useCommandAction, CommandNotice } from './useCommandAction';\nimport { vietnamDateInput } from '../lib/time';\n\ninterface BillingViewProps"),
 ('= ({ onNavigate, targetVisitId })', '= ({ targetVisitId })'),
 ('    containerVisits,', '    currentUser, containerVisits,'),
 ('  const [activeTab', "  const action = useCommandAction();\n  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;\n  const [activeTab"),
 ('items:any[]', 'items:ServiceOrderItem[]'),
 ('new Date().toISOString().slice(0, 10)', 'vietnamDateInput()'),
 ("useState({ serviceType: 'STORAGE'", "useState<Omit<TariffRule, 'id'>>({ serviceType: 'STORAGE'"),
 ('    if (!visit) return;', '    if (!visit || !can("billing.manage") || action.isPending()) return;'),
 ('const result = await createServiceOrder(visit.id);\n    alert(result.message);\n    if (result.success)', 'const result = await action.run(() => createServiceOrder(visit.id));\n    if (result?.success)'),
 ('if (!selectedInvoice || paymentPending.current)', 'if (!selectedInvoice || !can("billing.manage") || paymentPending.current)'),
 ('        <button\n          onClick={() => setShowCreateSoModal(true)}', '        {can("billing.manage") && <button\n          onClick={() => { action.clear(); setShowCreateSoModal(true); }}'),
 ('<span>Tạo Đơn dịch vụ (Service Order)</span>\n        </button>', '<span>Tạo Đơn dịch vụ (Service Order)</span>\n        </button>}'),
 ('      {/* Financial Overview Cards */}', '      <CommandNotice notice={action.notice} />\n      {/* Financial Overview Cards */}'),
 ("onClick={() => setActiveTab('INVOICES')}", "aria-pressed={activeTab === 'INVOICES'} onClick={() => setActiveTab('INVOICES')}"),
 ("onClick={() => setActiveTab('ORDERS')}", "aria-pressed={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')}"),
 ("onClick={() => setActiveTab('TARIFFS')}", "aria-pressed={activeTab === 'TARIFFS'} onClick={() => setActiveTab('TARIFFS')}"),
 ('{remaining > 0 ? (', '{remaining > 0 && can("billing.manage") ? ('),
 ('<CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã trả đủ', '<CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {remaining > 0 ? "Chỉ xem" : "Đã trả đủ"}'),
 ("{so.status === 'DRAFT' &&", "{so.status === 'DRAFT' && can('billing.manage') &&"),
 ("{so.status === 'CONFIRMED' &&", "{so.status === 'CONFIRMED' && can('billing.manage') &&"),
 ('onClick={async () => alert((await confirmServiceOrder(so.id)).message)}', 'disabled={action.pending} onClick={() => void action.run(() => confirmServiceOrder(so.id))}'),
 ('if (reason) alert((await cancelServiceOrder(so.id, reason)).message);', 'if (reason && window.confirm(`Hủy đơn dịch vụ ${so.orderCode}?`)) await action.run(() => cancelServiceOrder(so.id, reason));'),
 ('const res = await issueInvoice(so.id, due);\n                          alert(res.message);', 'await action.run(() => issueInvoice(so.id, due));'),
 ('            <button\n              onClick={() => setShowTariffModal(true)}', '            {can("tariff.manage") && <button\n              onClick={() => { action.clear(); setShowTariffModal(true); }}'),
 ('<Plus className="w-4 h-4" /> Tạo Bảng giá (Tariff)\n            </button>', '<Plus className="w-4 h-4" /> Tạo Bảng giá (Tariff)\n            </button>}'),
 ('                  <button onClick={() => setShowRuleModal', '                  {can("tariff.manage") && <button onClick={() => setShowRuleModal'),
 ('+ Quy tắc giá\n                  </button>', '+ Quy tắc giá\n                  </button>}'),
 ("{t.status === 'DRAFT' &&", "{t.status === 'DRAFT' && can('tariff.manage') &&"),
 ("{t.status === 'ACTIVE' &&", "{t.status === 'ACTIVE' && can('tariff.manage') &&"),
 ('onClick={async () => alert((await activateTariff(t.id)).message)}', 'disabled={action.pending} onClick={() => void action.run(() => activateTariff(t.id))}'),
 ('onClick={async () => alert((await retireTariff(t.id)).message)}', 'disabled={action.pending} onClick={() => { if (window.confirm(`Ngừng sử dụng bảng giá ${t.name}?`)) void action.run(() => retireTariff(t.id)); }}'),
 ('const result = await createTariff(tariffName, tariffFrom, tariffTo || undefined);\n                  alert(result.message);\n                  if (result.success)', 'const result = await action.run(() => createTariff(tariffName, tariffFrom, tariffTo || undefined));\n                  if (result?.success)'),
 ('const result = await addTariffRule(showRuleModal.tariffId, { ...ruleForm, serviceType: ruleForm.serviceType as any, unit: ruleForm.unit as any, containerType: ruleForm.containerType as any });\n                  alert(result.message);\n                  if (result.success)', 'const result = await action.run(() => addTariffRule(showRuleModal.tariffId, ruleForm));\n                  if (result?.success)'),
 ('serviceType: e.target.value })', "serviceType: e.target.value as TariffRule['serviceType'] })"),
 ('onClose={() => setShowTariffModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowTariffModal(false); }}'),
 ('onClose={() => setShowRuleModal(null)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowRuleModal(null); }}'),
 ('onClose={() => setShowCreateSoModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowCreateSoModal(false); }}'),
 ('disabled={!preview || !!previewError || preview.items.length === 0}', 'disabled={action.pending || !preview || !!previewError || preview.items.length === 0}'),
])
file=ROOT/'apps/web/src/components/BillingView.tsx';text=file.read_text(encoding='utf-8')
text=re.sub(r'(<button\s+)(onClick=\{async)',r'\1disabled={action.pending} \2',text)
text=text.replace('<button onClick={() => setShowTariffModal(false)}','<button disabled={action.pending} onClick={() => setShowTariffModal(false)}').replace('<button onClick={() => setShowRuleModal(null)}','<button disabled={action.pending} onClick={() => setShowRuleModal(null)}')
text=text.replace('onClick={() => setShowCreateSoModal(false)}','disabled={action.pending} onClick={() => setShowCreateSoModal(false)}')
for heading in ['Thêm Quy tắc giá','Tạo Bảng giá (Tariff)','Tạo Đơn dịch vụ (Service Order) mới']:
    # Feedback remains within each modal when a rejected save leaves it open.
    match=re.search(r'(<h3[^>]*>'+re.escape(heading)+r'</h3>)',text)
    if match: text=text[:match.end()]+'<CommandNotice notice={action.notice} />'+text[match.end():]
file.write_text(text,encoding='utf-8')
edit('ContainersView.tsx',[
 ('  const action = useCommandAction();', '  const action = useCommandAction();\n  const validation = useFormValidation();'),
 ('onClick={async () => alert((await createMovementOrder(activeVisit.id)).message)}', 'disabled={action.pending} onClick={() => void action.run(() => createMovementOrder(activeVisit.id))}'),
 ('const res = await cancelContainerVisit(activeVisit.id, reason);\n                              alert(res.message);', 'const res = await action.run(() => cancelContainerVisit(activeVisit.id, reason));'),
 ('if (res.success)', 'if (res?.success)'),
 ('const result = await createOperationalHold(activeVisit.id, newHoldType, newHoldReason.trim());\n                            alert(result.message);\n                            if (!result.success)', 'const result = await action.run(() => createOperationalHold(activeVisit.id, newHoldType, newHoldReason.trim()));\n                            if (!result?.success)'),
 ('if (note) alert((await releaseOperationalHold(h.id, note)).message);', 'if (note && window.confirm(`Giải phóng lệnh giữ ${h.holdType} cho ${activeVisit.containerNumber}?`)) await action.run(() => releaseOperationalHold(h.id, note));'),
 ('const res = await createContainerVisit(cvForm);\n                  alert(res.message);', 'const res = await action.run(() => createContainerVisit(cvForm));'),
 ('<QRCode value={activeVisitGatePass.qrToken} size={160} data-testid="container-gate-pass-qr" />', '{activeVisitGatePass.qrToken ? <QRCode value={activeVisitGatePass.qrToken} size={160} data-testid="container-gate-pass-qr" /> : <p>Backend chưa cung cấp mã QR cho phiếu này.</p>}'),
])
file=ROOT/'apps/web/src/components/ContainersView.tsx';text=file.read_text(encoding='utf-8')
text=re.sub(r'(<button\s+)(onClick=\{async)',r'\1disabled={action.pending} \2',text)
text=re.sub(r'(<button\s+type="button"\s+)(onClick=\{async)',r'\1disabled={action.pending} \2',text)
text=text.replace('<ModalOverlay aria-labelledby=', '<ModalOverlay pending={action.pending} aria-labelledby=')
# Give every collection a settled-state explanation before its table.
text=text.replace('      {/* Main Table */}', '      <CollectionState resource="containerVisits" count={filteredVisits.length} total={containerVisits.length} filtered={!!searchTerm || stateFilter !== "ALL" || hasBlockerOnly} onClear={() => { setSearchTerm(\'\'); setStateFilter("ALL"); setHasBlockerOnly(false); }} />\n      {/* Main Table */}')
text=text.replace('  const validation = useFormValidation();\n','') # Validation added only when converting the create flow below.
file.write_text(text,encoding='utf-8')
for name in ['MasterDataView.tsx','UsersRolesView.tsx']:
    file=ROOT/'apps/web/src/components'/name;text=file.read_text(encoding='utf-8');text=text.replace('<ModalOverlay aria-labelledby=', '<ModalOverlay pending={action.pending} aria-labelledby=');file.write_text(text,encoding='utf-8')
