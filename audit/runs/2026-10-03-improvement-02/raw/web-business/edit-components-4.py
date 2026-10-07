from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[5]
def edit(name, changes):
    file = ROOT / 'apps/web/src/components' / name
    text = file.read_text(encoding='utf-8')
    if name == 'PartnerManagementView.tsx' and 'const action = useCommandAction()' in text: return
    for old, new in changes:
        if old not in text: raise RuntimeError(f'{name}: missing {old[:90]}')
        text = text.replace(old, new)
    file.write_text(text, encoding='utf-8')
imports = "import { useCommandAction, CommandNotice } from './useCommandAction';\nimport { useFormValidation, FormErrors } from './useFormValidation';\nimport { CollectionState, DetailAvailability } from './CollectionState';\n"
edit('PartnerManagementView.tsx',[
 ('interface PartnerManagementViewProps', imports.replace('CollectionState, DetailAvailability','CollectionState')+'\ninterface PartnerManagementViewProps'),
 ('  const [copiedKey', '  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [copiedKey'),
 ('const [selectedLog, setSelectedLog] = useState<PartnerApiLog | null>(partnerApiLogs[0] || null);', "const [selectedLogId, setSelectedLogId] = useState(partnerApiLogs[0]?.id ?? '');\n  const selectedLog = partnerApiLogs.find(log => log.id === selectedLogId) ?? null;"),
 ('setSelectedLog(log)', 'setSelectedLogId(log.id)'),
 ('const res = await rotatePartnerApiKey(client.id);', 'if (!window.confirm(`Thu hồi khóa hiện tại và cấp khóa mới cho ${client.partnerName}?`)) return;\n    const res = await action.run(() => rotatePartnerApiKey(client.id));\n    if (!res) return;'),
 ("    alert(`Đã thu hồi API key cũ và cấp API key mới cho ${client.partnerName}:\\n\\n${res.plainApiKey}\\n\\n(Lưu ý: Khóa chỉ hiển thị một lần duy nhất)`);", "    setNewApiKeyResult(res.plainApiKey); setShowAddModal(true);"),
 ('async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!newCode || !newName) return;\n    const res = await createPartnerClient(newCode.trim().toUpperCase(), newName.trim(), [\'read:handovers\', \'write:confirmations\']);\n    if (res.success && res.plainApiKey) setNewApiKeyResult(res.plainApiKey);\n    else alert(res.message);', 'async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (action.isPending() || !validation.validate(e.currentTarget)) return;\n    const res = await action.run(() => createPartnerClient(newCode.trim().toUpperCase(), newName.trim(), [\'read:handovers\', \'write:confirmations\']));\n    if (res?.success && res.plainApiKey) setNewApiKeyResult(res.plainApiKey);'),
 ('        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">', '        {!showAddModal && <CommandNotice notice={action.notice} />}\n        <CollectionState resource="partnerClients" count={partnerClients.length} />\n        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">'),
 ('onClick={() => handleRotateKey(client)}', 'disabled={action.pending} onClick={() => handleRotateKey(client)}'),
 ('onClose={() => setShowAddModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowAddModal(false); }}'),
 ('<form onSubmit={handleCreatePartner}', '<form noValidate onSubmit={handleCreatePartner}'),
 ('<form noValidate onSubmit={handleCreatePartner} className="space-y-4">', '<form noValidate onSubmit={handleCreatePartner} className="space-y-4"><CommandNotice notice={action.notice} /><FormErrors errors={validation.errors} /><fieldset disabled={action.pending} className="space-y-4">'),
 ('                  <div className="flex justify-end space-x-2 pt-3', '                  </fieldset><div className="flex justify-end space-x-2 pt-3'),
 ('                      type="submit"', '                      type="submit" disabled={action.pending}'),
 ('                      type="button"\n                      onClick', '                      type="button" disabled={action.pending}\n                      onClick'),
 ('id="partner-management-new-code"', 'id="partner-management-new-code" {...validation.props("partner-management-new-code")}'),
 ('id="partner-management-new-name"', 'id="partner-management-new-name" {...validation.props("partner-management-new-name")}'),
 ('          {partnerApiLogs.map', '          <CollectionState resource="partnerApiLogs" count={partnerApiLogs.length} />\n          {partnerApiLogs.map'),
 ('Đối tác đã được tạo thành công! Hãy copy API Key dưới đây và cung cấp an toàn cho đối tác:', 'Đã cấp API Key. Khóa chỉ hiển thị một lần; sao chép và cung cấp an toàn cho đối tác:'),
])
edit('HandoversView.tsx',[
 ('interface HandoversViewProps', imports+'\ninterface HandoversViewProps'),
 ('  const [searchTerm', '  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [searchTerm'),
 ('async (e: React.FormEvent) => {\n    e.preventDefault();','async (e: React.FormEvent<HTMLFormElement>) => {\n    e.preventDefault();\n    if (action.isPending() || !validation.validate(e.currentTarget)) return;'),
 ('const res = await createHandover({', 'const res = await action.run(() => createHandover({'),
 ('      publishNow: false,\n    });', '      publishNow: false,\n    }));'),
 ('if (res.success && res.handover)', 'if (res?.success && res.handover)'),
 ('    } else {\n      alert(res.message);\n    }', '    }'),
 ('const res = await publishHandover(selectedHandover.id);\n    alert(res.message);', 'await action.run(() => publishHandover(selectedHandover.id));'),
 ("const res = await icdConfirmHandover(selectedHandover.id, 'ICD xác nhận hoàn tất bàn giao.');\n    alert(res.message);", "await action.run(() => icdConfirmHandover(selectedHandover.id, 'ICD xác nhận hoàn tất bàn giao.'));"),
 ('      {/* Header */}', '      {!showCreateModal && <CommandNotice notice={action.notice} />}\n      {/* Header */}'),
 ('          {filteredHandovers.map', '          <CollectionState resource="handovers" count={filteredHandovers.length} total={handovers.length} filtered={!!searchTerm || statusFilter !== "ALL"} onClear={() => { setSearchTerm(\'\'); setStatusFilter("ALL"); }} />\n          {filteredHandovers.map'),
 ('onClick={handlePublish}', 'disabled={action.pending} onClick={handlePublish}'),
 ('onClick={handleIcdConfirm}', 'disabled={action.pending} onClick={handleIcdConfirm}'),
 ('onClose={() => setShowCreateModal(false)}', 'pending={action.pending} onClose={() => { if (!action.isPending()) setShowCreateModal(false); }}'),
 ('<form onSubmit={handleCreate} className="space-y-4">', '<form noValidate onSubmit={handleCreate} className="space-y-4"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-4">'),
 ('              <div className="flex justify-end space-x-2 pt-3', '              </fieldset><div className="flex justify-end space-x-2 pt-3'),
 ('                  type="submit"', '                  type="submit" disabled={action.pending}'),
 ('                  type="button"\n                  onClick', '                  type="button" disabled={action.pending}\n                  onClick'),
])
file=ROOT/'apps/web/src/components/HandoversView.tsx';text=file.read_text(encoding='utf-8')
start=text.index('{selectedHandover ? (');pos=text.index('<div',start);text=text[:pos]+text[pos:].replace('className="bg-white', 'className="bg-white',1)
# Detail marker is independent of the list's availability.
end=text.index('>',pos)+1;text=text[:end]+'\n              <DetailAvailability resource="handovers" id={selectedHandover.id} />'+text[end:]
text=re.sub(r'<select id="([^"]+)"',lambda m:'<select required {...validation.props("'+m[1]+'")} id="'+m[1]+'"',text)
file.write_text(text,encoding='utf-8')
edit('AuditsView.tsx',[
 ('export const AuditsView', "import { CollectionState } from './CollectionState';\n\nexport const AuditsView"),
 ('            {filteredLogs.map', '            <tr><td colSpan={6}><CollectionState resource="auditLogs" count={filteredLogs.length} total={auditLogs.length} filtered={!!searchTerm} onClear={() => setSearchTerm(\'\')} /></td></tr>\n            {filteredLogs.map'),
 ('font-bold text-slate-800 flex items-center space-x-1.5', 'font-bold text-slate-800'),
])
