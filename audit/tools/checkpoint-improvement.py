"""Reproducible progress report. Never modifies historical audit or application code."""
import copy
import difflib
import hashlib
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / 'audit/runs/2026-10-03-improvement-02'
REL = RUN.relative_to(ROOT).as_posix()
NOW = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat()
REPORT = ROOT / f'audit/{NOW[:10]}-report.md'
if REPORT.exists():
    report_number = 1
    while (ROOT / f'audit/{NOW[:10]}-reaudit-{report_number:02d}-report.md').exists():
        report_number += 1
    REPORT = ROOT / f'audit/{NOW[:10]}-reaudit-{report_number:02d}-report.md'

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))

def save(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def link(path, text=None, line=None):
    target = (ROOT / path).as_posix() + (f':{line}' if line else '')
    return f'[{text or path}](<{target}>)'

def anchor(file, needle):
    source = ROOT / file
    lines = source.read_text(encoding='utf-8-sig').splitlines()
    matches = [(i, s) for i, s in enumerate(lines, 1) if needle in s]
    if not matches:
        raise ValueError(f'Missing anchor: {file}: {needle}')
    line = matches[0][0]
    return {'file': file, 'line': line, 'detail': needle,
            'snippet': '\n'.join(lines[line - 1:line + 3])}

protected = ['audit/2026-10-03-report.md', 'audit/2026-10-03-reaudit-01-report.md', 'audit/2026-10-03-reaudit-02-report.md',
             'audit/findings.json', 'audit/scores.json', 'audit/coverage.json',
             'audit/manifest.json', 'audit/rubric-observations.json']
before = {p: sha(ROOT / p) for p in protected}
for old_report in (ROOT/'audit').glob('*-report.md'):
    before.setdefault(old_report.relative_to(ROOT).as_posix(), sha(old_report))
base = read(REL + '/baseline-findings.json')
base_scores = read(REL + '/baseline-scores.json')
findings = copy.deepcopy(base)
scores = copy.deepcopy(base_scores)

# Evidence is component/API/browser scoped. It never stands in for native device verification.
spec = {
 'W-R-001': ('Semantic supporting-text colors; measured contrast on72 screen/width cases.', 'apps/web/src/index.css', '--icd-text-secondary', ['raw/contrast-after.json'], 'Computed Color4/ancestor alpha; opacity, images and obscured pixels remain separately scoped.'),
 'W-R-002': ('Keyboard-visible search focus outline restored on yard map.', 'apps/web/src/components/yard/YardSiteMap.tsx', 'Tìm vị trí hoặc container', ['raw/browser/yard-search-focus-final.json'], 'Actual native browser Tab: solid2px outline, focus-visible true; see screenshot.'),
 'W-R-003': ('Repeated arbitrary metadata sizes replaced with named typography roles.', 'apps/web/src/index.css', '--text-caption:', ['raw/web-source-tests-final.txt'], 'Source criterion; complete font/spacing matrix still pending.'),
 'W-R-004': ('Heading line-height set to1.25 within the agreed1.1–1.3 range.', 'apps/web/src/index.css', 'h1, h2, h3', ['raw/browser/axe-dashboard-final.json'], 'CSS and sampled computed headings; no claim all content role exceptions are audited.'),
 'W-S-004': ('Await guarded commands; failed save keeps input and dialog; distinguish saved/refresh failure.', 'apps/web/src/components/useCommandAction.tsx', 'export function', ['raw/web-fixtures-final.txt','raw/browser/master-data-save-persisted-375.json','raw/browser/master-data-conflict-retains-draft-375.json'], 'Actual components in deferred/rejected fixtures plus real browser duplicate/save evidence.'),
 'W-S-006': ('Field-associated validation and focus to first invalid control.', 'apps/web/src/components/useFormValidation.tsx', 'export function', ['raw/web-fixtures-final.txt','raw/browser/axe-master-validation-final.json'], 'Fixture and native browser validation; actual screen-reader announcements pending.'),
 'W-S-007': ('Selection exposes aria-pressed and native checked state.', 'apps/web/src/components/UsersRolesView.tsx', 'aria-pressed', ['raw/web-old-regressions-final.txt'], 'Actual component semantics; keyboard selection rechecked in retained regression suite.'),
 'W-S-008': ('Canonical status/expiry helper and deadline-triggered updates; unknown state fails closed.', 'apps/web/src/components/useGatePassExpiry.ts', 'export function', ['raw/web-fixtures-final.txt','raw/web-business/independent-green.txt'], 'Expired/cancelled/used/boundary and refreshed-expired fixtures; Android scan pending.'),
 'W-S-009': ('Token-bearing react-qr-code replaces decorative icon in Container360.', 'apps/web/src/components/ContainersView.tsx', '<QRCode', ['raw/web-fixtures-final.txt','raw/browser/qr-runtime-decode.json','raw/browser/qr-runtime-backend.json'], 'Real backend-ready synthetic lifecycle, real Container360 QR screenshot; OpenCV decoded value SHA256 equals backend token. Test pass cancelled afterward; token text is not in the report.'),
 'W-S-010': ('Readiness distinguishes checking/error/unavailable/blocked/ready and rejects incomplete flags.', 'apps/web/src/components/useBackendReadiness.ts', 'export function', ['raw/web-fixtures-final.txt'], 'Deferred old responses cannot enable a newly selected visit; API readiness also tested on isolated DB.'),
 'W-S-011': ('Date-only/timestamp conversion uses Vietnam UTC+7 once, including tariff business dates.', 'apps/web/src/lib/time.ts', 'vietnamBusinessDateToIso', ['raw/tariff-vietnam-date-green.txt','raw/web-source-tests-final.txt'], 'Calendar, timezone and invalid date fixtures; API persisted dates inspected.'),
 'W-S-012': ('Navigation carries visit/handover/pass/truck IDs and explicit action independently.', 'apps/web/src/navigation.ts', 'export function', ['raw/web-source-tests-final.txt','raw/web-fixtures-final.txt'], 'Backend does not currently produce HANDOVER_REVIEW; no invented producer.'),
 'W-S-013': ('Truck Visit shortcut keeps linked container context and opens authorized create form.', 'apps/web/src/components/TruckVisitsView.tsx', 'targetVisitId', ['raw/web-fixtures-final.txt'], 'Actual component fixture; no write on navigation.'),
 'W-S-014': ('Router URL state, user-scoped query state, retained draft and dirty/pending navigation guards.', 'apps/web/src/App.tsx', 'useBlocker', ['raw/browser/navigation-draft-runtime.json','raw/web-fixtures-final.txt'], 'Real browser Back/Forward/cancel/accept, Tab/Shift+Tab/Escape; late logout clears user-scoped views.'),
 'W-S-015': ('Empty, no-match, loading, failure, forbidden and stale states are distinct with recovery.', 'apps/web/src/components/CollectionState.tsx', 'export function CollectionState', ['raw/web-fixtures-final.txt','raw/dashboard-resource-green.txt'], 'Fixture zero/filter/error/403 plus measured main views; broader network matrix pending.'),
 'W-S-017': ('EDI inspector displays canonical payloadSnapshot and separates send state from ACK.', 'apps/web/src/components/EDIView.tsx', 'payloadSnapshot', ['raw/web-fixtures-final.txt','raw/dashboard-edi-green.txt','raw/web-types-api/workflows-completed.json'], 'MOCK external provider; internal outbox, ACK and alert operations persisted; no actual external delivery claimed.'),
 'W-S-018': ('Exact action permissions, command/session boundary checks and read-only notice.', 'apps/web/src/services/write-permissions.ts', 'export function', ['raw/web-all-regressions-final.txt','raw/context-write-permission-green.txt','raw/browser/read-only-containers-final.txt'], 'Seven real UI accounts; custom roles and104 generated routes/102 single-decorator methods independently compared; exact/downgraded permission fixtures and real read-only notice. Full per-overlay role cross-product remains coverage UNKNOWN.'),
 'W-S-019': ('Nonmodal notification panel has Escape, outside click, trigger, explicit close and route cleanup.', 'apps/web/src/components/Header.tsx', 'notificationState', ['raw/browser/notification-dismiss-final.json','raw/header-availability-green.txt'], 'Real browser four dismiss paths; asynchronous mark-read fixtures; unavailable count no longer announces zero.'),
 'M-004': ('Shared touch targets/gaps use48dp/8dp and narrow reflow instead of overlapping hitboxes.', 'apps/mobile/src/theme/layout.ts', 'touchTarget', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'FIXED; requires current Android XML/bounds at320/360/412/768dp before VERIFIED.'),
 'M-005': ('Header/action/tab labels wrap at narrow widths and retain font scaling.', 'apps/mobile/src/navigation/ResponsiveTabBar.tsx', 'export function', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'FIXED; actual native font150/200%, keyboard and safe-area matrix still pending.'),
 'M-006': ('Known business enums and notification templates use Vietnamese labels; custom codes remain honest.', 'apps/mobile/src/presentation/labels.ts', 'export', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Known/custom presentation tested from real source; native list/detail screenshots pending.'),
 'M-007': ('Seal/condition checks omit damage severity; damage surveys retain canonical severity.', 'apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx', 'DAMAGE_SURVEY', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Mode-switch payload fixture; native flow/popup pending.'),
 'M-008': ('Inspection history has separate loading/error/retry and stale response fencing.', 'apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx', 'history', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Delayed/rejected source component fixtures; native slow/offline behavior pending.'),
 'M-009': ('Server unread count is visible and only updated after authoritative mark-read outcomes.', 'apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx', 'unreadCount', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Zero/nonzero/count failures fixtures; native notification integration pending.'),
 'M-010': ('Native date/time picker with explicit Vietnam timezone replaces memorized timestamp input.', 'apps/mobile/src/components/BookingDateField.tsx', 'export function', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Expo-compatible9.1.0 installed; native picker/cancel/timezone not yet exercised this run.'),
 'M-011': ('Persist theme preference, initial system default and bootstrap before app content.', 'apps/mobile/src/theme/ThemeProvider.tsx', 'export function', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Storage/bootstrap fixtures; native cold-launch light/dark screenshots pending.'),
 'M-012': ('Survey errors are per field; validation clears on related edit while server errors remain recoverable.', 'apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx', 'field', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Actual screen source fixture; native focus/keyboard/TalkBack error read pending.'),
 'M-013': ('Shared styles use named typography/spacing/layout tokens and heading-specific line-height.', 'apps/mobile/src/theme/typography.ts', 'sectionHeading', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Static styles and actual rendered heading style fixtures; geometry/reflow still requires native.'),
 'M-014': ('Card/header titles expose accessibilityRole header without duplicate accessible labels.', 'apps/mobile/src/components/ScreenLayout.tsx', 'accessibilityRole="header"', ['raw/mobile-agent/checkpoint-mobile-tests.log'], 'Static/component semantics verified; actual TalkBack traversal and spoken output UNKNOWN.'),
}

def existing(paths):
    return [REL + '/' + p for p in paths if (RUN / p).is_file()]

for f in findings['findings']:
    if f['id'] not in spec:
        prior_anchors={
          'W-S-020':('apps/web/src/services/redacted-log-body.ts','export function'),
          'W-S-001':('apps/web/src/components/ModalOverlay.tsx','export function'),
          'W-S-002':('apps/web/src/components/TruckVisitsView.tsx','htmlFor='),
          'W-S-003':('apps/web/src/components/ManifestsView.tsx','aria-pressed='),
          'W-S-005':('apps/web/src/components/BillingView.tsx','const paymentPending'),
          'W-S-016':('apps/web/src/context/AppContext.tsx','visitSafetyStatus'),
          'M-001':('apps/mobile/src/components/AppHeader.tsx','layout.touchTarget'),
          'M-002':('apps/mobile/src/theme/colors.ts','successText'),
          'M-003':('apps/mobile/src/navigation/MainTabNavigator.tsx','if (!tabs.length)')}
        f['improvement_02'] = {'status': f['status'], 'method':'Prior accepted fix retained; fresh regression suite rechecked.',
          'source_evidence':[anchor(*prior_anchors[f['id']])], 'limitations':f.get('re_audit',{}).get('limit','Prior accepted scope only; current native full matrix pending.'),
          'evidence':existing(['raw/web-old-regressions-final.txt','raw/web-old-billing-final.txt','raw/mobile-agent/checkpoint-mobile-tests.log'])}
        continue
    change, file, needle, evidence, limit = spec[f['id']]
    a = anchor(file, needle)
    mobile = f['id'].startswith('M-')
    # Token/logic changes cannot close the approved native acceptance requirement.
    f['status'] = 'FIXED' if mobile else 'VERIFIED'
    f['improvement_02'] = {'status':f['status'], 'change':change, 'source_evidence':[a],
                           'evidence':existing(evidence), 'limitations':limit,
                           'method':'actual source component regression / guarded API / CUA when explicitly linked',
                           'next_verify': f.get('acceptance_verification', [])}

residual = [
 {'parent_id':'W-S-005','priority':'P2','status':'VERIFIED','scope':'Non-financial command guards and input preservation; deferred/rejected components verified.', 'evidence':existing(['raw/web-fixtures-final.txt'])},
 {'parent_id':'W-S-016','priority':'P2','status':'VERIFIED','scope':'Manifest/Role/Handover detail availability with stale/403 recovery.', 'evidence':existing(['raw/web-old-regressions-final.txt','raw/web-fixtures-final.txt'])}
]
findings['residual_subtasks'] = residual
findings['scope'] = 'Improvement02 checkpoint; approved full remediation; native verification and coverage incomplete.'
findings['generated_at'] = NOW

new_specs = [
 ('M-N-001','P1','mobile','auth','Logout could be undone by a late token refresh or cleanup.', 'apps/mobile/src/services/api/api-client.ts','invalidate', ['raw/mobile-agent/checkpoint-mobile-tests.log'], ['H1','H3','H5','H9'], 'Generation-fenced auth/response acceptance and serialized token/cache cleanup. Source regression PASS; native session transitions pending.'),
 ('M-N-002','P2','mobile','states','Late old cache writes/clears could remove a newer same-user cache.', 'apps/mobile/src/storage/read-cache.ts','generation', ['raw/mobile-cache-checkpoint-green.txt'], ['H1','H9'], 'Partition mutation queue and generation fences; meaningful stale-write race RED/GREEN. Native offline matrix pending.'),
 ('W-N-001','P2','web','states','Forbidden resource reads displayed zero revenue/capacity/unread counts.', 'apps/web/src/components/CollectionState.tsx','export function ResourceContent', ['raw/dashboard-resource-green.txt','raw/header-availability-green.txt'], ['H1','H9'], 'Resource-gated metrics and explicit unavailable/stale notices; actual GATE_STAFF dashboard checked.'),
 ('W-N-002','P1','web','data-contract','Loose DTO/pagination fallbacks invented financial/status/catalog data.', 'apps/web/src/services/api/load-list.ts','export', ['raw/web-source-tests-final.txt','raw/web-types-independent-checkpoint.md'], ['H1','H2','H5'], 'Canonical unknown boundaries, strict pagination, CANCELLED/UNKNOWN/ACK and tariff restrictions preserved; no invented zero or ALL.'),
 ('W-N-003','P1','web','auth','A previous session command closure could write after user switch.', 'apps/web/src/context/AppContext.tsx','commandSession', ['raw/context-write-permission-green.txt','raw/refresh-session-race-green.txt'], ['H3','H5'], 'Current-session and exact backend-derived command permission checks; stale callback emits zero writes.'),
 ('W-N-004','P2','web','authorization','MANAGER/read-only log readers were rejected by unrelated API-key management permission.', 'apps/api/src/modules/partner-handover/controllers/internal/partner-api-log.controller.ts','PARTNER_API_LOG_READ', ['raw/web-types-api/partner-log-access-green.json'], ['H3','H4'], 'Restore documented partner_api_log.read for GET list/detail; client/key writes remain denied.'),
 ('W-N-005','P1','web','safety','String false in canGateOut was truthy and could authorize a gate-out command.', 'apps/web/src/context/AppContext.tsx','scan.canGateOut', ['raw/web-types-independent-checkpoint.md'], ['H1','H5'], 'Require boolean true; false/string/object/missing scan flags issue zero writes.'),
 ('W-N-006','P1','web','financial','parseInt truncated backend-valid fractional payment values.', 'apps/web/src/services/payment-amount.ts','export', ['raw/web-types-independent-checkpoint.md'], ['H2','H5'], 'Finite positive Number, maximum2decimals, input step0.01; preserve12.50 and0.29 without rounding; invalid direct command blocked.'),
 ('W-N-007','P1','web','states','Newly refreshed already-expired pass could reuse stale clock and show QR/exit.', 'apps/web/src/components/useGatePassExpiry.ts','export function', ['raw/web-business/independent-green.txt'], ['H1','H5'], 'Current render clock and deadline timer; refreshed expired pass removes QR/exit; component fixture verified.'),
 ('W-N-008','P2','web','navigation','Opening an existing Gate-out pass also opened an unintended issue form.', 'apps/web/src/components/GatePassView.tsx','targetAction', ['raw/web-business/independent-green.txt'], ['H2','H3'], 'Existing pass takes priority; auto-issue requires explicit create intent and permission.'),
 ('W-N-009','P1','web','authorization','Role editor stayed writable after same-user permission downgrade.', 'apps/web/src/components/UsersRolesView.tsx',"roles.manage", ['raw/web-business/independent-green.txt'], ['H3','H5'], 'Render and command recheck current roles.manage; dropdown/editor cannot issue stale write.'),
 ('W-N-010','P1','web','states','Container detail could close or change context during unresolved Gate Pass creation.', 'apps/web/src/components/ContainersView.tsx','pending={action.pending}', ['raw/web-business/independent-green.txt'], ['H1','H5'], 'Pending detail closes/navigation/context disabled; delayed POST remains visible and single-flight.'),
 ('W-N-011','P2','web','navigation','A collection refresh reopened a dismissed Truck Visit create form and could overwrite its draft.', 'apps/web/src/components/TruckVisitsView.tsx','consumedTarget', ['raw/web-business/independent-green.txt'], ['H3','H6'], 'Consume the target intent after it resolves; unrelated refresh does not reopen; initially missing target may resolve later.'),
 ('W-N-012','P1','web','navigation','URL Bàn giao có ID không tồn tại chọn và có thể gửi lệnh cho bản ghi đầu tiên.', 'apps/web/src/components/HandoversView.tsx','const selectedHandover', ['raw/handover-target-red.txt','raw/handover-target-green.txt','raw/browser/handover-missing-target-runtime.json'], ['H2','H3','H5','H9'], 'Chọn đúng target, chờ loading/response tới muộn; báo lỗi rõ và quay về danh sách; URL thiếu hồ sơ không còn action cho bản ghi khác.'),
 ('W-N-013','P1','web','navigation','Popup tác nghiệp bãi không chặn Back/reload khi đang lưu hoặc còn bản nháp.', 'apps/web/src/components/yard/YardOperations.tsx','<ModalOverlay pending=', ['raw/yard-dialog-navigation-red.txt','raw/yard-dialog-navigation-green.txt','raw/browser/yard-back-cancel-draft-2026-10-04.json','raw/browser/yard-back-forward-retained-draft-2026-10-04.json'], ['H1','H3','H5'], 'Dùng ModalOverlay hiện có: chặn rời khi pending, xác nhận giữ draft, suspend lớp modal của màn ẩn. Browser Back/cancel giữ bản nháp; Back/accept rồi Forward mở lại đúng popup và giá trị chưa gửi.'),
 ('W-N-014','P2','web','microcopy','Tác nghiệp bãi nhập giờ Việt Nam nhưng hướng dẫn và thời gian lịch sử theo múi giờ thiết bị.', 'apps/web/src/components/yard/YardOperations.tsx',"timeZone: 'Asia/Ho_Chi_Minh'", ['raw/yard-dialog-navigation-red.txt','raw/yard-dialog-navigation-green.txt'], ['H2','H4'], 'Hiển thị lịch sử và hướng dẫn UTC+7, đúng instant ngay cả khi thiết bị dùng UTC; không chuyển ISO thêm lần nữa.'),
 ('W-N-015','P2','web','navigation','Liên kết tài liệu API của Bàn giao hardcode localhost3000 thay vì backend đã cấu hình.', 'apps/web/src/components/HandoversView.tsx','API_BASE_URL.replace', ['raw/browser/handover-docs-link-runtime.json'], ['H4','H9'], 'URL docs dùng cùng API_BASE_URL với HTTP client; kiểm chứng đúng API3001 trong môi trường test.'),
 ('W-N-016','P2','web','states','Header danh sách và tab hiển thị số0 khi dữ liệu chưa được xác nhận hoặc bị cấm đọc.', 'apps/web/src/components/CollectionState.tsx','export function ConfirmedResourceValue', ['raw/count-consumers-green.txt','raw/web-observation-review.md','raw/browser/network-containers-forbidden-counts-after.json'], ['H1','H9'], 'Count chỉ hiện khi các resource phụ thuộc đã ready/stale; stale được gắn nhãn. Browser403 đã xóa toàn bộ hàng cũ và hiển thị hai nhãn chưa xác nhận, không giả danh sách rỗng.'),
 ('W-N-017','P2','web','loading','Resource đã tải xong phải chờ toàn bộ read khác, và tariff lỗi làm mất rules của dữ liệu stale.', 'apps/web/src/context/AppContext.tsx','const publishResource', ['raw/progressive-context-regressions-green.txt','raw/progressive-loading-checkpoint-2026-10-04.md','raw/browser/network-progressive-delay5-master.json'], ['H1','H7','H9'], 'Validate/publish từng list hoàn chỉnh; detail/safety vẫn loading tới khi reconcile authoritative. Giữ tariff và rules stale cùng nhau; phép đo browser5s chỉ chứng minh section danh mục đã hiện khi read container còn pending.'),
 ('W-N-018','P1','web','auth','Lỗi kết nối hoặc500 khi khôi phục phiên xóa credentials; nút đổi tài khoản thiếu pending và gửi logout lặp.', 'apps/web/src/context/AppContext.tsx','const retrySessionRestore', ['raw/auth-progressive-regressions-green.txt','raw/auth-restore-checkpoint-2026-10-04.md','raw/root-auth-recovery-independent-green-2026-10-04.txt','raw/browser/bootstrap-outage-recovery-before.json','raw/browser/bootstrap-outage-recovery-after.json'], ['H1','H3','H5','H9'], 'Giữ credentials khi lỗi có thể phục hồi nhưng ẩn dữ liệu nghiệp vụ tới khi xác minh actor; retry coalesced/generation fenced. UI đổi tài khoản single-flight, có pending, bắt rejection. Browser reload khi API ngừng đã hiện màn phục hồi không lộ dữ liệu; retry sau API restart đăng nhập lại đúng ADMIN mà không nhập mật khẩu.'),
 ('W-N-019','P1','web','auth','Refresh mất kết nối/500 hoặc401 tới muộn có thể xóa phiên mới hoặc replay request của actor cũ.', 'packages/api-client/src/index.ts','const knownRotation', ['raw/web-refresh-recovery-regressions.txt','raw/web-refresh-recovery-review.md','raw/web-refresh-recovery-verification.json'], ['H1','H3','H5','H9'], 'Refresh đồng phiên được coalesce; lỗi tạm thời giữ credentials và truyền đúng ApiError. Generation/token lineage có giới hạn chỉ cho phép retry cùng actor, stale actor không clear hoặc replay phiên hiện tại; public contract bổ sung getSessionVersion tùy chọn.'),
 ('W-N-020','P2','web','states','Danh sách Movement Order và vị trí bãi báo không có dữ liệu khi request lỗi hoặc bị cấm đọc.', 'apps/web/src/components/MovementOrdersView.tsx','<CollectionState', ['raw/empty-body-green.txt','raw/empty-body-consumers-green.txt','raw/empty-body-review.md'], ['H1','H9'], 'Body dùng CollectionState, phân biệt loading/error/forbidden/stale/ready-empty/filter-empty; có retry hoặc xóa bộ lọc đúng trạng thái. Fixture actual2views đã kiểm, runtime các consumer này được ghi riêng.'),
 ('W-N-021','P1','web','auth','Logout cũ hoàn tất có thể xóa credentials và UI của phiên vừa đăng nhập, kể cả khe microtask trước khi provider commit actor.', 'apps/web/src/services/api/auth.service.ts','const version = tokenStorage.getSessionVersion()', ['raw/logout-session-race-green-2026-10-04.txt','raw/logout-race-checkpoint-2026-10-04.md'], ['H1','H3','H5'], 'Service kiểm credential generation; provider kiểm actor generation và credential generation. Same-actor refresh vẫn được cleanup; logout cũ không xóa phiên mới; giữ lỗi server cho UI xử lý.'),
 ('W-N-022','P1','web','data-availability','Vị trí đã xếp và thông tin liên kết chỉ cập nhật sau read cuối; giao diện tạm khẳng định container chưa xếp bãi.', 'apps/web/src/context/AppContext.tsx','const DEPENDENT_FIELDS', ['raw/progressive-dependencies-red-2026-10-04.txt','raw/progressive-dependencies-green-2026-10-04.txt','raw/dependency-location-regressions-2026-10-04.txt','raw/dependency-detail-checkpoint-2026-10-04.md','raw/browser/progressive-containers-catalog5s-series-2026-10-04.json','raw/browser/progressive-containers-location-fixed-2026-10-04.json'], ['H1','H2','H5'], 'Reconcile field liên kết khi nguồn phụ hoàn tất; giữ giá trị stale được phép đọc, bỏ giá trị bị hạn chế. Vị trí chưa xác minh có copy trung tính. Browser trước/sau read hãng tàu chậm5s xác nhận vị trí canonical đã hiện khi read khác còn pending; Holds/readiness vẫn chờ xác minh server.'),
 ('W-N-023','P1','web','data-availability','Container360 hiển thị chưa phát sinh hóa đơn/lệnh/bàn giao và action tạo mới khi resource chưa xác nhận hoặc bị cấm đọc.', 'apps/web/src/components/ContainersView.tsx','const collectionState', ['raw/container-derived-sections-red-2026-10-04.txt','raw/container-derived-sections-green-2026-10-04.txt','raw/dependency-detail-checkpoint-2026-10-04.md','raw/browser/container-billing-role-forbidden-2026-10-04.json'], ['H1','H3','H5','H9'], 'CollectionState và count trung tính theo resource; chặn tạo từ absence chưa xác minh, kiểm handover.create riêng. Không lọc record chưa xác nhận thanh toán như blocker-free. GATE_STAFF thực tế không thấy số0/empty giả hoặc giá trị tài chính khi403; trạng thái khác có regression.'),
 ('W-N-024','P2','web','data-contract','Lệnh vận chuyển trong Container360 thiếu định danh do backend không trả orderCode/orderNumber.', 'apps/web/src/services/mappers/live-view.mapper.ts','orderCode: asString(d.orderCode ?? d.orderNumber ?? d.id)', ['raw/movement-identity-red-2026-10-04.txt','raw/movement-identity-green-2026-10-04.txt','raw/dependency-detail-checkpoint-2026-10-04.md','raw/browser/container-movement-identity-after-2026-10-04.json'], ['H2','H4'], 'Dùng ID canonical backend khi không có mã hiển thị; không tạo mã nghiệp vụ mới. Contract regression RED/GREEN và actual Container360 hiển thị UUID đúng record.'),
 ('W-N-025','P2','web','layout','Popup Container360 tại320px bẻ ký tự cuối mã container và ép nhãn tab thành nhiều dòng.', 'apps/web/src/components/ContainersView.tsx','flex flex-wrap items-center gap-x-3 gap-y-2', ['raw/browser/container-dialog-320-oct04.json','raw/browser/container-dialog-narrow-header-after-2026-10-04.json','raw/browser/container-detail-responsive-after-2026-10-04.json','raw/dependency-detail-checkpoint-2026-10-04.md'], ['H2','H4','H8'], 'Header wrap badge theo chiều rộng, nút đóng không co; tab giữ nhãn một dòng trong thanh cuộn hiện có. Đo thực320/375/768/1440px: mã11ký tự một dòng, không tràn document hoặc phần thân popup. Không suy luận zoom200% đã đạt.'),
 ('W-N-026','P2','web','accessibility','Sáu tab chi tiết Container360 chỉ biểu thị lựa chọn bằng màu, thiếu state cho accessibility.', 'apps/web/src/components/ContainersView.tsx',"aria-pressed={activeDetailTab === 'OVERVIEW'}", ['raw/container-detail-selection-red-2026-10-04.txt','raw/container-detail-selection-green-2026-10-04.txt','raw/browser/container-detail-keyboard-selection-2026-10-04.json','raw/dependency-detail-checkpoint-2026-10-04.md'], ['H1','H4'], 'aria-pressed cập nhật theo tab hiện tại trên sáu native button; regression ban đầu/chuyển toàn bộ tab. Browser Enter chọn đúng mỗi tab, chỉ một pressed=true, focus-visible solid2px. Lời đọc screen reader chưa kiểm.'),
 ('W-N-027','P2','web','spacing','Nhịp spacing có các giá trị2/6/10/14px ngoài grid4px đã chốt.', 'apps/web/src/components/Header.tsx','p-2 text-slate-500 hover:bg-slate-100', ['raw/ui-measurements-summary-2026-10-04.json','raw/browser/style-matrix-production-main18-2026-10-04.json','raw/browser/spacing-overlay-production-after-bounds-2026-10-04.json'], ['H4','H8'], 'Chuẩn hóa281 utility spacing trên21file bằng đơn vị4px, giữ kích thước/icon/offset quang học. Đo72cấu hình main và28cấu hình form/tab: không có spacing ngoài grid trừ sr-only và auto centering có lý do; không tràn document. Không coi sampling này đã bao phủ mọi loại overlay.'),
 ('W-N-028','P1','web','error-feedback','Banner lỗi read dài khoảng865px đẩy nội dung vận hành xuống dưới màn hình.', 'apps/web/src/App.tsx','aria-label="Chi tiết dữ liệu cần tải lại"', ['raw/browser/read-error-bounds-before-2026-10-04.json','raw/browser/read-error-bounds-after-2026-10-04.json','raw/browser/read-error-bounds-responsive-after-2026-10-04.json'], ['H1','H7','H9'], 'Chi tiết lỗi giới hạn96px, có scroll/accessible region và Tab focus. Banner còn129,3px tại320/375/768/1440;7.170ký tự vẫn còn và ArrowDown cuộn thật. Giữ retry và trạng thái nghiệp vụ; nguyên nhân HTTP của read failure vẫn UNKNOWN.'),
 ('W-N-029','P2','web','interaction','Ô nhập thiếu hover; selector bổ sung ban đầu lấn active của nút/link.', 'apps/web/src/index.css','--icd-control-hover-brightness:', ['raw/browser/pointer-states-before-2026-10-04.json','raw/browser/pointer-states-after-input-button-2026-10-04.json','raw/browser/pointer-states-complete-final-2026-10-04.json'], ['H1','H4'], 'Token hover brightness0,97 cho control đang dùng; selector ưu tiên thấp giữ active0,92 của nút/link và bỏ qua disabled/aria-disabled. Native trusted down và settled hover đo riêng, giữ cả mẫu không so sánh được. Không thêm chuyển động hoặc đổi bố cục.'),
 ('W-N-030','P2','web','accessibility','Placeholder bị giảm alpha50% nên chữ gợi ý không đạt contrast4,5:1.', 'apps/web/src/index.css','input::placeholder, textarea::placeholder', ['raw/browser/placeholder-contrast-before-2026-10-04.json','raw/browser/placeholder-contrast-after-2026-10-04.json','raw/browser/placeholder-contrast-final-2026-10-04.json'], ['H4','H8'], 'Dùng semantic token chữ phụ hiện có và opacity1, token riêng trên nền tối của chính ô nhập. Giữ label và nội dung gợi ý. Giữ kết quả RED của ô QR sau sửa đầu để chứng minh ngoại lệ đã được xử lý; không coi đây là chứng nhận WCAG toàn ứng dụng.'),
 ('W-N-031','P3','web','interaction','Feedback hover bằng filter đổi tức thì dù các màu khác transition150ms.', 'apps/web/src/index.css','opacity, filter; transition-duration', ['raw/browser/pointer-states-complete-final-2026-10-04.json','raw/browser/feedback-frames-final-2026-10-04.json'], ['H4'], 'Thêm filter vào transition150ms ease-out hiện có. Đo các frame khi native click/hover và giữ CSS active ưu tiên hơn hover; reduced-motion vẫn tắt transition không thiết yếu. Không thêm animation trang hoặc optimistic transaction.'),
]
for fid, severity, platform, category, issue, file, needle, ev, heuristics, change in new_specs:
    a = anchor(file,needle)
    status = 'FIXED' if platform == 'mobile' else 'VERIFIED'
    findings['findings'].append({'id':fid,'severity':severity,'platform':platform,'category':category,
      'title':issue,'title_vi':issue,'issue':issue,'status':status,'confidence':'source_and_meaningful_regression',
      'nielsen':heuristics,'evidence':[a], 'improvement_02':{'status':status,'change':change,'source_evidence':[a],
      'evidence':existing(ev),'limitations':'Native/runtime matrix remains separate from fixture result; see coverage.',
      'method':'Meaningful RED/GREEN source regression; real API only if explicitly linked.'}})
for f in findings['findings']:
    extra = {
      'W-N-022': [('apps/web/src/components/ContainersView.tsx','const yardLocationReady')],
      'W-N-023': [('apps/web/src/components/ContainersView.tsx',"'handover.create'")],
      'W-N-024': [('apps/api/prisma/schema.prisma','model MovementOrder')],
    }.get(f['id'], [])
    f['improvement_02']['source_evidence'].extend(anchor(file, needle) for file, needle in extra)
    if f['id'] == 'W-N-025':
        f['improvement_02']['method']='Actual browser geometry/screenshot before and after; no implementation-mirroring style test.'
    if f['id'] in ['W-N-027','W-N-028','W-N-029','W-N-030','W-N-031']:
        f['improvement_02']['method']='Actual computed styles, trusted native interaction/frame samples or geometry, as explicitly linked. Offline analysis preserves incomplete/excluded measurements; no implementation-mirroring style test.'
findings['findings'].sort(key=lambda f:(int(f['severity'][1]), f['id']))
save(REL+'/findings.json',findings)

promotions = {
 'web-D1-type_scale-2':('PASS',['W-R-003']),
 'web-D1-line_height-1':('PASS',['W-R-004']),
 'web-D2-focus-4':('PASS',['W-R-002']),
 'web-D3-headings-2':('PASS',['W-N-001']),
 'web-D4-empty-2':('PASS',['W-S-015']),
 'web-D4-validation-2':('PASS',['W-S-006']),
 'web-D4-indicators-3':('PASS',['W-S-004']),
 'mobile-D1-type_scale-2':('PASS',['M-013']),
 'mobile-D1-font_weight-2':('PASS',['M-013']),
 'mobile-D1-line_height-3':('PASS',['M-013']),
 'mobile-D1-spacing_rhythm-2':('PASS',['M-013']),
 'mobile-D3-headings-2':('PASS',['M-014']),
 'mobile-D4-initial-2':('PASS',['M-008']),
 'mobile-D4-empty-2':('PASS',['M-008']),
 'mobile-D4-validation-2':('PASS',['M-012']),
 'mobile-D4-validation-3':('PASS',['M-007']),
 'mobile-D4-indicators-2':('PASS',['M-008']),
}
by_id={f['id']:f for f in findings['findings']}
changes=[]
for o in scores['observations']:
    if o['id'] not in promotions: continue
    status, ids=promotions[o['id']]
    evidence=[p for fid in ids for p in by_id[fid]['improvement_02']['evidence']]
    if o['id']=='web-D3-headings-2':
        evidence=existing(['raw/browser/axe-dashboard-final.json','raw/dashboard-resource-green.txt'])
        o['improvement_source_evidence']=[anchor('apps/web/src/components/DashboardView.tsx','<h2')]
    if not evidence: raise ValueError('No evidence for promotion '+o['id'])
    changes.append({'id':o['id'],'from':o['status'],'to':status,'finding_ids':ids,'evidence':evidence})
    o['previous_status']=o['status'];o['status']=status;o['improvement_evidence']=evidence
    o['note'] += ' — Improvement02: source/component/browser-scoped verification. Native geometry or spoken output is not inferred.'

measured_promotions={
 'web-D1-letter_spacing-1':('72main/width cases;196headings and360uppercase roles. Tight header, normal section headings, tracked short captions; dense table/code roles intentionally neutral.', ['raw/browser/typography-letterspacing-final-2026-10-04.json']),
 'web-D1-spacing_rhythm-2':('281spacing utilities normalized on21files;100measured main/overlay cases. Off-grid exceptions are property-specific sr-only or automatic centering. Other overlay consistency remains UNKNOWN.', ['raw/ui-measurements-summary-2026-10-04.json']),
 'web-D2-hover-2':('Actual input/checkbox/select/button/link hover measured; global native-control rule covers controls used by source. Disabled and aria-disabled excluded; incomparable baseline excluded.', ['raw/browser/pointer-states-final-responsive-2026-10-04.json','raw/browser/pointer-states-complete-final-2026-10-04.json','raw/browser/feedback-frames-final-2026-10-04.json']),
 'web-D2-active-1':('Trusted native down exposes active=true on actual button/link; specificity regression corrected. Current frame trace retains transient active and settles into distinct hover.', ['raw/browser/pointer-states-complete-final-2026-10-04.json','raw/browser/feedback-frames-final-2026-10-04.json']),
 'web-D2-timing-1':('100trusted samples,20per navigation/dialog/selection/filter/submit. p95local feedback<=100ms; transition150ms. Latest source differs from timed artifact only in CSS. This is not fieldINP.', ['raw/browser/interaction-production-after-bounds-complete-2026-10-04.json','raw/ui-measurements-summary-2026-10-04.json']),
 'web-D2-easing-1':('Control color/filter transitions150ms ease-out, measured across multiple actual frames; pressed state remains immediate in semantics. Progress spinner is purposeful loading indication; reduced motion retained.', ['raw/browser/feedback-frames-final-2026-10-04.json','raw/ui-measurements-summary-2026-10-04.json']),
 'web-D4-initial-1':('All18main screens visibly show loading under bounded real GETcontainers5s delay; actual DOM traces, not settled screenshots.', ['raw/browser/initial-main-batch1-trace-2026-10-04.json','raw/browser/initial-main-batch2-trace-2026-10-04.json','raw/browser/initial-main-batch3-trace-2026-10-04.json']),
 'web-D4-progressive-1':('Actual shipping rows appear before all reads finish;50msnominal DOM polling starts at iframe load. Completed resources publish independently; authoritative safety/detail remains gated.', ['raw/browser/initial-master5-trace-complete-2026-10-04.json','raw/ui-measurements-summary-2026-10-04.json']),
}
for o in scores['observations']:
    if o['id'] not in measured_promotions:continue
    rationale,files=measured_promotions[o['id']]
    evidence=existing(files)
    assert len(evidence)==len(files),(o['id'],'Missing measured evidence')
    o['previous_status']=o['status'];o['status']='PASS'
    o['improvement_evidence']=evidence
    o['note']+=' — Measured2026-10-04: '+rationale
    changes.append({'id':o['id'],'from':o['previous_status'],'to':'PASS','method':'measured browser/source criterion','rationale':rationale,'evidence':evidence})

# The old native geometry FAIL is preserved historically; this changed-source candidate is unmeasured.
for o in scores['observations']:
    if o['id'] in ['mobile-D1-margin_padding-2','mobile-D1-whitespace-2',
                    'mobile-D3-visual_weight-2','mobile-D3-density-2','mobile-D3-data_chrome-2']:
        o['previous_status']=o['status'];o['status']='UNKNOWN'
        o['note'] += ' — Changed source has corrective styles; new native bounds/large-font measurements not available. Historical FAIL remains in baseline.'
        o['improvement_evidence']=existing(['raw/mobile-review-checkpoint.md'])
        changes.append({'id':o['id'],'from':'FAIL','to':'UNKNOWN','reason':'changed candidate source; native measurement pending; not a PASS'})

for platform, data in scores['platforms'].items():
    for dim in data['ux_gap']['dimensions']:
        for c in dim['criteria']:
            obs=[o for o in scores['observations'] if o['id'] in c['observation_ids']]
            c['counts']={s:sum(o['status']==s for o in obs) for s in ['PASS','FAIL','UNKNOWN']}
            n=sum(c['counts'].values())
            c['min']=c['counts']['PASS']/n if n else None
            c['max']=(c['counts']['PASS']+c['counts']['UNKNOWN'])/n if n else None
        applied=[c for c in dim['criteria'] if c['applicable']]
        for bound in ['min','max']:
            dim[bound]=25*sum(c['weight']*c[bound] for c in applied)/sum(c['weight'] for c in applied)
    for bound in ['min','max']:data['ux_gap'][bound]=sum(d[bound] for d in data['ux_gap']['dimensions'])
    obs=[o for o in scores['observations'] if o['platform']==platform and o['status']!='N/A']
    data['ux_gap']['observed_coverage']=sum(o['status']!='UNKNOWN' for o in obs)/len(obs)
    for h in data['nielsen']['heuristics']:
        hid=h.get('id') or h.get('heuristic_id')
        # Retain unresolved acceptance, including repaired-but-not-native-verified defects.
        unresolved=[f for f in findings['findings'] if (f.get('platform', 'mobile' if f['id'].startswith('M-') else 'web')==platform)
                    and f['status']!='VERIFIED' and hid in f.get('nielsen', [])]
        original=[fid for fid in h['finding_ids'] if by_id[fid]['status']!='VERIFIED']
        ids=list(dict.fromkeys(original+[f['id'] for f in unresolved]))
        h['finding_ids']=ids
        h['verified_max_severity']=max([{'P0':4,'P1':3,'P2':2,'P3':1}[by_id[fid]['severity']] for fid in ids],default=0)
        h['possible_max_severity']=max(h['possible_max_severity'],h['verified_max_severity'])
        h['checkpoint_note']='Conservative unresolved-acceptance severity, including FIXED pending native; not a claim the same defect remains reproduced in changed source.'
    data['nielsen']['observed']=100-2.5*sum(h['verified_max_severity'] for h in data['nielsen']['heuristics'])
    data['nielsen']['max']=data['nielsen']['observed']
    data['nielsen']['min']=100-2.5*sum(h['possible_max_severity'] for h in data['nielsen']['heuristics'])
scores['generated_at']=NOW
scores['comparison_scope']='Same original web/mobile scope and observation IDs; iOS/field/native UNKNOWN retained. No Android-only score is manufactured.'
scores['improvement_changes']=changes
scores['re_audit_policy']='Same104IDs/weights:17 prior source/component-scoped PASS promotions plus8 directly measured web criteria;5 changed-native geometry FAIL-to-UNKNOWN. No inferred spoken-screen-reader/native/field-performance PASS. Incomplete acceptance retains Nielsen severity.'
save(REL+'/scores.json',scores)

# Diffs compare the approved session snapshot, including then-untracked source, not dirty Git HEAD.
manifest=read(REL+'/baseline-manifest.json')
source_changes=[]
for item in manifest['source_files']:
    file=item['path']; old=RUN/'source-before'/file; current=ROOT/file
    if not old.is_file() or not current.is_file():continue
    if sha(old)==sha(current):continue
    patch=RUN/'fixes/source-diffs'/Path(file+'.diff')
    patch.parent.mkdir(parents=True,exist_ok=True)
    patch.write_text(''.join(difflib.unified_diff(old.read_text(encoding='utf-8-sig').splitlines(True),current.read_text(encoding='utf-8-sig').splitlines(True),fromfile='before/'+file,tofile='after/'+file)),encoding='utf-8')
    source_changes.append({'file':file,'before_sha256':sha(old),'after_sha256':sha(current),'diff':patch.relative_to(ROOT).as_posix()})
known={item['path'] for item in manifest['source_files']}
for directory in ['apps/web/src','apps/mobile/src','apps/mobile/tests','packages/api-client/src']:
    for current in (ROOT/directory).rglob('*'):
        if not current.is_file():continue
        file=current.relative_to(ROOT).as_posix()
        if file in known:continue
        patch=RUN/'fixes/source-diffs'/Path(file+'.diff');patch.parent.mkdir(parents=True,exist_ok=True)
        patch.write_text(''.join(difflib.unified_diff([],current.read_text(encoding='utf-8-sig').splitlines(True),fromfile='before/'+file,tofile='after/'+file)),encoding='utf-8')
        source_changes.append({'file':file,'before_sha256':None,'after_sha256':sha(current),'diff':patch.relative_to(ROOT).as_posix(),'kind':'NEW_SINCE_APPROVED_SNAPSHOT'})
for f in findings['findings']:
    folder=RUN/'fixes'/f['id'];folder.mkdir(parents=True,exist_ok=True)
    current_files={a['file'] for a in f.get('improvement_02',{}).get('source_evidence',[])}
    f['improvement_02']['review_diffs']=[x['diff'] for x in source_changes if x['file'] in current_files]
    f['improvement_02']['isolated_review_diffs']=[p.relative_to(ROOT).as_posix() for p in sorted((RUN/'fixes/dependency-detail-2026-10-04').glob(f["id"]+'*.diff'))]
    adjacent={'W-N-027':'spacing-grid-2026-10-04/diffs','W-N-028':'read-error-bounds-2026-10-04','W-N-029':'pointer-hover-2026-10-04','W-N-030':'placeholder-contrast-2026-10-04','W-N-031':'feedback-transition-2026-10-04'}.get(f['id'])
    if adjacent:
        f['improvement_02']['isolated_review_diffs'] += [p.relative_to(ROOT).as_posix() for p in sorted((RUN/'fixes'/adjacent).rglob('*.diff'))]
    save((folder/'fix-log.json').relative_to(ROOT).as_posix(), f['improvement_02'])
save(REL+'/findings.json',findings)
save(REL+'/fixes/source-changes.json',{'generated_at':NOW,'files':source_changes,'policy':'Shared-file review diffs explicitly include multiple approved findings; not standalone per-finding patches.'})

ledger=read(REL+'/ledger.json')
for row in ledger['findings']:
    fid=row.get('id')
    f=by_id.get(fid)
    if f:row.update(status=f['status'],evidence=f['improvement_02']['evidence'],limitations=f['improvement_02'].get('limitations','Prior verified scope retained.'))
ledger['residual_subtasks']=residual
known_ids={row.get('id') for row in ledger['findings']}
for f in findings['findings']:
    if f['id'] not in known_ids:
        ledger['findings'].append({'id':f['id'],'priority':f['severity'],'platform':f.get('platform'),
          'status':f['status'],'title':f['title'],'evidence':f['improvement_02']['evidence']})
for row in ledger['findings']:
    if row.get('parent_id') in ['W-S-005','W-S-016']:
        row.update(next(x for x in residual if x['parent_id']==row['parent_id']))
ledger['phase_status']={'0':'COMPLETE','1':'COMPLETE_WITH_FRESH_CHECK_LOGS','2':'SOURCE_FIXED; RUNTIME_ACCEPTANCE_PARTIAL',
                      '3':'SOURCE_FIXED; NATIVE_PENDING','4':'IN_PROGRESS','5':'WEB_UX_RUBRIC_TARGET_MET; FULL_ACCEPTANCE_PENDING','6':'PENDING_FULL_MATRIX'}
ledger['last_checkpoint_at']=NOW
ledger['overall_status']='IN_PROGRESS; web measuredUX rubric target met; native and broad runtime/speech acceptance remain.'
save(REL+'/ledger.json',ledger)

coverage=copy.deepcopy(read(REL+'/coverage.json'))
coverage['improvement_checkpoint']={'generated_at':NOW,'policy':'Historical reach samples preserved; new measurements added with exact scope. No whole-screen accessibility certification.'}
unknown_updates={
 'U-01':'Seven synthetic test accounts now exist and web login/sidebar were exercised. Per-task/per-overlay role matrix and current Android role sessions remain incomplete.',
 'U-04':'Business writes are authorized only in the guarded test database. Real API workflows and selected web form saves/rejects are verified; remaining UI transaction variants and native writes are not. Offline transaction queue is intentionally not implemented by the mobile spec.',
 'U-05':'Authenticated axe runs now execute through an audit-only page and real CUA UI. Zero violations is scoped to each saved result; incomplete rules need manual verification. Original kz scripts that require unsupported mutation APIs remain unexecuted; equivalent modal/focus/form/popover cases are separately evidenced.',
 'U-06':'100main/overlay layout cases at320/375/768/1440 CSSpx; actual trusted hover/pressed and control transition frames measured. Browser200%zoom and uncaptured overlay variants remain UNKNOWN; CSSreflow is not zoom verification.',
 'U-07':'100trusted timing samples20per group and18initial-loading traces captured in isolated production. Five authenticated route Lighthouse and field performance remain UNKNOWN; local frame feedback is not fieldINP.',
 'U-08':'Synthetic role and transaction prerequisites now exist in the isolated database. The changed mobile source has not been reloaded and tested natively after automatic approval review rejected Expo reload/intent with reason blocked by policy.',
 'U-09':'Deferred/rejected/conflict/forbidden source/component fixtures exist; real API lifecycle and selected browser states are verified. Full nested-read/network/offline/reconnect matrix and changed-source Android acceptance remain incomplete.'
}
for u in coverage['unknowns']:
    if u['id'] in unknown_updates:
        u['historical_reason']=u['reason'];u['reason']=unknown_updates[u['id']]
for row in coverage['cases']:
    row['checkpoint_scope']='HISTORICAL_OBSERVATION; only separately added cases are current runtime evidence'
    if row.get('unknown_id') in unknown_updates:
        row['historical_unknown_reason']=row['unknown_reason']
        row['unknown_reason']=unknown_updates[row['unknown_id']]
coverage['historical_row_count']=len(coverage['cases'])
for file in (RUN/'raw/browser').glob('axe-*-final.json'):
    d=json.loads(file.read_text(encoding='utf-8'))
    coverage['cases'].append({'platform':'web','screen':d['url'],'role':d.get('auditRole','ADMIN'),'theme':'current','viewport':d['viewport'],
      'state':'WCAG-tagged axe scan; settled screen or explicitly named overlay', 'status':'PASS' if not d['violations'] else 'FAIL',
      'meaning':f"No automated violations only; {len(d['incomplete'])} incomplete rules require manual verification.", 'evidence':[file.relative_to(ROOT).as_posix()]})
for role in ['admin','gate_staff','yard_staff','operator','manager','audit_read_only','audit_none']:
    p=RUN/f'raw/browser/role-{role}.txt'
    if p.is_file():coverage['cases'].append({'platform':'web','screen':'dashboard/sidebar','role':role,'state':'real test account session','status':'PASS','meaning':'Login and visible navigation/resource state only; not all tasks by role.','evidence':[p.relative_to(ROOT).as_posix()]})
runtime_cases = [
 ('network-containers-stale-500.json','containers','GET500 sau dữ liệu đã tải','Giữ hàng cũ và nhãn stale; không chứng minh tất cả resource hoặc offline.'),
 ('network-containers-retry-after-500.json','containers','retry sau GET500','Sau khi gỡ fault, tải lại thành công và bỏ stale.'),
 ('network-containers-initial-500.json','containers','GET500 lần tải đầu','Error và retry riêng, không giả empty thành công.'),
 ('network-containers-forbidden-counts-after.json','containers','GET403 sau dữ liệu đã tải','Xóa hàng bị hạn chế và count chưa xác nhận; không giả số0.'),
 ('network-containers-abort.json','containers','GET socket abort','Error phục hồi khi resource mất kết nối; không phải thiết bị offline.'),
 ('network-progressive-delay5-master.json','master-data','GET containers delay5s','Known shipping-line row hiện khi read khác còn pending; chỉ chứng minh progressive section này.'),
 ('handover-missing-target-runtime.json','handovers','ID URL không tồn tại','Không chọn record khác hoặc hiện action publish; có quay lại danh sách.'),
 ('handover-docs-link-runtime.json','handovers','docs theo API cấu hình','href API3001 chính xác; không chứng minh nội dung API docs.'),
 ('bootstrap-outage-recovery-before.json','auth','reload khi API3001 đã ngừng','Màn khôi phục có retry/logout, không có password, sidebar hoặc protected view.'),
 ('bootstrap-outage-recovery-after.json','auth','API khởi động lại rồi UI retry','Đúng ADMIN được xác minh lại, có sidebar, không nhập lại password; không chứng minh hết hạn token thực tế.'),
 ('yard-back-cancel-draft-2026-10-04.json','yard/booking','Back rồi hủy rời bản nháp','URL cuối vẫn yard, popup và nội dung chưa gửi được giữ.'),
 ('yard-back-forward-retained-draft-2026-10-04.json','yard/booking','Back/accept rồi Forward','Modal của màn ẩn đã đóng top layer; Forward mở lại draft. Không gửi giao dịch.'),
 ('progressive-master-1s-series-2026-10-04.json','master-data','initial/partial/complete với read chậm1s','Danh mục đã hiện trong lúc container pending; timestamp là thời điểm quan sát CUA, không đo input-to-paint.'),
 ('progressive-master-5s-series-2026-10-04.json','master-data','initial/partial/complete với read chậm5s','Danh mục đã hiện trong lúc container pending; scalar progressive toàn scope còn cần các resource khác.'),
 ('progressive-containers-location-fixed-2026-10-04.json','containers','read hãng tàu chậm5s sau sửa dependency','Vị trí canonical đã hiện khi read khác còn pending; không hiển thị absence giả. Safety vẫn chưa kiểm tới khi reconcile.'),
 ('container-billing-role-forbidden-2026-10-04.json','containers/billing','GATE_STAFF không có quyền đọc invoices','Count chưa xác nhận, cảnh báo quyền; không có số0/empty giả hoặc giá trị tài chính.'),
 ('container-movement-identity-after-2026-10-04.json','containers/overview','identity của Movement Order backend thật','Hiển thị đúng UUID của lệnh; không tạo mã mới hoặc sửa schema.'),
 ('container-detail-responsive-after-2026-10-04.json','containers/overview','popup tại320/375/768/1440 CSS px thực','Mã container một dòng, document/body không tràn. Tab strip vẫn cuộn ngang; không coi đây là phép thử zoom.'),
 ('container-detail-keyboard-selection-2026-10-04.json','containers/detail','Enter vào sáu nút chuyển tab','Mỗi tab chọn đúng state, chỉ một pressed=true; focus-visible solid2px. Không phải screen-reader speech.'),
]
for filename, screen, state, meaning in runtime_cases:
    p=RUN/'raw/browser'/filename
    if p.is_file():
        runtime_data=json.loads(p.read_text(encoding='utf-8'))
        coverage['cases'].append({'platform':'web','screen':screen,'role':runtime_data.get('role','ADMIN'),'theme':'current','state':state,'status':'PASS','meaning':meaning,'evidence':[p.relative_to(ROOT).as_posix()]})
coverage['excluded_evidence']=[{'file':REL+'/raw/browser/network-progressive-delay5-master-invalid-row-count.json','reason':'Row đầu là placeholder. Đã loại khỏi kết luận và thay bằng known-record measurement; không tính coverage PASS.'}]
coverage['excluded_evidence'].append({'file':REL+'/raw/browser/container-dialog-requested320-invalid-actual1440-oct04.json','reason':'Viewport handle cũ không thay đổi innerWidth1440. Đã loại và đo lại bằng capability mới xác nhận320 thực; không tính mẫu sai là320 PASS.'})
coverage['cases'].append({'platform':'mobile','screen':'all changed screens','role':'applicable','state':'current Android native acceptance','status':'UNKNOWN','unknown_reason':'Automatic approval review denied Expo reload/intent with reason blocked by policy. No bypass; source/component tests do not establish latest native UI.'})
for file,screen,meaning in [
 ('ui-measurements-summary-2026-10-04.json','18main / sampled overlays','100layout cases không tràn document; nhịp4px với ngoại lệ có lý do. Không phải mọi overlay,200%zoom hoặc speech.'),
 ('browser/interaction-production-after-bounds-complete-2026-10-04.json','navigation/dialog/selection/filter/submit','100trusted samples20mỗi nhóm; p95<=100ms cho local feedback upper-bound proxy. Không phải fieldINP hoặc thời gian hoàn tất giao dịch.'),
 ('browser/feedback-frames-final-2026-10-04.json','input/button/link','Trusted native down và frame interpolation tới hover; transition150ms ease-out. Không tạo event giả.'),
 ('browser/placeholder-contrast-final-2026-10-04.json','main fields/login','11placeholder measured colors/solid backgrounds đạt4,5:1; nền tối QR/login dùng token riêng. Không chứng nhận toàn WCAG.'),
 ('browser/initial-main-batch1-trace-2026-10-04.json','main batch1','Visible initial-loading dưới bounded GETcontainer5s; DOMpoll50ms bắt đầu tại iframe load.'),
 ('browser/initial-main-batch2-trace-2026-10-04.json','main batch2','Visible initial-loading dưới bounded GETcontainer5s; DOMpoll50ms bắt đầu tại iframe load.'),
 ('browser/initial-main-batch3-trace-2026-10-04.json','main batch3','Visible initial-loading dưới bounded GETcontainer5s; DOMpoll50ms bắt đầu tại iframe load.'),
 ('browser/initial-master5-trace-complete-2026-10-04.json','master-data','Known shipping records hiện khoảng689ms; toàn lượt đọc xong khoảng6352ms. Không phải network timing hoặc exact first paint.')]:
    p=RUN/'raw'/file
    assert p.is_file(),file
    coverage['cases'].append({'platform':'web','screen':screen,'role':'ADMIN','theme':'current','state':'measured2026-10-04 production','status':'PASS','meaning':meaning,'evidence':[p.relative_to(ROOT).as_posix()]})
coverage['cases'].append({'platform':'Android','screen':'emulator connection','state':'ADBread-only device inventory2026-10-04','status':'UNKNOWN','unknown_reason':'No connected Android device; native current source cannot be verified. Previous automatic-review denial remains unresolved.','evidence':existing(['raw/android-devices-2026-10-04.txt'])})
coverage['cases'].append({'platform':'web/mobile','screen':'all','state':'spoken screen-reader output, external keyboard on Android','status':'UNKNOWN','unknown_reason':'No actual TalkBack/VoiceOver/web screen-reader speech verification.'})
coverage['summary']=dict(Counter(x['status'] for x in coverage['cases']))
coverage['summary_semantics']='Includes preserved historical samples; use current_runtime_summary for newly measured cases. PASS never means whole-screen conformance.'
coverage['current_runtime_summary']=dict(Counter(x['status'] for x in coverage['cases'][coverage['historical_row_count']:]))
coverage['unknown_update']='Historical observations remain visible. Aggregate reasons updated to current authorization and evidence; unresolved scope remains UNKNOWN.'
save(REL+'/coverage-checkpoint.json',coverage)

lines=[]
def add(s=''):lines.append(s)
def fmt(v):return f'{v:.1f}'.replace('.',',')
add('# ICD UI/UX — Checkpoint đo thực tế và re-audit')
add(f'\nCập nhật: {NOW}. Phạm vi: web và mã mobile hiện tại; Android native đang chờ kiểm chứng.\n')
add('## Executive summary\n')
add('Web đạt mục tiêu UX Gap≥95 trong rubric104observation đã khóa, với bằng chứng đo và điểm từng dimension ở bảng dưới. **Chưa nghiệm thu toàn bộ dự án**: Android native, lời đọc screen reader, các overlay/quyền còn thiếu và performance thực tế chưa xác minh. Fixture không xác nhận pixel, hitbox, TalkBack hoặc giao dịch native.\n')
add('Giữ UI/nghiệp vụ; backend quyết định giao dịch. Môi trường MySQL3308/API3001/web5174 sử dụng database `icd_ux_audit_20261003_e2e`; provider ngoài/cron được cô lập. Không reset database đang dùng.\n')
add('Baseline được giữ nguyên: '+link('audit/2026-10-03-reaudit-01-report.md','re-audit01')+'.\n')
add('Checkpoint trước batch này: '+link('audit/2026-10-04-report.md','báo cáo trước')+'; dữ liệu điểm/findings cũ đã lưu riêng tại '+link(REL+'/checkpoints/2026-10-04-before-spacing/scores.json','scores trước')+'. Không đổi IDs, trọng số hoặc mẫu số để tăng điểm.\n')
counts=Counter(f['status'] for f in findings['findings'])
add('Trạng thái finding: '+', '.join(f'{k}={v}' for k,v in counts.items())+'. `VERIFIED` là acceptance trong phương pháp/phạm vi ghi ở từng finding; coverage khác còn UNKNOWN.\n')
add('## Điểm số và phạm vi\n')
add('| Nền tảng | UX Gap re-audit01 | UX Gap checkpoint | Nielsen checkpoint / khoảng bất định | Mục tiêu |')
add('|---|---:|---:|---:|---:|')
for p in ['web','mobile']:
    b=base_scores['platforms'][p];s=scores['platforms'][p]
    add(f"| {p} | {fmt(b['ux_gap']['min'])}–{fmt(b['ux_gap']['max'])} | {fmt(s['ux_gap']['min'])}–{fmt(s['ux_gap']['max'])} | {fmt(s['nielsen']['observed'])} / {fmt(s['nielsen']['min'])}–{fmt(s['nielsen']['max'])} | ≥95 |")
add('\nNielsen là quy đổi dự án:100−2,5×Σseverity. Lỗi có nguồn đã sửa nhưng acceptance còn pending vẫn được giữ bảo thủ. Điểm cao của một rubric không chứng minh toàn sản phẩm đạt.\n')
add('| Dimension /25 | Web | Mobile |')
add('|---|---:|---:|')
for i in range(4):
    w=scores['platforms']['web']['ux_gap']['dimensions'][i];m=scores['platforms']['mobile']['ux_gap']['dimensions'][i]
    add(f"| {w['name']} | {fmt(w['min'])}–{fmt(w['max'])} | {fmt(m['min'])}–{fmt(m['max'])} |")
add('\n### Nielsen — mười heuristic\n')
add('| Heuristic | Web severity0–4 đã biết / có thể | Mobile severity0–4 đã biết / có thể | Finding còn chờ acceptance |')
add('|---|---:|---:|---|')
for w,m in zip(scores['platforms']['web']['nielsen']['heuristics'],scores['platforms']['mobile']['nielsen']['heuristics']):
    assert w['id']==m['id']
    ids=list(dict.fromkeys(w['finding_ids']+m['finding_ids']))
    add(f"| {w['id']} — {w['name']} | {w['verified_max_severity']} / {w['possible_max_severity']} | {m['verified_max_severity']} / {m['possible_max_severity']} | {', '.join(ids) or 'Không có finding đã biết chưa verify; coverage UNKNOWN vẫn còn'} |")
add('\nSeverity hiện tại giữ các finding FIXED đang chờ acceptance. Cột có thể là giới hạn bất định từ phần chưa kiểm tra, không phải mười lỗi catastrophic đã phát hiện. IDs observation, trọng số và mẫu số giữ nguyên baseline.\n')
add('\nDữ liệu tái lập: '+link(REL+'/scores.json','scores')+', '+link(REL+'/findings.json','findings')+', '+link(REL+'/coverage-checkpoint.json','coverage')+'.\n')
add('## Findings đầy đủ — sắp theo severity\n')
add('| ID | Severity | Category | Trạng thái | Vấn đề / thay đổi | Evidence hiện tại |')
add('|---|---|---|---|---|---|')
for f in findings['findings']:
    info=f['improvement_02'];anchors=info.get('source_evidence',[])
    evidence=link(anchors[0]['file'],anchors[0]['file']+':'+str(anchors[0]['line']),anchors[0]['line']) if anchors else link(REL+'/fixes/'+f['id']+'/fix-log.json','fix log / prior verified scope')
    title=(f.get('title_vi') or f['title']).replace('|','\\|')
    add(f"| {f['id']} | {f['severity']} | {f['category']} | {f['status']} | {title} | {evidence} |")
add('\n## Chi tiết fix, verification và diff\n')
for f in findings['findings']:
    info=f['improvement_02']
    add(f"### {f['id']} — {f['severity']} / {f['status']}\n")
    add(f"{f.get('issue',f['title'])}\n")
    add('Thay đổi: '+info.get('change',info.get('method','Prior verified fix'))+'\n')
    add('Giới hạn: '+info.get('limitations','Giữ phạm vi/giới hạn của re-audit01; regression mới được liên kết.')+'\n')
    for a in info.get('source_evidence',[]):
        add('Evidence: '+link(a['file'],f"{a['file']}:{a['line']}",a['line'])+'\n')
        add('```tsx\n'+a['snippet']+'\n```\n')
    add('Verify/raw: '+', '.join(link(p,Path(p).name) for p in info['evidence'])+'\n')
    add('Diff/fix log: '+link(REL+'/fixes/'+f['id']+'/fix-log.json','fix log')+'; shared-file diffs được ghi rõ phạm vi chồng nhau.\n')
    if info.get('isolated_review_diffs'):
        add('Diff snapshot liền kề riêng của fix: '+', '.join(link(p,Path(p).name) for p in info['isolated_review_diffs'])+'\n')
    if f['status']!='VERIFIED':
        add('- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.\n')
add('## Hai residual subtask\n')
for row in residual:add(f"- {row['parent_id']} / {row['status']}: {row['scope']}")
add('\n## Đo thực tế trong batch này\n')
measurement=read(REL+'/raw/ui-measurements-summary-2026-10-04.json')
add('| Phép kiểm | Kết quả | Phạm vi / giới hạn |')
add('|---|---|---|')
add('| Nhịp spacing | 281utility/21file;100main/overlay samples;0document overflow | sr-only và auto-centering được tách; mọi loại overlay chưa đủ |')
add('| Chữ gợi ý | 11/11PASS; thấp nhất '+fmt(measurement['placeholder']['minimum_ratio'])+':1 | Pseudo-element/nền thực, gồm QR và Login tối; không phải toàn WCAG |')
add('| Loading | 18/18main có trạng thái đang tải | Real bounded GETcontainer5s; chưa đủ mọi overlay/network combination |')
add('| Progressive | Known records '+fmt(measurement['progressive']['known_rows_ms'])+'ms; all reads '+fmt(measurement['progressive']['all_reads_completed_ms'])+'ms | DOMpoll50ms nominal; không phải exact first paint |')
add('| Hover/active | Native trusted down và các frame chuyển dần150ms ease-out | Input/button/link; không tạo event giả |')
add('| Banner lỗi read | Khoảng865px→129,3px; chi tiết96px có keyboard scroll | Toàn nội dung và retry giữ nguyên; nguyên nhân HTTP vẫnUNKNOWN |')
for group,stats in measurement['timing']['groups'].items():
    add(f"| {group} input→feedback | 20samples; p50={fmt(stats['p50Ms'])}ms; p95={fmt(stats['p95Ms'])}ms | Local two-frame upper-bound proxy; không phải fieldINP |")
add('\nRaw tổng hợp: '+link(REL+'/raw/ui-measurements-summary-2026-10-04.json','measurements')+'. 80record tổng hợp từ bốn lượt UI được đối chiếu persisted trên DB test; không phải giao dịch native.\n')
add('Ảnh UI375px cuối: '+link(REL+'/screenshots/gatepass-375-final-2026-10-04.png','Gate Pass / scanner web')+'; lỗi read sau sửa: '+link(REL+'/screenshots/read-error-bounds-375-after-2026-10-04.png','banner lỗi có giới hạn')+'.\n')
add('WCAG áp dụng contrast cả placeholder: [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).\n')
add('## Top10 ưu tiên kiểm chứng tiếp\n')
for item in [
 'Android: nạp phiên bản nguồn mới vào Expo Go bằng thao tác được hỗ trợ; xác nhận API3001 trước giao dịch.',
 'M-N-001: logout/refresh/login/reconnect native; phiên cũ không khôi phục token hoặc xóa phiên mới.',
 'Cổng native: Gate-in/QR/readiness/Gate-out, fail/pending/double-submit; đối chiếu persisted state.',
 'M-004/M-005: đo hitbox/gap320–768dp, font150/200%, keyboard và safe area cả hai theme.',
 'M-010/M-011: picker ngày/giờ và cold-launch/theme persistence native.',
 'Web: hoàn tất các form/overlay theo lớp quyền và đường dẫn entity không tồn tại; tránh thao tác nhầm bản ghi.',
 'Web/Android: screen-reader speech và Android external keyboard; props/XML không đủ.',
 'Web: hoàn thành ma trận delay1/5s, offline/reconnect401/403/409/422/500 theo màn và overlay.',
 'Performance: năm route production có auth;100mẫu input→feedback đã có. FieldINP và dữ liệu người dùng thực tế vẫn riêng.',
 'Re-audit toàn matrix và tính lại cùng IDs/trọng số; mỗi dimension≥23 và tổng≥95 trước nghiệm thu.'
]:add('- [ ] '+item)
add('\n## Kiểm tra kỹ thuật và nghiệp vụ\n')
for file in ['raw/final-verification-manifest-feedback-2026-10-04.json','raw/technical-check-exits-feedback-2026-10-04.json','raw/dependency-detail-checkpoint-2026-10-04.md','raw/web-sdk-source-tests-feedback-2026-10-04.txt','raw/web-runtime-fixtures-feedback-2026-10-04.txt','raw/web-existing-ui-regressions-feedback-2026-10-04.txt','raw/web-typecheck-feedback-2026-10-04.txt','raw/mobile-tests-2026-10-04.txt','raw/mobile-typecheck-2026-10-04.txt','raw/web-build-feedback-2026-10-04.txt','raw/lint-feedback-2026-10-04.txt','raw/root-auth-recovery-independent-green-2026-10-04.txt','raw/billing-regressions-2026-10-04.txt','raw/web-types-api/workflows-completed.json','raw/web-types-api/final-persisted-state.json','raw/browser/qr-runtime-decode.json']:
    if (RUN/file).is_file():add('- '+link(REL+'/'+file,Path(file).name))
add('\nBộ kết quả606/606tests:431chạy lại trên mã cuối (web/SDK122, fixtures257, runtimeUI52), cộng175mobile source giữ từ lượt trước vì mã mobile không đổi. ESLint0errors/0warnings; web typecheck/build exit0. Mobile175 không phải175case native. Manifest ghi hash220file nguồn và hash log; không cộng lại test subset vào tổng.\n')
add('\nWorkflow API:132 assertions thực tế trên DB test; Manifest→MBL/HBL, Gate-in, bãi, inspection/booking, billing, Holds/readiness, Gate Pass/use/Gate-out, EDI MOCK và partner handover. Trạng thái workflow-fixtures là snapshot từng giai đoạn; final-persisted-state ưu tiên cho trạng thái hiện tại. Không suy luận native đã thực hiện các giao dịch này.\n')
perf=RUN/'raw/performance/lighthouse-summary.json'
if perf.is_file():
    d=json.loads(perf.read_text(encoding='utf-8'));stats=d.get('statistics',{})
    add('Lighthouse3lượt production **Login only**: '+link(REL+'/raw/performance/lighthouse-summary.json','summary')+'.\n')
    add('```json\n'+json.dumps(stats,ensure_ascii=False,indent=2)+'\n```\n')
add('## Coverage tám nhóm và giới hạn\n')
add('| Nhóm | Có bằng chứng | Phần tiếp tục |')
add('|---|---|---|')
for row in [
 ('Accessibility','Contrast72cases; axe main/overlay; keyboard modal/map','Live screen-reader, native target/font/safe-area; incomplete axe manual'),
 ('Interactive states','Fixtures; real save/reject; native hover/pressed/frame transition','Full runtime delay/offline/permission matrix'),
 ('Layout','Web320/375/768/1440 captures and overflow repairs','Real200%zoom; native new-source geometry'),
 ('Forms','Labels/field errors/input retention; decimal/time/date checks','All overlay native/browser transactional acceptance'),
 ('Tokens','Named semantic web/mobile roles; shared Legend/model tests','Full-source exceptional geometry and pixel checks'),
 ('Navigation','Canonical URL IDs; real Back/Forward/draft; exact permissions','Every deep link/auth/error/role cross-product native'),
 ('Microcopy','Known enums/templates; unavailable/stale and next actions','Native actual strings/text scaling across secondary screens'),
 ('Performance','ProductionLogin lab3runs; lazy chunks;100feedback timings','Authenticated5routes; fieldLCP/INP/CLS')
]:add('| '+' | '.join(row)+' |')
add('\n## Plan tiếp tục và bàn giao\n')
add('- [x] Lưu snapshot trước sửa; giữ working tree của người dùng.')
add('- [x] Database/API test cô lập và tài khoản bảy lớp quyền; runtime backend thật.')
add('- [x] Work packages mã nguồn và regression; phát hiện/sửa thêm lỗi độc lập.')
add('- [x] Web UX Gap≥95 và từng dimension≥23 trong rubric đã khóa; measurement và raw giữ đầy đủ.')
add('- [ ] Hoàn tất native Android và toàn bộ runtime acceptance còn pending.')
add('- [ ] Chạy lại checks sau thay đổi cuối; bổ sung evidence tương ứng thay vì đổi mẫu số.')
add('- [ ] Đạt≥95/các dimension≥23; Nielsen≥95 cùng coverage đầy đủ thiết yếu.')
add('- [ ] Re-audit cuối, khôi phục cấu hình emulator/API và chỉ dừng runtime của audit khi hoàn tất.')
add('\n**Next action:** xử lý các ô UNKNOWN theo Top10; phiên audit tiếp tục ở checkpoint này. Chưa kết luận sẵn sàng ship.\n')
add('Automatic approval review đã từ chối thao tác reload/intent Expo Go với lý do “blocked by policy”. Hiện ADB không có thiết bị kết nối. Không thử lại hoặc đi đường vòng; cần emulator mở và app nguồn hiện tại được nạp bằng thao tác được hỗ trợ trước khi đóng các acceptance Android.\n')
REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
assert before=={p:sha(ROOT/p) for p in before},'Historical audit was changed'
save(REL+'/checkpoint-manifest.json',{'generated_at':NOW,'report':REPORT.relative_to(ROOT).as_posix(),'historical_hashes_preserved':before,'changed_source_files':len(source_changes),'head':manifest['head'],'source_snapshot':REL+'/source-before','target_met':False,'web_ux_target_met':scores['platforms']['web']['ux_gap']['min']>=95,'technical_manifest':REL+'/raw/final-verification-manifest-feedback-2026-10-04.json'})
print(json.dumps({'report':str(REPORT),'findings':dict(counts),'changed_source_files':len(source_changes),'scores':{p:{'ux_gap_min':scores['platforms'][p]['ux_gap']['min'],'nielsen':scores['platforms'][p]['nielsen']['observed']} for p in ['web','mobile']}},ensure_ascii=True))
