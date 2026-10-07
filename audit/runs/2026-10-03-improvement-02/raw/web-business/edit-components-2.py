from pathlib import Path
ROOT = Path(__file__).resolve().parents[5]
def edit(name, changes):
    file = ROOT / 'apps/web/src/components' / name
    text = file.read_text(encoding='utf-8')
    for old, new in changes:
        if old not in text: raise RuntimeError(f'{name}: missing {old[:90]}')
        text = text.replace(old, new)
    file.write_text(text, encoding='utf-8')
imports = "import { useCommandAction, CommandNotice } from './useCommandAction';\nimport { useFormValidation, FormErrors } from './useFormValidation';\nimport { CollectionState } from './CollectionState';\n"
edit('TruckVisitsView.tsx',[
 ("import React, { useState }", "import React, { useEffect, useState }"),
 ('interface TruckVisitsViewProps {', imports+'\ninterface TruckVisitsViewProps {\n  targetVisitId?: string;'),
 ('= ({ onNavigate }) => {','= ({ onNavigate, targetVisitId }) => {'),
 ('const { truckVisits,', 'const { currentUser, truckVisits,'),
 ("  const [searchTerm", "  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;\n  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [searchTerm"),
 ('  const filteredVisits =', "  useEffect(() => {\n    if (!targetVisitId || !can('truck_visit.create')) return;\n    const visit = containerVisits.find(v => v.id === targetVisitId);\n    if (visit) { setSelectedConts(visit.containerNumber); setType('GATE_IN'); setShowCreateModal(true); }\n  }, [targetVisitId, containerVisits]);\n\n  const filteredVisits ="),
 ('async (e: React.FormEvent) => {\n    e.preventDefault();\n    const result = await createTruckVisit({', 'async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (!can("truck_visit.create") || action.isPending() || !validation.validate(e.currentTarget)) return;\n    const result = await action.run(() => createTruckVisit({'),
 ("      gateLane: undefined,\n    });\n    alert(result.message);\n    if (result.success) setShowCreateModal(false);", "      gateLane: undefined,\n    }));\n    if (result?.success) setShowCreateModal(false);"),
 ('        <button\n          onClick={() => setShowCreateModal(true)}', '        {can("truck_visit.create") && <button\n          onClick={() => { action.clear(); setShowCreateModal(true); }}'),
 ('<span>Tạo Chuyến xe mới</span>\n        </button>', '<span>Tạo Chuyến xe mới</span>\n        </button>}'),
 ('      {/* Visits List */}', '      {!showCreateModal && <CommandNotice notice={action.notice} />}\n      <CollectionState resource="truckVisits" count={filteredVisits.length} total={truckVisits.length} filtered={!!searchTerm} onClear={() => setSearchTerm(\'\')} />\n      {/* Visits List */}'),
 ("tv.status === 'SCHEDULED' &&", "tv.status === 'SCHEDULED' && can('truck_visit.arrive') &&"),
 ("onClick={() => updateTruckVisitStatus(tv.id, 'ARRIVED')}", "disabled={action.pending} onClick={() => void action.run(() => updateTruckVisitStatus(tv.id, 'ARRIVED'))}"),
 ("onClick={() => onNavigate('gate-in')}", "onClick={() => { const linkedVisit = containerVisits.find(v => tv.containerNumbers.includes(v.containerNumber)); if (linkedVisit) onNavigate('gate-in', linkedVisit.id); }}"),
 ('onClose={() => setShowCreateModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowCreateModal(false); }}'),
 ('<form onSubmit={handleCreate} className="space-y-3">', '<form noValidate onSubmit={handleCreate} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">'),
 ("onClick={() => setType('GATE_IN')}", "aria-pressed={type === 'GATE_IN'} onClick={() => setType('GATE_IN')}"),
 ("onClick={() => setType('GATE_OUT')}", "aria-pressed={type === 'GATE_OUT'} onClick={() => setType('GATE_OUT')}"),
 ('<input id="truck-visits-', '<input {...validation.props("truck-visits-PLACEHOLDER")} id="truck-visits-'),
 ('              <div className="flex justify-end space-x-2 pt-3', '              </fieldset><div className="flex justify-end space-x-2 pt-3'),
 ('onClick={() => setShowCreateModal(false)}', 'disabled={action.pending} onClick={() => setShowCreateModal(false)}'),
 ('                  type="submit"', '                  type="submit" disabled={action.pending}'),
 ('                  Lưu Chuyến Xe', "                  {action.pending ? 'Đang lưu…' : 'Lưu Chuyến Xe'}"),
])
# Set each field's error association from its stable id.
file = ROOT/'apps/web/src/components/TruckVisitsView.tsx'
text=file.read_text(encoding='utf-8')
import re
text=re.sub(r'\{\.\.\.validation\.props\("truck-visits-PLACEHOLDER"\)\} id="([^"]+)"',lambda m:'{...validation.props("'+m[1]+'")} id="'+m[1]+'"',text)
file.write_text(text,encoding='utf-8')

