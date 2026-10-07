from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[5]
components=ROOT/'apps/web/src/components'
for name,condition in {
 'ManifestsView.tsx':'!showCreateModal && !showMblModal && !showHblModal',
 'BillingView.tsx':'!showCreateSoModal && !showPayModal && !showTariffModal && !showRuleModal',
 'ContainersView.tsx':'!activeVisit && !showCreateVisit',
}.items():
    file=components/name;text=file.read_text(encoding='utf-8')
    text=text.replace('<CommandNotice notice={action.notice} />', '{'+condition+' && <CommandNotice notice={action.notice} />}',1)
    if name=='ContainersView.tsx':
        text=text.replace('<form noValidate onSubmit={issueInlinePass} className="space-y-3"><FormErrors errors={validation.errors} /><CommandNotice notice={action.notice} />','<form noValidate onSubmit={issueInlinePass} className="space-y-3"><FormErrors errors={validation.errors} />')
    else:
        # Ensure each save dialog owns one response message when a failure retains it.
        matches=list(re.finditer(r'<ModalOverlay\b.*?</ModalOverlay>',text,flags=re.S))
        for match in reversed(matches):
            part=match[0]
            if name=='BillingView.tsx' and 'handleRecordPayment' in part: continue
            if 'CommandNotice' not in part:
                part=re.sub(r'(</h3>)',r'\1<CommandNotice notice={action.notice} />',part,count=1)
                text=text[:match.start()]+part+text[match.end():]
    file.write_text(text,encoding='utf-8')
file=components/'PartnerManagementView.tsx';text=file.read_text(encoding='utf-8')
text=text.replace('{newApiKeyResult ? (\n                <div className="space-y-4">','{newApiKeyResult ? (\n                <div className="space-y-4"><CommandNotice notice={action.notice} />')
file.write_text(text,encoding='utf-8')
