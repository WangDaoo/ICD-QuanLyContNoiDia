"""Compose a separate re-audit without modifying baseline or application files."""
import copy
import difflib
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'audit'
OUT = AUDIT / 'raw/re-audit'
REPORT = AUDIT / '2026-10-03-reaudit-01-report.md'

def read(p):
    return json.loads((ROOT / p).read_text(encoding='utf-8-sig'))

def write(p, data):
    (ROOT / p).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest().upper()

def link(p, label=None, line=None):
    target = (ROOT / p).as_posix() + (f':{line}' if line else '')
    return f'[{label or p}](<{target}>)'

def clean(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')

def anchor(file, needle):
    lines = (ROOT / file).read_text(encoding='utf-8-sig').splitlines()
    for i, text in enumerate(lines, 1):
        if needle in text:
            return {'file': file, 'line': i, 'detail': needle}
    raise ValueError(f'Missing source anchor: {file} / {needle}')

baseline_files = ['audit/2026-10-03-report.md', 'audit/findings.json', 'audit/scores.json',
                  'audit/coverage.json', 'audit/manifest.json', 'audit/rubric-observations.json']
baseline_preserved = {p: digest(ROOT / p) for p in baseline_files}
findings_doc = copy.deepcopy(read('audit/findings.json'))
base_scores = read('audit/scores.json')
scores = copy.deepcopy(base_scores)
coverage = copy.deepcopy(read('audit/coverage.json'))
proposal = read('audit/raw/re-audit/web-semantics/scoring-proposal.json')
approved = proposal['resolved_if_verified']

fixes = {
 'W-S-020': {
  'change': 'Chuẩn hóa JSON đã redacted thành văn bản; khai báo JsonValue đúng kiểu; thêm ErrorBoundary riêng cho màn hình và nút về Tổng quan.',
  'anchors': [('apps/web/src/services/redacted-log-body.ts', 'export function'), ('apps/web/src/components/ViewErrorBoundary.tsx', 'getDerivedStateFromError'), ('apps/web/src/components/PartnerManagementView.tsx', 'formatRedactedLogBody(selectedLog.requestBodyRedacted)')],
  'evidence': ['audit/raw/re-audit/web/W-S-020-green.txt', 'audit/raw/re-audit/web/partner-api-logs-fixed-ax.txt', 'audit/screenshots/re-audit/web/partner-api-logs-fixed.jpg', 'audit/raw/re-audit/web-safety/independent-review-tests.txt'],
  'limit': 'Đã mở log thực tế ở 3 viewport; lỗi render cưỡng bức, dữ liệu falsy và bảo vệ redaction kiểm bằng fixture. Không gửi API đối tác.'},
 'W-S-001': {
  'change': '15 overlay dùng dialog có tên, focus ban đầu, trap Tab/Shift+Tab, khóa nền, Escape và trả focus về nút mở; giữ điều kiện khóa khi đang gửi.',
  'anchors': [('apps/web/src/components/ModalOverlay.tsx', 'export function')],
  'evidence': ['audit/fixes/W-S-001/inventory.json', 'audit/raw/re-audit/web/modal-keyboard-checks.json', 'audit/raw/re-audit/web-semantics/modal-green.txt', 'audit/raw/re-audit/web-conditional-forms/tests.txt'],
  'limit': '12/15 loại overlay chạy trực tiếp trong browser. MBL/HBL/thanh toán không mở được với dữ liệu hiện tại; kiểm component thật bằng fixture. Đây không phải bằng chứng native browser cho 3 loại đó.'},
 'W-S-002': {
  'change': 'Thêm 59 liên kết label htmlFor/id cho field vận hành; giữ ARIA name đã có. Label được click để đối chiếu focus.',
  'anchors': [('apps/web/src/components/TruckVisitsView.tsx', 'htmlFor='), ('apps/web/src/components/ContainersView.tsx', 'htmlFor="containers-create')],
  'evidence': ['audit/fixes/W-S-002/inventory.json', 'audit/fixes/W-S-002/supplement/inventory.json', 'audit/raw/re-audit/web/modal-keyboard-checks.json', 'audit/raw/re-audit/web-conditional-forms/coverage.json'],
  'limit': 'Field có điều kiện kiểm thêm qua 9 fixture component thật, 37 field hiển thị. Chưa xác nhận thông báo screen reader thực tế.'},
 'W-S-003': {
  'change': '5 danh sách master/detail dùng button type=button, aria-pressed và focus ring; Enter/Space chọn đúng bản ghi.',
  'anchors': [('apps/web/src/components/ManifestsView.tsx', 'aria-pressed={')],
  'evidence': ['audit/fixes/W-S-003/inventory.json', 'audit/raw/re-audit/web/keyboard-selectors.json'],
  'limit': 'Đã thao tác keyboard cả 5 danh sách bằng dữ liệu hiện có; không ghi giao dịch.'},
 'W-S-005': {
  'change': 'Thanh toán có khóa ref đồng bộ chống gửi trùng, disabled/loading, khóa đóng/sửa lúc pending và lỗi phục hồi giữ nguyên input.',
  'anchors': [('apps/web/src/components/BillingView.tsx', 'const paymentPending = useRef(false)')],
  'evidence': ['audit/fixes/W-S-005/evidence.json', 'audit/raw/re-audit/billing/green.txt', 'audit/raw/re-audit/web-conditional-forms/tests.txt'],
  'limit': '4 fixture async component thật; không tạo thanh toán. Chỉ phần P1 thanh toán được duyệt; các action phi tài chính còn là việc P2 ngoài phạm vi.'},
 'W-S-016': {
  'change': 'Theo dõi ready/unavailable/forbidden của Holds/Gate Pass từng visit; giữ dữ liệu stale khi lỗi tạm thời, xóa dữ liệu khi mất quyền; cảnh báo/retry và màu bãi chưa kiểm tra.',
  'anchors': [('apps/web/src/services/visit-safety-data.ts', 'export function'), ('apps/web/src/components/CriticalDataNotice.tsx', 'export function'), ('apps/web/src/context/AppContext.tsx', 'visitSafetyStatus')],
  'evidence': ['audit/raw/re-audit/web-safety/independent-review-tests.txt', 'audit/raw/re-audit/web-safety/independent-review.md'],
  'limit': 'Fixture GET lỗi trang sau, 403, thiếu status, stale, empty thật và retry đã chạy. Không ép lỗi backend thật. Manifest/Role/Handover detail phi an toàn vẫn là việc P2 ngoài phạm vi.'},
 'M-001': {
  'change': 'Nâng minima vùng chạm thành 48dp; header xuống hàng ở màn hẹp, nhãn Gate-in/out co và wrap trong vùng chạm.',
  'anchors': [('apps/mobile/src/components/AppHeader.tsx', 'minHeight: 48'), ('apps/mobile/src/components/PrimaryButton.tsx', 'minHeight: 48')],
  'evidence': ['audit/raw/re-audit/mobile/hit-area-measurements.json', 'audit/raw/re-audit/mobile/measurements-independent-verification.json', 'audit/screenshots/re-audit/mobile/26-320-gate-light.png'],
  'limit': '352 mẫu XML: 331 vùng đầy đủ đạt ≥48dp, 21 mẫu bị cắt mép viewport loại khỏi phép kết luận kích thước. Android thường và 320dp/font150%; chưa có iOS.'},
 'M-002': {
  'change': 'Tách màu chữ semantic, màu fill và chữ trên fill; tăng contrast success/warning và xác nhận đăng xuất cho sáng/tối.',
  'anchors': [('apps/mobile/src/theme/colors.ts', 'successText')],
  'evidence': ['audit/raw/re-audit/mobile/contrast-measurements.json', 'audit/raw/re-audit/mobile/measurements-independent-verification.json', 'audit/screenshots/re-audit/mobile/06-logout-dark.png'],
  'limit': '9 cặp màu chữ native có RGB pixel thực tế đạt ≥4.5:1. Kết quả chỉ áp dụng các cặp đã đo, không chứng nhận toàn bộ màu của app.'},
 'M-003': {
  'change': 'Phiên không có tab được phép có hành động mở Tài khoản để yêu cầu quyền và dùng luồng đăng xuất hiện có.',
  'anchors': [('apps/mobile/src/navigation/MainTabNavigator.tsx', 'onOpenAccount'), ('apps/mobile/src/components/ForbiddenScreen.tsx', 'onOpenAccount')],
  'evidence': ['audit/fixes/mobile/fix-log.json', 'audit/raw/re-audit/mobile-tests-final.txt', 'audit/raw/re-audit/mobile/independent-source-review.md'],
  'limit': 'Điều hướng zero-tab và hủy/xác nhận đăng xuất được kiểm bằng fixture. Native zero-tab UNKNOWN vì không có tài khoản tương ứng; native ADMIN chỉ mở/hủy đăng xuất, không đăng xuất thật.'}
}

# Find archived source matching each original hash; do not cite moved historical lines as current.
baseline_hashes = {x['path']: x['sha256'] for x in read('audit/raw/baseline/source-hashes.json')}
snapshots = {}
for p in (AUDIT / 'fixes').rglob('*'):
    if p.is_file() and 'before' in p.parts and p.suffix in ['.tsx', '.ts', '.cjs']:
        snapshots.setdefault(digest(p), p)

for f in findings_doc['findings']:
    f['baseline_evidence'] = copy.deepcopy(f.get('evidence', []))
    located = []
    for ev in f.get('evidence', []):
        ev = copy.deepcopy(ev)
        source = ROOT / ev['file']
        sha = baseline_hashes.get(ev['file'])
        if source.exists() and sha and digest(source) != sha:
            old = snapshots.get(sha)
            if old:
                old_lines = old.read_text(encoding='utf-8-sig').splitlines()
                new_lines = source.read_text(encoding='utf-8-sig').splitlines()
                mapped = None
                for a, b, size in difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_matching_blocks():
                    if a <= ev['line'] - 1 < a + size:
                        mapped = b + ev['line'] - a
                        break
                if mapped:
                    ev['baseline_line'] = ev['line']; ev['line'] = mapped
                    ev['location_status'] = 'UNCHANGED_LINE_REMAPPED_NOT_BEHAVIOR_REVERIFIED'
                else:
                    ev['file'] = old.relative_to(ROOT).as_posix()
                    ev['location_status'] = 'HISTORICAL_BASELINE_SOURCE_SNAPSHOT'
            else:
                ev['location_status'] = 'BASELINE_LINE_HISTORICAL_NOT_RELOCATED'
        else:
            ev['location_status'] = 'SOURCE_UNCHANGED_FROM_BASELINE'
        located.append(ev)
    f['evidence'] = located
    if f['id'] in fixes:
        info = copy.deepcopy(fixes[f['id']])
        info['source_evidence'] = [anchor(*a) for a in info.pop('anchors')]
        info['verification_status'] = 'VERIFIED_IN_APPROVED_SCOPE'
        f['status'] = 'VERIFIED'
        f['re_audit'] = info
        f['runtime_status'] = 'SEE_RE_AUDIT_METHOD_AND_LIMITATIONS'
    else:
        f['status'] = 'OPEN'
        f['re_audit'] = {'verification_status': 'BASELINE_FINDING_CARRIED_FORWARD', 'note': 'Không tự sửa P2/P3; không mặc định mọi trạng thái đã được re-test.'}
findings_doc['scope'] = 'Re-audit 01; approved P0/P1 scope, historical baseline evidence preserved'
findings_doc['approved_fix_ids'] = approved
findings_doc['residual_subtasks'] = [
 {'parent_id': 'W-S-005', 'priority': 'P2', 'status': 'OPEN_NOT_APPROVED', 'scope': 'Pending guards for non-financial actions from the original broad finding'},
 {'parent_id': 'W-S-016', 'priority': 'P2', 'status': 'OPEN_NOT_APPROVED', 'scope': 'Noncritical Manifest/Role/Handover nested-detail availability from the original broad finding'}
]
write('audit/raw/re-audit/findings.json', findings_doc)

for promotion in proposal['observation_promotions']:
    obs = next(x for x in scores['observations'] if x['id'] == promotion['id'])
    assert obs['status'] == promotion['from']
    obs['baseline_status'] = obs['status']; obs['status'] = 'PASS'
    obs['note'] += ' — Re-audit: verified approved fix scope; see evidence/method limits.'
    obs['re_audit_finding_ids'] = promotion['finding_ids']
    obs['re_audit_evidence'] = [p for fid in promotion['finding_ids'] for p in fixes[fid]['evidence']]

for platform, data in scores['platforms'].items():
    for dim in data['ux_gap']['dimensions']:
        for c in dim['criteria']:
            samples = [o for o in scores['observations'] if o['id'] in c['observation_ids']]
            counts = {s: sum(o['status'] == s for o in samples) for s in ['PASS', 'FAIL', 'UNKNOWN']}
            c['counts'] = counts
            n = sum(counts.values())
            c['min'] = counts['PASS'] / n if n else None
            c['max'] = (counts['PASS'] + counts['UNKNOWN']) / n if n else None
        applicable = [c for c in dim['criteria'] if c['applicable']]
        weight = sum(c['weight'] for c in applicable)
        for bound in ['min', 'max']:
            dim[bound] = 25 * sum(c['weight'] * c[bound] for c in applicable) / weight
    for bound in ['min', 'max']:
        data['ux_gap'][bound] = sum(d[bound] for d in data['ux_gap']['dimensions'])
    for h in data['nielsen']['heuristics']:
        h['baseline_finding_ids'] = h['finding_ids'][:]
        h['finding_ids'] = [i for i in h['finding_ids'] if i not in approved]
        h['verified_max_severity'] = max([{'P0':4,'P1':3,'P2':2,'P3':1}[next(f for f in findings_doc['findings'] if f['id']==i)['severity']] for i in h['finding_ids']], default=0)
    data['nielsen']['observed'] = 100 - 2.5 * sum(h['verified_max_severity'] for h in data['nielsen']['heuristics'])
    data['nielsen']['max'] = data['nielsen']['observed']
    data['nielsen']['min'] = 100 - 2.5 * sum(h['possible_max_severity'] for h in data['nielsen']['heuristics'])
scores['baseline_comparison'] = {p: {'ux_gap': base_scores['platforms'][p]['ux_gap'], 'nielsen': base_scores['platforms'][p]['nielsen']} for p in ['web','mobile']}
scores['re_audit_policy'] = 'Only nine evidenced FAIL-to-PASS observation promotions; original IDs, weights, denominators, UNKNOWN/N/A unchanged. Native adaptation and Nielsen project conversion unchanged.'
write('audit/raw/re-audit/scores.json', scores)

fresh_web = []
for p in (OUT / 'web').glob('*-measure.json'):
    stem = p.name.removesuffix('-measure.json')
    if stem.rsplit('-',1)[-1] in ['1440','768','375']:
        screen, width = stem.rsplit('-',1)
        fresh_web.append({'platform':'web', 'screen':screen, 'role':'ADMIN', 'theme':'current', 'viewport':int(width), 'state':'settled screen', 'status':'PASS', 'meaning':'Reachable/measured only; not a blanket UX pass', 'evidence':[p.relative_to(ROOT).as_posix(), f'audit/screenshots/re-audit/web/{stem}.jpg']})
for row in coverage['cases']:
    row['baseline_status'] = row['status']
    if row.get('status') == 'N/A':
        row['re_audit_status'] = 'N/A'
        row['verification_mode'] = 'UNCHANGED_APPLICABILITY'
        continue
    matching = next((x for x in fresh_web if all(x.get(k)==row.get(k) for k in ['platform','screen','role','theme','viewport'])), None)
    if matching:
        row['re_audit_status'] = matching['status']; row['verification_mode'] = 'FRESH_BROWSER_MEASURE'
        row['re_audit_evidence'] = matching['evidence']
    else:
        row['re_audit_status'] = 'NOT_RETESTED'
        row['verification_mode'] = 'CARRIED_BASELINE_NOT_RETESTED'
        row['note'] = 'Historical status remains visible; not a fresh PASS claim.'
native = read('audit/raw/re-audit/mobile/hit-area-measurements.json')['results']
fresh_native = [{'platform':'mobile','capture':x['capture'],'viewport_dp':x['width_dp'],'density_dpi':x['density_dpi'],'font_scale':x['font_scale'],'status':x['status'],
                 'meaning':'Recorded clickable geometry sample, not whole-screen UX pass',
                 'evidence':[f"audit/raw/re-audit/mobile/{x['capture']}.xml",f"audit/screenshots/re-audit/mobile/{x['capture']}.png"]} for x in native]
coverage['re_audit_cases'] = fresh_web + fresh_native
coverage['re_audit_case_summary'] = {'fresh_web_main_screens':len(fresh_web),'fresh_native_captures':len(fresh_native),'baseline_rows':len(coverage['cases']),
  'baseline_row_re_audit_status_counts':dict(Counter(x['re_audit_status'] for x in coverage['cases']))}
coverage['unknown_update'] = 'Original UNKNOWN scope retained. Async/no-tab/conditional-dialog fixtures now verify specified source behavior, but do not establish corresponding live runtime or business outcomes.'
write('audit/raw/re-audit/coverage.json', coverage)

lint = read('audit/raw/re-audit/eslint.json')
integrity = read('audit/raw/re-audit/source-integrity.json')
lh = read('audit/raw/re-audit/web/lighthouse-summary.json')
manifest = {
 'schema_version':1, 'date':'2026-10-03','timezone':'Asia/Saigon','generated_at':datetime.now().astimezone().isoformat(),
 'phase':'5–6', 'approved_fix_ids':approved, 'approval_source':'User continuation following concrete nine-finding priority review in this chat',
 'application_changes':'Approved UI fixes only; preserve user changes; no business writes/backend/schema/dependency changes',
 'baseline_file_hashes':baseline_preserved, 'baseline_report':'audit/2026-10-03-report.md', 'report':REPORT.relative_to(ROOT).as_posix(),
 'source_integrity':integrity, 'lighthouse_scope':lh['scope'],
 'tests':{'web':54,'mobile':132,'approved_fixture_suite':57,'failures':0},
 'lint':{'status':'FAIL','errors':sum(x['errorCount'] for x in lint),'warnings':sum(x['warningCount'] for x in lint),'baseline_errors':291,'baseline_warnings':3},
 'observations_policy':'Original denominator unchanged; nine supported promotions only',
 'unknowns':coverage['unknowns']
}
manifest['new_source_files'] = read('audit/raw/re-audit/new-source-files.json') if (OUT/'new-source-files.json').exists() else None
write('audit/raw/re-audit/manifest.json', manifest)

verified = [f for f in findings_doc['findings'] if f['status']=='VERIFIED']
opened = [f for f in findings_doc['findings'] if f['status']=='OPEN']
fmt = lambda n: f'{n:.1f}'
sections = []
def add(s=''): sections.append(s)
add('# ICD — Báo cáo re-audit UI/UX 01 · 03/10/2026\n')
add('## Executive summary\n')
add('Đã xử lý và xác minh **1 P0 + 8 P1** trong phạm vi được duyệt. Giữ UI, bố cục và contract nghiệp vụ hiện có. Các bằng chứng gồm thao tác browser, Android Expo Go/ADB, phép đo DOM/XML/pixel và fixture component thật; từng giới hạn được ghi riêng. Không tạo giao dịch, tài khoản hoặc thay quyền trên backend.\n')
add('**29 finding P2/P3 từ baseline vẫn OPEN (26 P2, 3 P3)**; thêm hai phần việc P2 còn lại trong finding tổng hợp W-S-005/W-S-016, không tính là lỗi mới. M-005 có cải thiện header/Gate-in khi sửa vùng chạm, nhưng nhãn tab ở 320dp còn rút gọn; không đóng finding hoặc tự tăng điểm cho P2.\n')
add('**Chưa đủ bằng chứng để kết luận sẵn sàng ship toàn bộ sản phẩm.** Không còn P0/P1 đã xác minh trong phần sửa được duyệt; ESLint còn FAIL, các role khác ADMIN, iOS, TalkBack/VoiceOver, keyboard RN và giao dịch thực tế vẫn chưa xác minh đầy đủ. Điểm dưới đây không phải chứng nhận WCAG.\n')
add(f'Baseline giữ nguyên: {link("audit/2026-10-03-report.md", "Báo cáo trước sửa")}. Dữ liệu tái lập: {link("audit/raw/re-audit/manifest.json", "manifest")}, {link("audit/raw/re-audit/findings.json", "findings")}, {link("audit/raw/re-audit/scores.json", "scores")}, {link("audit/raw/re-audit/coverage.json", "coverage")}.\n')
add('## Điểm số trước và sau\n')
add('| Nền tảng | UX Gap baseline | UX Gap re-audit | Tăng điểm tối thiểu | Nielsen baseline → re-audit | Coverage observation |\n|---|---:|---:|---:|---:|---:|')
for p in ['web','mobile']:
    b=base_scores['platforms'][p]; n=scores['platforms'][p]
    add(f"| {p} | {fmt(b['ux_gap']['min'])}–{fmt(b['ux_gap']['max'])} | **{fmt(n['ux_gap']['min'])}–{fmt(n['ux_gap']['max'])}** | +{fmt(n['ux_gap']['min']-b['ux_gap']['min'])} | {fmt(b['nielsen']['observed'])} → **{fmt(n['nielsen']['observed'])}** | {n['ux_gap']['observed_coverage']:.0%} |")
add('\nUX Gap: đầu khoảng là điểm tối thiểu có bằng chứng; cuối khoảng giả sử UNKNOWN đạt. Giữ nguyên observation ID, trọng số, mẫu số và N/A. Chỉ 9 observation FAIL → PASS có evidence mới được đổi. Không thêm điểm cho số màn vừa chụp. Mobile dùng adaptation native của baseline.\n')
add('| Dimension / tối đa 25 | Web trước → sau | Mobile trước → sau |\n|---|---:|---:|')
for i in range(4):
    w=base_scores['platforms']['web']['ux_gap']['dimensions'][i]; wn=scores['platforms']['web']['ux_gap']['dimensions'][i]
    m=base_scores['platforms']['mobile']['ux_gap']['dimensions'][i]; mn=scores['platforms']['mobile']['ux_gap']['dimensions'][i]
    add(f"| {w['name']} | {fmt(w['min'])}–{fmt(w['max'])} → {fmt(wn['min'])}–{fmt(wn['max'])} | {fmt(m['min'])}–{fmt(m['max'])} → {fmt(mn['min'])}–{fmt(mn['max'])} |")
add('\nNielsen: severity 0–4, lấy mức cao nhất còn OPEN của từng heuristic; điểm quy đổi dự án = 100 − 2.5 × tổng severity. Đây không phải thang điểm 0–100 chính thức của Nielsen. Khoảng bất định giữ **web 0–55, mobile 0–60** vì các scope UNKNOWN chưa kiểm.\n')
add('| Heuristic | Web severity trước → sau | Mobile severity trước → sau |\n|---|---:|---:|')
for i in range(10):
    w=base_scores['platforms']['web']['nielsen']['heuristics'][i]; wn=scores['platforms']['web']['nielsen']['heuristics'][i]
    m=base_scores['platforms']['mobile']['nielsen']['heuristics'][i]; mn=scores['platforms']['mobile']['nielsen']['heuristics'][i]
    add(f"| {w['id']} — {w['name']} | {w['verified_max_severity']} → {wn['verified_max_severity']} | {m['verified_max_severity']} → {mn['verified_max_severity']} |")
add('\n## Finding P0/P1 đã sửa\n')
add('| ID / severity | Category | Thay đổi và cách xác minh | Evidence source sau sửa | Giới hạn |\n|---|---|---|---|---|')
for f in sorted(verified,key=lambda f:(f['severity'],f['id'])):
    d=f['re_audit']; ev=d['source_evidence'][0]
    proof=link(d['evidence'][0],'bằng chứng')
    add(f"| {f['id']} / {f['severity']} VERIFIED | {f['category']} | {clean(d['change'])} {proof} | {link(ev['file'],ev['file'].split('/')[-1],ev['line'])} | {clean(d['limit'])} |")
add('\n### Kiểm chứng có thể tái lập\n')
add(f'- Web: 18 màn × 3 viewport (1440/768/375) = **54 capture/measurement mới**; các selector Enter/Space và dialog có log riêng: {link("audit/raw/re-audit/web/keyboard-selectors.json", "5 selector")}, {link("audit/raw/re-audit/web/modal-keyboard-checks.json", "modal keyboard")}. Log modal giữ cả lần phát hiện trap lỗi và lần chạy đạt sau sửa; chỉ kết quả cuối được dùng đóng lỗi.')
add(f'- 15 overlay đã tích hợp; 12 loại mở được trực tiếp. 9 fixture component thật kiểm 37 field có điều kiện và luồng Escape/focus: {link("audit/raw/re-audit/web-conditional-forms/review.md", "review độc lập")}.')
add(f'- Android: **36 capture** sáng/tối, thường và 320dp/font150%. **331/331 mẫu vùng đầy đủ đạt ≥48dp; 21/352 mẫu bị cắt viewport loại khỏi kết luận**, không giả sử chúng đạt: {link("audit/raw/re-audit/mobile/measurements-independent-verification.json", "phép đo độc lập")}. Không thấy overlap trong các mẫu đã đo.')
add('- Contrast native đo pixel thực: success sáng **3.58 → 5.21:1**, warning sáng **3.07 → 6.84:1**, logout tối **2.69 → 6.29:1**. 9 cặp đã đo đạt 4.5:1; color foreground/fill được kiểm đúng pixel ảnh.')
add(f'- Lỗi GET-critical: fixture phân biệt empty thật với unavailable/forbidden, không mất stale rows khi lỗi tạm thời, không giữ dữ liệu khi 403, và không hiển thị bãi xanh/no-Hold khi thiếu status: {link("audit/raw/re-audit/web-safety/independent-review.md", "review độc lập")}.')
add(f'- Diff từng ID: {link("audit/fixes", "thư mục fixes")}; snapshot before/after và inventory giữ nguyên. Diff ở file dùng chung có ghi phần giao nhau của các finding được duyệt. Các snippet đề xuất gốc vẫn nằm trong báo cáo baseline và findings JSON.\n')
add('### Ví dụ thay đổi tối thiểu\n')
add('```tsx\n// JSON đã redacted; không đưa object trực tiếp vào React child.\n<pre>{formatRedactedLogBody(selectedLog.requestBodyRedacted)}</pre>\n\n// Giữ semantics chuẩn và nhãn rõ ràng.\n<label htmlFor="truck-plate">Biển số xe</label>\n<input id="truck-plate" />\n<button type="button" aria-pressed={selected} onClick={selectRecord}>\n  {recordLabel}\n</button>\n```\n')
add('## Backlog P2/P3 — toàn bộ finding chưa đóng\n')
add('Các mục dưới đây giữ severity gốc, không tự áp dụng fix. Evidence source có thể là dòng hiện tại không đổi hoặc snapshot baseline khi dòng đã sửa trong fix P1; đây là nơi tái hiện gốc, không phải khẳng định mọi trạng thái đã tái hiện lại. Finding JSON lưu location_status và baseline_evidence để phân biệt.\n')
add('| ID / severity | Platform / category | Vấn đề | Evidence file:line | Fix đề xuất / verify |\n|---|---|---|---|---|')
for f in sorted(opened,key=lambda f:(f['severity'],f['id'])):
    e=f['evidence'][0]; fx=f.get('recommendedFix') or f.get('law_diagnosis',{}).get('change') or f.get('fix_proposal') or f.get('fix',{}).get('snippet') or f.get('fixSnippet','')
    # Full code and acceptance criteria are retained in JSON/baseline; table gives actionable first sentence.
    short=fx.split('\n')[0][:180]
    title=f.get('title_vi',f['title'])
    add(f"| {f['id']} / {f['severity']} OPEN | {f.get('platform','web')} / {f['category']} | {clean(title)} | {link(e['file'],e['file'].split('/')[-1],e['line'])} | {clean(short)}; {link('audit/raw/re-audit/findings.json','code mẫu và tiêu chí verify')} |")
add('\n### Phần việc còn lại trong hai finding tổng hợp\n')
add('- **W-S-005/P2:** pending guard các action phi tài chính (Truck/EDI/khác) chưa sửa; phần thanh toán P1 đã verify. Dùng handler gốc và fixture deferred Promise để kiểm lần gửi lặp.')
add('- **W-S-016/P2:** availability của Manifest bills, Role detail, Handover detail chưa sửa; Holds/Gate Pass P1 đã verify. Reject từng GET trong fixture và yêu cầu hiển thị partial/unavailable thay vì im lặng. Các phần này nằm trong finding gốc, không được cộng thành 2 finding mới.\n')
add('### Top 10 đề xuất cho lượt tiếp theo\n')
priority=['W-S-011','W-S-012','W-S-013','W-S-004','W-S-006','W-S-008','W-R-001','W-R-002','M-007','M-012']
add('| Thứ tự | Finding | Lý do / thao tác verify |\n|---:|---|---|')
reasons=['Sai giờ hết hạn ảnh hưởng thao tác thực tế; kiểm UTC→giờ Việt Nam quanh nửa đêm.','Shortcut review có thể mở sai đối tượng; fixture đúng handoverId.','Shortcut Truck Visit mất container; kiểm form và context theo containerVisitId.','Mất bản nháp khi API trả lỗi; deferred reject giữ input/modal.','Không xác định lỗi field; kiểm nhãn, inline error, focus và lỗi có hướng sửa.','Trạng thái expired/cancelled gây hiểu sai; fixture từng trạng thái và thời gian.','Chữ hỗ trợ vận hành contrast thấp; đo pixel/DOM ≥4.5:1 và giữ token.','Ô tìm bãi thiếu focus; Tab và screenshot focus-visible.','Seal check còn trường damage severity; fixture từng loại giám định.','Thông báo thiếu field không xóa khi nhập đủ; đổi field và kiểm message.']
for i,(fid,reason) in enumerate(zip(priority,reasons),1): add(f'| {i} | {fid} / P2 | {reason} |')
add('\n## Kết quả công cụ và performance\n')
add('| Kiểm tra | Kết quả | Raw output |\n|---|---|---|')
for name,value,p in [
 ('Web source tests','54/54 PASS','audit/raw/re-audit/web-tests-final.txt'),
 ('Mobile tests','132/132 PASS','audit/raw/re-audit/mobile-tests-final.txt'),
 ('Approved fix fixtures','57/57 PASS; gồm source/React component/async regressions','audit/raw/re-audit/approved-fix-fixtures-final.txt'),
 ('Web build + TypeScript','PASS; vẫn có cảnh báo chunk >500kB','audit/raw/re-audit/web-semantics/build-final.txt'),
 ('Mobile typecheck','PASS','audit/raw/re-audit/mobile-typecheck-final.txt'),
 ('ESLint',f"FAIL: {manifest['lint']['errors']} errors / {manifest['lint']['warnings']} warnings (baseline291/3)",'audit/raw/re-audit/eslint.json'),
 ('kz browser checks','108 lần EXECUTED = layout+table ×54 màn; không đồng nghĩa tất cả PASS. 6 check gốc khác NOT_RUN_INCOMPATIBLE với evaluate read-only.','audit/raw/re-audit/web/kz-browser-checks.json'),
 ('frontend-law-auditor','38.42 không đổi; diagnostic MasterData partial evidence, không thay rubric UX Gap/Nielsen','audit/raw/re-audit/web/law-report.json'),
 ('Color4 rendered web','5248 samples:4142PASS/333FAIL/770UNKNOWN/3EXEMPT; FAIL mẫu lặp/candidate, không phải333finding. W-R-001 vẫn OPEN.','audit/raw/re-audit/web/contrast-color4-results.json'),
 ('Console cuối browser','0 error entries trong tab audit','audit/raw/re-audit/web/console-errors-final.json'),
 ('Scope integrity',f"PASS: {len(integrity['changed'])}/200 file baseline đổi; không đổi config/backend/shared contract được bảo vệ",'audit/raw/re-audit/source-integrity.json')]:
    add(f'| {name} | {value} | {link(p,"log")} |')
add('\nLighthouse production Login: 3 lượt cùng phiên bản/cấu hình baseline; LCP median **1810ms** (1807–1826), CLS **0**, TBT median **10ms** (4–12.5), performance **98**, accessibility **100**. Baseline LCP1808ms/TBT10.5ms/performance99: chênh nhỏ trong mẫu lab, không suy diễn cải thiện/thoái lui có ý nghĩa. **TBT không phải INP.** Accessibility100 chỉ cho Login và audit được chọn, không áp dụng toàn bộ màn đã đăng nhập.\n')
add(f'Báo cáo/raw Lighthouse: {link("audit/raw/re-audit/web/lighthouse-summary.json","summary")}. Không có field CWV, INP thực tế hoặc performance authenticated.\n')
add('## Coverage và UNKNOWN\n')
add(f"Giữ {len(coverage['cases'])} hàng coverage baseline. {len(fresh_web)} hàng màn web có phép đo mới; các hàng không chạy lại được ghi NOT_RETESTED. 36 native capture được thêm riêng với hình/XML/density/font scale; không tự ánh xạ ảnh này thành PASS cho toàn bộ luồng native. PASS ở coverage chỉ có nghĩa màn được mở/đo, không phải mọi yêu cầu UX đạt.\n")
add('| ID | Scope | Cách xác minh tiếp |\n|---|---|---|')
for u in coverage['unknowns']:
    add(f"| {u['id']} | {clean(u['state'])} | {clean(u['reason'])} |")
add('\nFixture mới đã làm rõ một số lỗi pending/GET/no-tab; không thay bằng chứng giao dịch hoặc vai trò native thực tế. Web không có theme thứ hai nên theme switch N/A. iOS/HIG giữ UNKNOWN, không suy diễn từ Android.\n')
add('## Kế hoạch fix → verify → re-audit tiếp theo\n')
add('- [x] Phase0–4: baseline, tool manifest, source snapshot, coverage, rubric và báo cáo gốc đã lưu.')
add('- [x] Phase5: sửa 9 ID P0/P1 được duyệt; diff, RED/GREEN, acceptance và review độc lập đã lưu.')
add('- [x] Phase6: chạy lại các scan tương thích, kiểm phần đã sửa, đo trước/sau và tính lại rubric cùng mẫu số.')
add('- [x] Khôi phục emulator density420/font1.0/theme sáng; camera granted như baseline; không đổi quyền location. Browser reset viewport, đóng tab22 riêng, bảo toàn9 tab của người dùng.')
add('- [ ] Trước quyết định phát hành: kiểm các UNKNOWN thiết yếu bằng tài khoản role được cấp, TalkBack/iOS thực tế, giao dịch ở môi trường test và backend lỗi có kiểm soát.')
add('- [ ] Lượt P2: chọn ID cụ thể trong Top10 cùng hai residual subtask; tái hiện trước sửa, fix nhỏ theo thiết kế có sẵn, xuất diff, chạy acceptance; chưa tự áp dụng trong lượt này.')
add('- [ ] Xử lý ESLint tồn tại theo phạm vi riêng; không dùng score để bỏ qua lỗi kiểm tra.')
add('- [ ] Re-audit lần02 giữ ID/criterion/weights/tool versions; ghi resolved/persistent/new/reopened, không ghi đè baseline hoặc báo cáo01.\n')
add('### Commands đã dùng / có thể chạy lại\n')
add('```powershell\n# Chạy từ root monorepo. Lint đang FAIL như bảng kết quả.\npnpm --filter @icd/web build\npnpm --filter @icd/mobile typecheck\npnpm --filter @icd/mobile test\npnpm exec eslint apps/web/src apps/mobile/src --format json\n$webTestFiles = @(rg --files apps/web/src -g "*.test.ts" -g "*.test.tsx")\nnode --test --import tsx @webTestFiles\n$fixTestFiles = @(\n  "audit/tools/partner-log-regression.test.mjs",\n  "audit/tools/safety-data-regression.test.mjs",\n  "audit/tools/safety-independent-review.test.mjs",\n  "audit/tools/conditional-forms-independent-review.test.mjs",\n  "audit/tools/runtime/web-semantics.test.mjs",\n  "audit/tools/runtime/modal-overlay.test.mjs",\n  "audit/raw/re-audit/billing/billing-payment.test.cjs"\n)\nnode --test @fixTestFiles\nnode audit/tools/convert-web-reaudit-measurements.mjs\npython -X utf8 audit/tools/verify-reaudit-measurements.py\npython -X utf8 audit/tools/finalize-reaudit.py\npython -X utf8 audit/tools/verify-reaudit-artifacts.py\n```\n')
add('## Phụ lục bằng chứng\n')
add(f'- {link("audit/raw/re-audit","Toàn bộ raw re-audit")} · {link("audit/screenshots/re-audit","Screenshot gallery files")} · {link("audit/fixes/mobile/fix-log.json","Mobile fix log")}')
add(f'- {link("audit/raw/re-audit/web-safety/independent-review.md","Web safety review")} · {link("audit/raw/re-audit/mobile/independent-source-review.md","Mobile review")}')
add(f'- {link("audit/raw/re-audit/web/browser-restored.json","Browser restore")} · {link("audit/raw/re-audit/mobile/device-restored.json","Emulator restore")}\n')
add(f'- {link("audit/raw/re-audit/artifact-verification.json","Kiểm tra artifact cuối")}: đối chiếu ID, phép tính rubric, hash baseline/source, log test, ảnh/XML và đường dẫn báo cáo. File lưu số check và PASS/FAIL thực tế.\n')
add('JSON log hiển thị được và còn đầy đủ shell sau sửa:\n')
add(f'![Partner API log sau sửa](<{(ROOT / "audit/screenshots/re-audit/web/partner-api-logs-fixed.jpg").as_posix()}>)\n')
add('Android 320dp/font150%, vùng chạm sau sửa; nhãn tab rút gọn là P2 chưa đóng:\n')
add(f'![Android 320dp sau sửa](<{(ROOT / "audit/screenshots/re-audit/mobile/26-320-gate-light.png").as_posix()}>)\n')
add('## Next action\n')
add('Dùng báo cáo này để quyết định phạm vi kiểm các UNKNOWN thiết yếu trước phát hành. Backlog P2/P3 và hai residual subtask đã có ưu tiên cùng tiêu chí verify; chưa có thay đổi code cho chúng.\n')
REPORT.write_text('\n'.join(sections), encoding='utf-8')
assert {p:digest(ROOT/p) for p in baseline_files} == baseline_preserved, 'Baseline was changed'
print(json.dumps({'report':str(REPORT),'verified':len(verified),'open':len(opened),'scores':{p:{'ux_gap':scores['platforms'][p]['ux_gap']['min'],'nielsen':scores['platforms'][p]['nielsen']['observed']} for p in ['web','mobile']}},ensure_ascii=False))