edit('GatePassView.tsx',[
 ('interface GatePassViewProps {', imports+"import { effectiveGatePassStatus, gatePassStatusMessage } from '../lib/gate-pass';\nimport { ReadinessNotice } from './ReadinessNotice';\n\ninterface GatePassViewProps {\n  targetGatePassId?: string;"),
 ('= ({ onNavigate, targetVisitId })', '= ({ onNavigate, targetVisitId, targetGatePassId })'),
 ('    gatePasses,', '    currentUser, gatePasses,'),
 ("  const [searchTerm", "  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;\n  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [searchTerm"),
 ('gatePasses[0]?.id || null);', 'targetGatePassId || gatePasses[0]?.id || null);'),
 ('  const [showIssueModal', "  const selectedStatus = selectedGatePass ? effectiveGatePassStatus(selectedGatePass) : null;\n  const [showIssueModal"),
 ('const { readiness, readinessError, isCheckingReadiness } = useBackendReadiness(showIssueModal ? issueVisitId : null);', 'const evaluation = useBackendReadiness(showIssueModal ? issueVisitId : null);\n  const { readiness, isCheckingReadiness } = evaluation;'),
 ('    if (targetVisitId) {', '    if (targetVisitId && can("gate_pass.create")) {'),
 ('  const filteredPasses =', '  useEffect(() => { if (targetGatePassId) setSelectedGatePassId(targetGatePassId); }, [targetGatePassId]);\n\n  const filteredPasses ='),
 ('async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!issueVisitId) return;\n\n    const res = await createGatePass({','async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (!can("gate_pass.create") || action.isPending() || !validation.validate(e.currentTarget) || evaluation.status !== "ready") return;\n\n    const res = await action.run(() => createGatePass({'),
 ('      receiverIdNumber: receiverCccd,\n    });\n\n    alert(res.message);\n    if (res.success && res.gatePass)', '      receiverIdNumber: receiverCccd,\n    }));\n\n    if (res?.success && res.gatePass)'),
 ('const res = await scanAndGateOut(pass.code);\n    alert(res.message);\n    if (res.success)', 'if (!can("gate_pass.use") || effectiveGatePassStatus(pass) !== "ACTIVE") return;\n    const res = await action.run(() => scanAndGateOut(pass.qrToken || pass.code));\n    if (res?.success)'),
 ('        <button\n          onClick={() => setShowIssueModal(true)}', '        {can("gate_pass.create") && <button\n          onClick={() => { action.clear(); setShowIssueModal(true); }}'),
 ('<span>Cấp Phiếu ra cổng mới</span>\n        </button>', '<span>Cấp Phiếu ra cổng mới</span>\n        </button>}'),
 ('      {/* Main Grid:', '      {!showIssueModal && <CommandNotice notice={action.notice} />}\n      {/* Main Grid:'),
 ('            {filteredPasses.map', '<CollectionState resource="gatePasses" count={filteredPasses.length} total={gatePasses.length} filtered={!!searchTerm} onClear={() => setSearchTerm(\'\')} />\n            {filteredPasses.map'),
 ('const isExpired = new Date(gp.expiresAt).getTime() < Date.now();', 'const effectiveStatus = effectiveGatePassStatus(gp);'),
 ("gp.status === 'ACTIVE' && !isExpired", "effectiveStatus === 'ACTIVE'"),
 ("{isExpired && gp.status === 'ACTIVE' ? 'EXPIRED' : gp.status}", '{effectiveStatus}'),
 ("selectedGatePass.status === 'ACTIVE'", "selectedStatus === 'ACTIVE'"),
 ("{selectedGatePass.status}", '{selectedStatus}'),
 ('{selectedGatePass.qrToken ? <QRCode', "{selectedStatus === 'ACTIVE' && selectedGatePass.qrToken ? <QRCode"),
 ('value={selectedGatePass.qrToken} size={160}', 'value={selectedGatePass.qrToken} size={160} data-testid="gate-pass-qr"'),
 ('{selectedGatePass.qrToken}</div>', "{selectedStatus === 'ACTIVE' ? selectedGatePass.qrToken : ''}</div>"),
 ('                  Trình mã này tại cổng Outbound để nhân viên đối soát biển số xe và mở barie.', '                  {selectedStatus && gatePassStatusMessage(selectedStatus)}'),
 ("{selectedStatus === 'ACTIVE'\n                    ? 'Nhân viên bảo vệ kiểm tra xong biển số và số chì có thể xác nhận cho xe ra.'\n                    : 'Phiếu này đã được sử dụng để xuất cổng.'}", '{selectedStatus && gatePassStatusMessage(selectedStatus)}'),
 ('                    <button\n                      onClick={async () => {\n                        const reason', '                    {can("gate_pass.create") && <button disabled={action.pending}\n                      onClick={async () => {\n                        const reason'),
 ("if (reason) alert((await cancelGatePass(selectedGatePass.id, reason)).message);", 'if (reason && window.confirm(`Hủy phiếu ${selectedGatePass.code}?`)) await action.run(() => cancelGatePass(selectedGatePass.id, reason));'),
 ('                      Hủy Gate Pass\n                    </button>', '                      Hủy Gate Pass\n                    </button>}'),
 ('                    <button\n                      onClick={() => handleConfirmExit', '                    {can("gate_pass.use") && <button disabled={action.pending}\n                      onClick={() => handleConfirmExit'),
 ('<span>Xác nhận Ra cổng (Gate-out)</span>\n                    </button>', '<span>Xác nhận Ra cổng (Gate-out)</span>\n                    </button>}'),
 ('                ) : (\n                  <button\n                    onClick={() => onNavigate(\'handovers\')}', '                ) : selectedStatus === "USED" && can("handover.read") ? (\n                  <button\n                    onClick={() => onNavigate(\'handovers\')}'),
 ('<span>Tiến hành bàn giao vận chuyển</span>\n                  </button>\n                )}', '<span>Tiến hành bàn giao vận chuyển</span>\n                  </button>\n                ) : null}'),
 ('onClose={() => setShowIssueModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowIssueModal(false); }}'),
 ('<form onSubmit={handleIssueGatePass} className="space-y-4">', '<form noValidate onSubmit={handleIssueGatePass} className="space-y-4"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-4">'),
 ('<select id="gate-pass-issue-visit-id"','<select required {...validation.props("gate-pass-issue-visit-id")} id="gate-pass-issue-visit-id"'),
 ('                <button\n                  type="button"\n                  onClick={() => setShowIssueModal(false)}', '                <button\n                  type="button" disabled={action.pending}\n                  onClick={() => setShowIssueModal(false)}'),
 ('disabled={!readiness || readiness.blockers.length > 0 || isCheckingReadiness}', 'disabled={action.pending || !readiness || readiness.blockers.length > 0 || isCheckingReadiness}'),
 ('              <div className="flex justify-end space-x-2 pt-3', '              </fieldset><div className="flex justify-end space-x-2 pt-3'),
])
file=ROOT/'apps/web/src/components/GatePassView.tsx';text=file.read_text(encoding='utf-8')
text=re.sub(r'              \{isCheckingReadiness &&.*?\n\n              <div>', '              <ReadinessNotice evaluation={evaluation} />\n\n              <div>',text,flags=re.S)
text=re.sub(r'id="(gate-pass-receiver-[^"]+)"\n                  type=',lambda m:'id="'+m[1]+'" {...validation.props("'+m[1]+'")}\n                  type=',text)
file.write_text(text,encoding='utf-8')

