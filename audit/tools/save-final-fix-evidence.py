"""Finish diff/verification artifacts only; never edits application source."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
F = ROOT / 'audit/fixes'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def delta(before, after, name):
    return ''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile=f'before/{name}',tofile=f'after/{name}'))

mapping = {
 'W-S-020': {'App.tsx':'apps/web/src/App.tsx','types.ts':'apps/web/src/types.ts','PartnerManagementView.tsx':'apps/web/src/components/PartnerManagementView.tsx'},
 'W-S-016': {'AppContext.tsx':'apps/web/src/context/AppContext.tsx','ContainersView.tsx':'apps/web/src/components/ContainersView.tsx','GatePassView.tsx':'apps/web/src/components/GatePassView.tsx','Header.tsx':'apps/web/src/components/Header.tsx','DashboardView.tsx':'apps/web/src/components/DashboardView.tsx','YardSiteMap.tsx':'apps/web/src/components/yard/YardSiteMap.tsx','yard-model.ts':'apps/web/src/components/yard/yard-model.ts'}
}
added = {'W-S-020':['apps/web/src/services/redacted-log-body.ts','apps/web/src/components/ViewErrorBoundary.tsx'],
         'W-S-016':['apps/web/src/services/visit-safety-data.ts','apps/web/src/components/CriticalDataNotice.tsx']}
for fid, files in mapping.items():
    diffs=[]; details=[]
    for name, actual in files.items():
        before=F/fid/'before'/name
        current=ROOT/actual
        after_text=current.read_text(encoding='utf-8-sig')
        kind='FINAL_SOURCE_ONLY_THIS_FIX'
        overlaps=[]
        if fid=='W-S-020' and name=='PartnerManagementView.tsx':
            after_text=(F/'W-S-001/before/apps/web/src/components/PartnerManagementView.tsx').read_text(encoding='utf-8-sig')
            kind='ISOLATED_RECORDED_STAGE_AFTER_P0_BEFORE_SEMANTICS'
        elif fid=='W-S-016' and name in ['ContainersView.tsx','GatePassView.tsx']:
            kind='COMBINED_APPROVED_FIXES_FINAL_SOURCE'
            overlaps=['W-S-001','W-S-002']+(['W-S-003'] if name=='GatePassView.tsx' else [])
        final=F/fid/'review-after'/name
        final.parent.mkdir(parents=True,exist_ok=True)
        final.write_text(after_text,encoding='utf-8')
        diffs.append(delta(before.read_text(encoding='utf-8-sig'),after_text,name))
        details.append({'file':actual,'before_snapshot':before.relative_to(ROOT).as_posix(),'review_after_snapshot':final.relative_to(ROOT).as_posix(),'before_sha256':sha(before),'review_after_sha256':sha(final),'current_sha256':sha(current),'diff_scope':kind,'overlapping_approved_ids':overlaps})
    for actual in added[fid]:
        source=ROOT/actual
        snapshot=F/fid/'new-files'/Path(actual).name
        snapshot.parent.mkdir(parents=True,exist_ok=True)
        snapshot.write_bytes(source.read_bytes())
        diffs.append(delta('',source.read_text(encoding='utf-8'),actual))
        details.append({'file':actual,'new_file':True,'snapshot':snapshot.relative_to(ROOT).as_posix(),'current_sha256':sha(source),'diff_scope':'NEW_FILE_THIS_FIX'})
    (F/fid/'fix.diff').write_text('\n'.join(diffs),encoding='utf-8')
    save(F/fid/'fix-log.json',{'id':fid,'verification_status':'VERIFIED_IN_APPROVED_SCOPE','source_files':details,'diff':f'audit/fixes/{fid}/fix.diff',
      'diff_policy':'Review artifact, not a standalone patch to apply. W-S-020 Partner diff uses recorded P0-only stage. W-S-016 Containers/GatePass final diffs explicitly include other approved shared-file semantics. All source files remain unchanged while generating artifacts.',
      'evidence':['audit/raw/re-audit/approved-fix-fixtures-final.txt','audit/raw/re-audit/web-safety/independent-review-tests.txt']})

doc=json.loads((ROOT/'audit/raw/re-audit/findings.json').read_text(encoding='utf-8'))
execution=[]
for finding in doc['findings']:
    if finding['status']=='VERIFIED':
        execution.append({'id':finding['id'],'status':'VERIFIED_IN_APPROVED_SCOPE','change':finding['re_audit']['change'],'evidence':finding['re_audit']['evidence'],'source_evidence':finding['re_audit']['source_evidence'],'limitations':finding['re_audit']['limit']})
save(F/'execution-2026-10-03.json',{'approved_fix_ids':[x['id'] for x in execution],'fixes':execution,'baseline_priority_plan_preserved':True,'residual_subtasks':doc['residual_subtasks']})

# Agent-scoped static records remain historical; parent verification is appended explicitly.
for fid in ['W-S-001','W-S-002','W-S-003']:
    p=F/fid/'fix-log.json'; d=json.loads(p.read_text())
    d['parent_final_verification']=next(x for x in execution if x['id']==fid)
    save(p,d)
baseline=json.loads((ROOT/'audit/raw/baseline/source-hashes.json').read_text(encoding='utf-8-sig'))
known={x['path'] for x in baseline}
new_files=[p.relative_to(ROOT).as_posix() for base in ['apps/web/src','apps/mobile/src','apps/mobile/tests'] for p in (ROOT/base).rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in known]
save(ROOT/'audit/raw/re-audit/new-source-files.json',{'files':new_files,'source_sha256':{p:sha(ROOT/p) for p in new_files},'policy':'Files absent from original source snapshot; compare list with approved scope.'})
print(json.dumps({'diffs':['audit/fixes/W-S-020/fix.diff','audit/fixes/W-S-016/fix.diff'],'verified_execution_entries':len(execution),'new_source_files':new_files},ensure_ascii=False))
