"""Record adjacent before/after snapshots for the Oct04 fixes; no app mutations."""
import difflib
import hashlib
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / 'audit/runs/2026-10-03-improvement-02'
batch = RUN / 'fixes/dependency-detail-2026-10-04'
batch.mkdir(parents=True, exist_ok=True)
container = ROOT / 'apps/web/src/components/ContainersView.tsx'
pairs = [
    ('W-N-022-provider', RUN/'raw/progressive-dependencies-AppContext-before-2026-10-04.tsx', ROOT/'apps/web/src/context/AppContext.tsx'),
    ('W-N-022-container', RUN/'raw/location-before/ContainersView.tsx', RUN/'raw/container-derived-sections-before-2026-10-04.tsx'),
    ('W-N-023', RUN/'raw/container-derived-sections-before-2026-10-04.tsx', RUN/'raw/container-narrow-header-before-2026-10-04.tsx'),
    ('W-N-024', RUN/'raw/movement-identity-mapper-before-2026-10-04.ts', ROOT/'apps/web/src/services/mappers/live-view.mapper.ts'),
    ('W-N-025', RUN/'raw/container-narrow-header-before-2026-10-04.tsx', RUN/'raw/container-detail-selection-before-2026-10-04.tsx'),
    ('W-N-026', RUN/'raw/container-detail-selection-before-2026-10-04.tsx', container),
]
rows = []
for label, before, after in pairs:
    assert before.is_file() and after.is_file(), label
    patch = batch / f'{label}.diff'
    patch.write_text(''.join(difflib.unified_diff(
        before.read_text(encoding='utf-8-sig').splitlines(True),
        after.read_text(encoding='utf-8-sig').splitlines(True),
        fromfile=before.relative_to(ROOT).as_posix(), tofile=after.relative_to(ROOT).as_posix())), encoding='utf-8')
    assert patch.stat().st_size > 0, f'Expected change: {label}'
    rows.append({'finding': label, 'before': before.relative_to(ROOT).as_posix(),
                 'after': after.relative_to(ROOT).as_posix(), 'diff': patch.relative_to(ROOT).as_posix(),
                 'before_sha256': hashlib.sha256(before.read_bytes()).hexdigest(),
                 'after_sha256': hashlib.sha256(after.read_bytes()).hexdigest()})
(batch/'manifest.json').write_text(json.dumps({'at': datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).isoformat(),
    'policy': 'Adjacent source snapshots isolate each fix; original source-before and reports preserved.',
    'files': rows}, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
(RUN/'raw/dependency-detail-checkpoint-2026-10-04.md').write_text('''# Kiểm chứng W-N-022–026 / 2026-10-04

Giữ thiết kế, enum/contract backend và nghiệp vụ hiện có. Không tạo giao dịch trong các browser case dưới đây. Các snapshot/diff liền kề nằm tại `fixes/dependency-detail-2026-10-04/manifest.json`; diff toàn đợt từ source-before được ghi riêng là shared-file review diff.

| ID | Nguyên nhân và sửa | Regression và runtime |
|---|---|---|
| W-N-022 / P1 | Field liên kết chỉ được cập nhật khi mọi read hoàn tất. Provider reconcile khi dependency hoàn tất; vị trí chưa xác minh có copy trung tính, cache bị cấm đọc bị bỏ. | Provider RED/GREEN và location fixtures; actual read shipping-lines chậm5s: trước sửa container đã xếp báo Chưa xếp; sau sửa hiện đúng vị trí canonical khi global pending=true. Holds vẫn chưa xác minh, không bật giao dịch từ dữ liệu chưa xác nhận. |
| W-N-023 / P1 | Detail invoices/MO/handover dùng array trống như absence thành công. Availability và count theo resource; tạo lệnh chỉ khi xác nhận absence, handover.create kiểm riêng. | RED:14 thất bại thực; GREEN:31 location/derived/permission cases. GATE_STAFF thật: invoices403 có alert, count trung tính, không false-zero/empty hoặc dữ liệu tiền. |
| W-N-024 / P2 | Backend MovementOrder không có orderCode/orderNumber; mapper làm mất identity. | Contract RED/GREEN; dùng canonical id backend. Container360 thực tế hiện UUID của đúng lệnh, không invent mã hoặc đổi schema. |
| W-N-025 / P2 | Header flex co heading; tab label bị co và wrap nhiều dòng tại320px. Header wrap badge, nút đóng shrink0, tab nowrap trong thanh cuộn hiện có. | Đo trước/sau native browser actual320/375/768/1440px, identifier11ký tự cao25px=line-height25px, không document/body overflow. Đây là reflow test, không phải zoom200%. Không viết test chỉ mirror utility class. |
| W-N-026 / P2 | Selected tab chỉ thể hiện qua màu. Sáu native button có aria-pressed theo state thực. | RED thiếu aria-pressed; GREEN32/32 bao gồm31 case cũ. Native browser Enter vào mỗi tab: đúng một pressed=true; focus-visible solid2px. Không suy luận lời đọc screen reader. |

## Giới hạn bằng chứng

- `container-dialog-requested320-invalid-actual1440-oct04.json` là EXCLUDED: viewport handle cũ không đổi innerWidth. Đã đo lại bằng capability mới xác nhận320px thực.
- `progressive-containers-catalog5s-series-2026-10-04.json` giữ nguyên FAIL trước sửa; artifact sau sửa riêng, không ghi đè failure.
- Timestamp CUA là thời điểm quan sát host, không đo input→paint p95 hoặc INP.
- Một role hoặc một section progressive không đủ để nâng toàn observation loading lên PASS.
- Android nguồn mới, screen-reader speech, zoom200%, hover/pressed và performance route có auth còn UNKNOWN.
''', encoding='utf-8')
print(json.dumps({'diffs': len(rows), 'checkpoint': str(RUN/'raw/dependency-detail-checkpoint-2026-10-04.md')}))
