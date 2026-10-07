"""Record device/source prerequisites; no app acceptance is inferred from ADB connectivity."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
RUN=ROOT/'audit/runs/2026-10-03-improvement-02'
NATIVE=RUN/'native/2026-10-04-01'
ADB=Path(os.environ['LOCALAPPDATA'])/'Android/Sdk/platform-tools/adb.exe'
def adb(*args):
    r=subprocess.run([str(ADB),'-s','emulator-5554',*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
    assert r.returncode==0,args
    return r.stdout.strip()
def read(p):return json.loads((RUN/p).read_text(encoding='utf-8-sig'))
baseline=read('raw/final-verification-manifest-feedback-2026-10-04.json')
hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in baseline['source_hashes'] if p.startswith(('apps/mobile/src/','apps/mobile/tests/'))}
assert all(h==baseline['source_hashes'][p] for p,h in hashes.items()),'Mobile source changed since previous checks'
device={'serial':'emulator-5554','state':adb('get-state'),'android_release':adb('shell','getprop','ro.build.version.release'),
        'sdk':adb('shell','getprop','ro.build.version.sdk'),'size':adb('shell','wm','size'),'density':adb('shell','wm','density'),
        'font_scale':adb('shell','settings','get','system','font_scale'),'night_mode':adb('shell','cmd','uimode','night'),
        'accessibility_enabled':adb('shell','settings','get','secure','accessibility_enabled'),'adb_reverse':adb('reverse','--list')}
package=adb('shell','dumpsys','package','host.exp.exponent')
device['expo_go_version']=[s.strip() for s in package.splitlines() if 'versionName=' in s or 'versionCode=' in s]
pending=[r for r in read('ledger.json')['findings'] if r.get('id') in {'M-004','M-005','M-006','M-007','M-008','M-009','M-010','M-011','M-012','M-013','M-014','M-N-001','M-N-002'}]
assert len(pending)==13
cases=[{'finding_id':r['id'],'status':'PENDING','acceptance':r.get('acceptance',[]),'source_fix_status':r['status'],
        'required_evidence':'Current-source native screenshot/hierarchy and behavior; source tests alone do not close acceptance'} for r in pending]
manifest={'at':datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat(),'device':device,'api':'http://10.0.2.2:3001/api',
          'database':'icd_ux_audit_20261003_e2e','source_hashes':hashes,'source_matches_previous_verification':True,
          'metro_port':8081,'metro_status':'NOT_RUNNING_AT_INITIAL_CHECK',
          'startup':'Automatic approval review rejected EXPO_PUBLIC_API_BASE_URL + Expo start, reason blocked by policy. User asked to launch manually; do not retry or bypass.',
          'app_acceptance':'NOT_STARTED; screenshot shows Android launcher, not ICD app','pending_findings':len(cases),
          'preserved_prior_report':'audit/2026-10-04-reaudit-01-report.md'}
(NATIVE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(NATIVE/'acceptance-cases.json').write_text(json.dumps({'cases':cases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'device':device['state'],'expo_go':device['expo_go_version'],'source_files':len(hashes),'pending':len(cases),'native_app_verified':False}))
