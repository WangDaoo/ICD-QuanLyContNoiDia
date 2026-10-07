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
imports = "import { useCommandAction, CommandNotice } from './useCommandAction';\nimport { useFormValidation, FormErrors } from './useFormValidation';\nimport { CollectionState, DetailAvailability } from './CollectionState';\n"
edit('ManifestsView.tsx',[
 ('// ISO 6346', imports+"import { vietnamDateInput } from '../lib/time';\nimport { asRecord, asString } from '../services/mappers/api-response.mapper';\n\n// ISO 6346"),
 ('  const { manifests,', '  const { detailStatus, manifests,'),
 ('  const [showMblModal', '  const action = useCommandAction();\n  const validation = useFormValidation();\n  const [showMblModal'),
 ('new Date().toISOString().slice(0, 10)', 'vietnamDateInput()'),
 ('const result = await addManifest(manifest);\n    alert(result.message);\n    if (result.success)', 'const result = await action.run(() => addManifest(manifest));\n    if (result?.success)'),
 ('result.data?.id || null', 'asString(asRecord(result.data).id) || null'),
 ('    if (!newVessel.trim() || !newVoyage.trim() || !newShippingLine) return;', '    if (action.isPending() || !newVessel.trim() || !newVoyage.trim() || !newShippingLine) return;'),
 ('      {/* Header Bar */}', '      <CommandNotice notice={action.notice} />\n      {/* Header Bar */}'),
 ('            {manifests\n', '            <CollectionState resource="manifests" count={manifests.filter(m => m.manifestNo.toLowerCase().includes(searchTerm.toLowerCase()) || m.vesselName.toLowerCase().includes(searchTerm.toLowerCase())).length} total={manifests.length} filtered={!!searchTerm} onClear={() => setSearchTerm(\'\')} />\n            {manifests\n'),
 ('              {/* Master Bills & House Bills Tree */}', '              <DetailAvailability resource="manifests" id={selectedManifest.id} />\n              {/* Master Bills & House Bills Tree */}'),
 ('mbl.houseBills.length === 0', "mbl.houseBills.length === 0 && (!detailStatus?.manifests?.[selectedManifest.id] || detailStatus.manifests[selectedManifest.id] === 'ready')"),
 ('onClose={() => setShowCreateModal(false)}','pending={action.pending} onClose={() => { if (!action.isPending()) setShowCreateModal(false); }}'),
 ('onClose={() => setShowMblModal(false)}','pending={action.pending} onClose={() => { if (!action.isPending()) setShowMblModal(false); }}'),
 ('onClose={() => setShowHblModal(null)}','pending={action.pending} onClose={() => { if (!action.isPending()) setShowHblModal(null); }}'),
])
file=ROOT/'apps/web/src/components/ManifestsView.tsx';text=file.read_text(encoding='utf-8')
text=text.replace('const res = await submitManifest(selectedManifest.id);\n                          alert(res.message);','await action.run(() => submitManifest(selectedManifest.id));')
text=text.replace('const res = await cancelManifest(selectedManifest.id, reason);\n                            alert(res.message);','await action.run(() => cancelManifest(selectedManifest.id, reason));')
for marker,handler in [('      {/* Add Master BL Modal */}', 'saveMbl'),('      {/* Add House BL Modal */}', 'saveHbl')]:
    start=text.index(marker);end=text.index('</ModalOverlay>',start)
    seg=text[start:end]
    seg=seg.replace('<div className="space-y-3">', '<form noValidate onSubmit={'+handler+'} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">',1)
    seg=seg.replace('</div>\n            <div className="flex justify-end space-x-2 pt-4','</fieldset>\n            <div className="flex justify-end space-x-2 pt-4',1)
    seg=re.sub(r'onClick=\{async \(\) => \{.*?\n                \}\}', 'type="submit" disabled={action.pending}',seg,flags=re.S)
    seg=seg.replace('<button onClick=', '<button type="button" disabled={action.pending} onClick=')
    seg=seg.rsplit('            </div>',1)[0]+'            </div></form>'+seg.rsplit('            </div>',1)[1]
    text=text[:start]+seg+text[end:]
for id in ['manifests-mbl-number','manifests-mbl-line','manifests-hbl-form-hbl-number','manifests-hbl-form-consignee-name']:
    text=text.replace('id="'+id+'"','id="'+id+'" required {...validation.props("'+id+'")}')
handlers="""  const saveMbl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedManifest || action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() => addMasterBl(selectedManifest.id, mblNumber.trim().toUpperCase(), mblLine));
    if (result?.success) { setMblNumber(''); setShowMblModal(false); }
  };
  const saveHbl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedManifest || !showHblModal || action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() => addHouseBl(selectedManifest.id, showHblModal.mblId, hblForm));
    if (result?.success) { setHblForm({ hblNumber: '', consigneeName: '', clearingAgentName: '', cargoDescription: '', grossWeightKg: 0, packageCount: 0 }); setShowHblModal(null); }
  };
"""
text=text.replace('  const isoCheck =',handlers+'\n  const isoCheck =')
text=re.sub(r'(<button\s+)(onClick=\{async)',r'\1disabled={action.pending} \2',text)
text=text.replace('<form onSubmit={handleCreateManifest}', '<form onSubmit={handleCreateManifest}').replace('type="submit"\n', 'type="submit" disabled={action.pending}\n')
file.write_text(text,encoding='utf-8')

edit('ContainersView.tsx',[
 ("import { ContainerVisit, ContainerState }", "import { ContainerVisit, ContainerState, HoldType }"),
 ('interface ContainersViewProps', imports.replace('CollectionState, DetailAvailability','CollectionState')+"import QRCode from 'react-qr-code';\nimport { effectiveGatePassStatus } from '../lib/gate-pass';\nimport { ReadinessNotice } from './ReadinessNotice';\n\ninterface ContainersViewProps"),
 ('  const [showCreateVisit', '  const action = useCommandAction();\n  const [showCreateVisit'),
 ("useState<any>('CUSTOMS')", "useState<HoldType>('CUSTOMS')"),
 ("gp.status === 'ACTIVE'", "effectiveGatePassStatus(gp) === 'ACTIVE'"),
 ('const { readiness, readinessError, isCheckingReadiness } = useBackendReadiness(activeVisit?.id);','const evaluation = useBackendReadiness(activeVisit?.id);\n  const { readiness, readinessError, isCheckingReadiness } = evaluation;'),
 ('<QrCode className="w-32 h-32 text-slate-800 mx-auto" />', '<QRCode value={activeVisitGatePass.qrToken} size={160} data-testid="container-gate-pass-qr" />'),
 ('{readiness?.blockers.length === 0 ? (\n                        <div', '{evaluation.status === "ready" ? (\n                        <div'),
 ('                          Chưa thể cấp Phiếu ra cổng vì còn vướng điều kiện chưa đạt. Vui lòng kiểm tra tab Tổng quan.', '                          <ReadinessNotice evaluation={evaluation} />'),
 ('                              const res = await createGatePass({','                              await action.run(() => createGatePass({'),
 ('                                receiverIdNumber: gpCccd,\n                              });\n                              alert(res.message);', '                                receiverIdNumber: gpCccd,\n                              }));'),
 ('      <CriticalDataNotice kind="holds"', '      <CommandNotice notice={action.notice} />\n      <CriticalDataNotice kind="holds"'),
 ('onChange={(e) => setNewHoldType(e.target.value)}', 'onChange={(e) => setNewHoldType(e.target.value as HoldType)}'),
])