edit('EDIView.tsx',[
 ('export const EDIView', imports.replace("import { useFormValidation, FormErrors } from './useFormValidation';\n",'')+'\nexport const EDIView'),
 ('const { ediMessages,', 'const { currentUser, ediMessages,'),
 ("  const [tab,", "  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;\n  const action = useCommandAction();\n  const [tab,"),
 ("<button onClick={() => setTab('OUTBOX')}", "<button aria-pressed={tab === 'OUTBOX'} onClick={() => setTab('OUTBOX')}"),
 ("<button onClick={() => setTab('ROUTES')}", "<button aria-pressed={tab === 'ROUTES'} onClick={() => setTab('ROUTES')}"),
 ("<button onClick={() => setTab('ALERTS')}", "<button aria-pressed={tab === 'ALERTS'} onClick={() => setTab('ALERTS')}"),
 ('const result = await retryEdiMessage(ediId);\n    alert(result.message);\n    if (result.success)', 'const result = await action.run(() => retryEdiMessage(ediId));\n    if (result?.success)'),
 ("                  const res = await dispatchEdiOutbox();\n                  alert(res.message);", '                  await action.run(dispatchEdiOutbox);'),
 ('              <button\n                onClick={async () => {', '              <button disabled={action.pending || !can("edi.dispatch")}\n                onClick={async () => {'),
 ('value={r.transport}', 'aria-label={`Transport ${r.shippingLineName}`} disabled={action.pending || !can("edi.manage")} value={r.transport}'),
 ('onChange={(e) => upsertEdiRoute({ ...r, transport: e.target.value as any })}', 'onChange={(e) => { const transport = e.target.value; if (transport === "MOCK" || transport === "HTTPS" || transport === "SFTP") void action.run(() => upsertEdiRoute({ ...r, transport })); }}'),
 ('onClick={() => upsertEdiRoute({ ...r, enabled: !r.enabled })}', 'disabled={action.pending || !can("edi.manage")} onClick={() => void action.run(() => upsertEdiRoute({ ...r, enabled: !r.enabled }))}'),
 ('onClick={() => acknowledgeEdiAlert(a.id)}', 'disabled={action.pending || !can("edi.alert.manage")} onClick={() => void action.run(() => acknowledgeEdiAlert(a.id))}'),
 ('if (note) resolveEdiAlert(a.id, note);','if (note) void action.run(() => resolveEdiAlert(a.id, note));'),
 ('onClick={() => handleCopy(getSimulatedEdifact(selectedEdi))}', 'disabled={selectedEdi.payloadSnapshot == null} onClick={() => handleCopy(JSON.stringify(selectedEdi.payloadSnapshot, null, 2))}'),
 ("{selectedEdi.status !== 'SENT' &&", "{selectedEdi.status !== 'SENT' && can('edi.manage') &&"),
 ('onClick={() => handleResend(selectedEdi.id)}', 'disabled={action.pending} onClick={() => handleResend(selectedEdi.id)}'),
 ('Dữ liệu điện tín thô (UN/EDIFACT D.00B Segment Payload):', 'Bản ghi payload từ backend (JSON):'),
 ('{getSimulatedEdifact(selectedEdi)}', "{selectedEdi.payloadSnapshot == null ? 'Backend chưa cung cấp bản ghi payload cho điện tín này.' : JSON.stringify(selectedEdi.payloadSnapshot, null, 2)}"),
 ('      {/* Header */}', '      <CommandNotice notice={action.notice} />\n      {/* Header */}'),
 ('          {filteredEdi.map', '          <CollectionState resource="ediMessages" count={filteredEdi.length} total={ediMessages.length} filtered={filterType !== "ALL"} onClear={() => setFilterType("ALL")} />\n          {filteredEdi.map'),
 ('            <tbody className="divide-y divide-slate-100">', '            <tbody className="divide-y divide-slate-100"><tr><td colSpan={6}><CollectionState resource="ediRoutes" count={ediRoutes.length} /></td></tr>'),
])
file=ROOT/'apps/web/src/components/EDIView.tsx';text=file.read_text(encoding='utf-8')
text=re.sub(r'  const getSimulatedEdifact =.*?\n  const handleCopy', '  const handleCopy',text,flags=re.S)
text=re.sub(r'          \{ediAlerts.length === 0 && \(.*?\n          \)\}', '          <CollectionState resource="ediAlerts" count={ediAlerts.length} />',text,flags=re.S)
file.write_text(text,encoding='utf-8')
edit('MovementOrdersView.tsx',[
 ('interface MovementOrdersViewProps', "import { vietnamDateTimeInput, vietnamDateTimeToIso } from '../lib/time';\nimport { useCommandAction, CommandNotice } from './useCommandAction';\n\ninterface MovementOrdersViewProps"),
 ('  const [searchTerm', '  const action = useCommandAction();\n  const [searchTerm'),
 ('new Date(Date.now() + 86400000).toISOString().slice(0,16)', 'vietnamDateTimeInput(Date.now() + 86400000)'),
 ('Thời hạn khi duyệt lệnh', 'Thời hạn khi duyệt lệnh (giờ Việt Nam UTC+7)'),
 ('      <label className="block', '      <CommandNotice notice={action.notice} />\n      <label className="block'),
 ('const res = await createMovementOrder(v.id);\n                  alert(res.message);', 'await action.run(() => createMovementOrder(v.id));'),
 ('key={v.id}\n                onClick', 'key={v.id}\n                disabled={action.pending} onClick'),
 ("onClick={async () => { if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) { alert('Chọn thời hạn trong tương lai.'); return; } alert((await authorizeMovementOrder(o.id, new Date(expiresAt).toISOString())).message); }}", "disabled={action.pending} onClick={async () => { const instant = vietnamDateTimeToIso(expiresAt); if (!instant || new Date(instant).getTime() <= Date.now()) { alert('Chọn thời hạn trong tương lai.'); return; } await action.run(() => authorizeMovementOrder(o.id, instant)); }}"),
 ("if (reason) alert((await cancelMovementOrder(o.id, reason)).message);", 'if (reason && window.confirm(`Hủy lệnh ${o.orderCode}?`)) await action.run(() => cancelMovementOrder(o.id, reason));'),
])
