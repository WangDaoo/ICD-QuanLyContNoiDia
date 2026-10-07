from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[5]
file=ROOT/'apps/web/src/components/ContainersView.tsx';text=file.read_text(encoding='utf-8')
text=text.replace("import { CollectionState }", "import { useFormValidation, FormErrors } from './useFormValidation';\nimport { CollectionState }")
text=text.replace('  const action = useCommandAction();','  const action = useCommandAction();\n  const validation = useFormValidation();')
handlers="""  const issueInlinePass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeVisit || action.isPending() || evaluation.status !== 'ready' || !validation.validate(e.currentTarget)) return;
    await action.run(() => createGatePass({ visitId: activeVisit.id, vehiclePlate: gpPlate, receiverName: gpReceiver, receiverIdNumber: gpCccd }));
  };
  const saveContainerVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (action.isPending() || !validation.validate(e.currentTarget)) return;
    const result = await action.run(() => createContainerVisit(cvForm));
    if (result?.success) {
      setShowCreateVisit(false);
      setCvForm({ containerNumber: '', containerType: '40HC', consigneeName: '', shippingLine: '', manifestNo: '', mblNumber: '', hblNumber: '', manifestSeal: '', grossWeightKg: 0 });
    }
  };
"""
text=text.replace('  const getStateBadge =',handlers+'\n  const getStateBadge =')
start=text.index('{evaluation.status === "ready" ? (');end=text.index('                      ) : (',start)
seg=text[start:end]
seg=seg.replace('<div className="space-y-3">','<form noValidate onSubmit={issueInlinePass} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">',1)
seg=re.sub(r'onClick=\{async \(\) => \{.*?\n                            \}\}', 'type="submit"',seg,flags=re.S)
seg=seg.replace('                          <button','                          </fieldset><button',1)
seg=seg.rsplit('                        </div>',1)[0]+'                        </form>'+seg.rsplit('                        </div>',1)[1]
for id in ['containers-gp-plate','containers-gp-receiver','containers-gp-cccd']:
    seg=seg.replace('id="'+id+'"','id="'+id+'" required {...validation.props("'+id+'")}')
text=text[:start]+seg+text[end:]
start=text.index('      {/* Create Container Visit Modal */}');end=text.index('</ModalOverlay>',start)
seg=text[start:end]
seg=seg.replace('<div className="space-y-3">', '<form noValidate onSubmit={saveContainerVisit} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} /><fieldset disabled={action.pending} className="space-y-3">',1)
seg=seg.replace('</div>\n            <div className="flex justify-end space-x-2 pt-4','</fieldset>\n            <div className="flex justify-end space-x-2 pt-4',1)
seg=re.sub(r'onClick=\{async \(\) => \{.*?\n                \}\}', 'type="submit"',seg,flags=re.S)
seg=seg.replace('<button onClick=', '<button type="button" disabled={action.pending} onClick=')
seg=seg.rsplit('            </div>',1)[0]+'            </div></form>'+seg.rsplit('            </div>',1)[1]
for id in ['containers-cv-form-container-number','containers-cv-form-manifest-seal','containers-create-manifest','containers-create-mbl','containers-create-hbl']:
    seg=seg.replace('id="'+id+'"','id="'+id+'" required {...validation.props("'+id+'")}')
text=text[:start]+seg+text[end:]
text=text.replace('<div className="space-y-6">','<div className="space-y-6"><CommandNotice notice={action.notice} />',1)
text=text.replace('            {/* Modal Body */}','            <CommandNotice notice={action.notice} />\n            {/* Modal Body */}')
text=text.replace('                  <CommandNotice notice={action.notice} />\n      <CriticalDataNotice','                  <CriticalDataNotice')
file.write_text(text,encoding='utf-8')
