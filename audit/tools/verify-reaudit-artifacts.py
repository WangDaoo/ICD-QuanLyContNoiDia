"""Read-only integrity/completeness checks on delivered re-audit evidence."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'audit/raw/re-audit'
checks=[]

def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def check(name, condition, detail=None):
    checks.append({'name':name,'status':'PASS' if condition else 'FAIL','detail':detail})

m=read('audit/raw/re-audit/manifest.json')
b=read('audit/findings.json')['findings']
f=read('audit/raw/re-audit/findings.json')['findings']
s=read('audit/raw/re-audit/scores.json')
bs=read('audit/scores.json')
c=read('audit/raw/re-audit/coverage.json')
proposal=read('audit/raw/re-audit/web-semantics/scoring-proposal.json')
approved=set(proposal['resolved_if_verified'])

check('Baseline documents unchanged',all(sha(ROOT/p)==v for p,v in m['baseline_file_hashes'].items()))
check('All original finding IDs retained',len(f)==38 and len({x['id'] for x in f})==38 and {x['id'] for x in f}=={x['id'] for x in b})
check('Only nine approved IDs closed',{x['id'] for x in f if x['status']=='VERIFIED'}==approved)
check('Remaining baseline backlog',Counter(x['severity'] for x in f if x['status']=='OPEN')=={'P2':26,'P3':3})
check('All approved finding verification artifacts exist',all((ROOT/p).exists() for x in f if x['id'] in approved for p in x['re_audit']['evidence']))
check('All finding source line anchors resolve',all((ROOT/e['file']).exists() and 0<e['line']<=len((ROOT/e['file']).read_text(encoding='utf-8-sig').splitlines()) for x in f for e in x['evidence']+x['re_audit'].get('source_evidence',[])))
check('No changed historical source misrepresented as current',all(e.get('location_status')!='BASELINE_LINE_HISTORICAL_NOT_RELOCATED' for x in f for e in x['evidence']))

bo={x['id']:x for x in bs['observations']}; so={x['id']:x for x in s['observations']}
changed={i for i in bo if bo[i]['status']!=so[i]['status']}
check('Exactly nine rubric promotions; no denominator changes',set(bo)==set(so) and changed=={x['id'] for x in proposal['observation_promotions']})
check('UNKNOWN and N/A observations untouched',all(so[i]['status']==x['status'] for i,x in bo.items() if x['status'] in ['UNKNOWN','N/A']))
check('Criterion weights / observation sets unchanged',all(a['weight']==b['weight'] and a['observation_ids']==b['observation_ids'] and a['applicable']==b['applicable'] for p in ['web','mobile'] for before,after in zip(bs['platforms'][p]['ux_gap']['dimensions'],s['platforms'][p]['ux_gap']['dimensions']) for a,b in zip(before['criteria'],after['criteria'])))
for p in ['web','mobile']:
    data=s['platforms'][p]
    computed={'min':0,'max':0}
    for dim in data['ux_gap']['dimensions']:
        weights=0; pts={'min':0,'max':0}
        for cr in dim['criteria']:
            if not cr['applicable']: continue
            observations=[so[i] for i in cr['observation_ids']]
            total=sum(x['status']!='N/A' for x in observations)
            good=sum(x['status']=='PASS' for x in observations)
            unknown=sum(x['status']=='UNKNOWN' for x in observations)
            weights+=cr['weight']; pts['min']+=cr['weight']*good/total; pts['max']+=cr['weight']*(good+unknown)/total
        for bound in computed: computed[bound]+=25*pts[bound]/weights
    check(f'{p}: UX Gap independently recomputed',all(abs(computed[k]-data['ux_gap'][k])<1e-9 for k in computed),computed)
    n=100-2.5*sum(x['verified_max_severity'] for x in data['nielsen']['heuristics'])
    check(f'{p}: Nielsen independently recomputed',n==data['nielsen']['observed'],n)
check('Fresh coverage scope recorded without blanket PASS',len(c['cases'])==140 and len([x for x in c['re_audit_cases'] if x['platform']=='web'])==54 and len([x for x in c['re_audit_cases'] if x['platform']=='mobile'])==36)
check('All fresh coverage evidence files exist',all((ROOT/p).exists() for x in c['re_audit_cases'] for p in x['evidence']))

for path,count in [('web-tests-final.txt',54),('mobile-tests-final.txt',132),('approved-fix-fixtures-final.txt',57)]:
    log=(RAW/path).read_text(encoding='utf-8')
    check(f'Test log: {path}',bool(re.search(rf'\btests {count}\b',log) and re.search(rf'\bpass {count}\b',log) and re.search(r'\bfail 0\b',log)),{'tests':count})
build=(RAW/'web-semantics/build-final.txt').read_text(encoding='utf-8')
check('Final build log includes successful production build','built in' in build and 'error TS' not in build)
lint=read('audit/raw/re-audit/eslint.json')
check('ESLint limitations accurately reported',sum(x['errorCount'] for x in lint)==m['lint']['errors']==290 and sum(x['warningCount'] for x in lint)==m['lint']['warnings']==3 and m['lint']['status']=='FAIL')
check('Changed baseline source still matches captured final hashes',all(sha(ROOT/x['path'])==x['after'] for x in m['source_integrity']['changed']))
check('Protected source/config scope intact',m['source_integrity']['status']=='PASS' and not m['source_integrity']['protected_source_or_config_changes'])
new=read('audit/raw/re-audit/new-source-files.json')
check('New source files remain within approved scope',set(new['files'])=={'apps/web/src/components/CriticalDataNotice.tsx','apps/web/src/components/ModalOverlay.tsx','apps/web/src/components/ViewErrorBoundary.tsx','apps/web/src/services/redacted-log-body.ts','apps/web/src/services/visit-safety-data.ts','apps/mobile/tests/priority-accessibility.test.cjs'} and all(sha(ROOT/p)==h for p,h in new['source_sha256'].items()))
native=read('audit/raw/re-audit/mobile/measurements-independent-verification.json')
partial=sum(x['partial'] for x in native['targets'])
full=[x for x in native['targets'] if not x['partial']]
check('Independent native measurements',native['status']=='PASS' and len(native['colors'])==9 and all(x['matches'] and x['passes_4_5'] for x in native['colors']) and len(native['targets'])==352 and partial==21 and len(full)==331 and all(x['passes'] and x['xml_match'] for x in full),{'color_pairs':9,'complete_targets':len(full),'partial_excluded':partial})
lh=read('audit/raw/re-audit/web/lighthouse-summary.json')
check('Lighthouse final three runs / original settings',lh['successful_runs']==3 and lh['settings_match_baseline'] and lh['pinned_versions_match_baseline'] and lh['protected_files_unchanged'])
restore=read('audit/raw/re-audit/web/browser-restored.json')
check('Original browser tabs preserved and audit tab closed',restore['viewportOverrideReset'] and restore['remainingTabIds']==['1','2','3','9','13','16','17','18','19'])
check('No final browser console errors',read('audit/raw/re-audit/web/console-errors-final.json')==[])
execdoc=read('audit/fixes/execution-2026-10-03.json')
check('Execution ledger has all approved IDs',set(execdoc['approved_fix_ids'])==approved)
check('Per-ID reviewable diffs present',all(any((ROOT/'audit/fixes'/fid).rglob('*.diff')) for fid in approved))

report=ROOT/m['report']; text=report.read_text(encoding='utf-8')
links=re.findall(r'\]\(<([^>]+)>\)',text)
invalid=[]
for target in links:
    path=re.sub(r':\d+$','',target)
    if not Path(path).exists(): invalid.append(target)
check('Report file links and screenshots resolve',not invalid,{'links_checked':len(links),'invalid':invalid})
check('Report retains each finding ID',all(x['id'] in text for x in f))

result={'status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL','checks':checks,'failed':[x for x in checks if x['status']=='FAIL']}
(RAW/'artifact-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':result['status'],'checks':len(checks),'failed':result['failed']},ensure_ascii=False))
raise SystemExit(0 if result['status']=='PASS' else 1)
