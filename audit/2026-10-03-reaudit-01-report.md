# ICD — Báo cáo re-audit UI/UX 01 · 03/10/2026

## Executive summary

Đã xử lý và xác minh **1 P0 + 8 P1** trong phạm vi được duyệt. Giữ UI, bố cục và contract nghiệp vụ hiện có. Các bằng chứng gồm thao tác browser, Android Expo Go/ADB, phép đo DOM/XML/pixel và fixture component thật; từng giới hạn được ghi riêng. Không tạo giao dịch, tài khoản hoặc thay quyền trên backend.

**29 finding P2/P3 từ baseline vẫn OPEN (26 P2, 3 P3)**; thêm hai phần việc P2 còn lại trong finding tổng hợp W-S-005/W-S-016, không tính là lỗi mới. M-005 có cải thiện header/Gate-in khi sửa vùng chạm, nhưng nhãn tab ở 320dp còn rút gọn; không đóng finding hoặc tự tăng điểm cho P2.

**Chưa đủ bằng chứng để kết luận sẵn sàng ship toàn bộ sản phẩm.** Không còn P0/P1 đã xác minh trong phần sửa được duyệt; ESLint còn FAIL, các role khác ADMIN, iOS, TalkBack/VoiceOver, keyboard RN và giao dịch thực tế vẫn chưa xác minh đầy đủ. Điểm dưới đây không phải chứng nhận WCAG.

Baseline giữ nguyên: [Báo cáo trước sửa](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/2026-10-03-report.md>). Dữ liệu tái lập: [manifest](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/manifest.json>), [findings](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>), [scores](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/scores.json>), [coverage](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/coverage.json>).

## Điểm số trước và sau

| Nền tảng | UX Gap baseline | UX Gap re-audit | Tăng điểm tối thiểu | Nielsen baseline → re-audit | Coverage observation |
|---|---:|---:|---:|---:|---:|
| web | 48.7–79.4 | **57.4–88.1** | +8.7 | 30.0 → **55.0** | 78% |
| mobile | 39.1–69.6 | **42.2–72.7** | +3.1 | 45.0 → **60.0** | 78% |

UX Gap: đầu khoảng là điểm tối thiểu có bằng chứng; cuối khoảng giả sử UNKNOWN đạt. Giữ nguyên observation ID, trọng số, mẫu số và N/A. Chỉ 9 observation FAIL → PASS có evidence mới được đổi. Không thêm điểm cho số màn vừa chụp. Mobile dùng adaptation native của baseline.

| Dimension / tối đa 25 | Web trước → sau | Mobile trước → sau |
|---|---:|---:|
| Typography & Spacing | 14.5–21.0 → 14.5–21.0 | 12.0–14.0 → 12.0–14.0 |
| Interactive States | 8.5–21.0 → 11.2–23.8 | 4.2–25.0 → 4.2–25.0 |
| Content Hierarchy | 18.7–20.2 → 22.0–23.5 | 13.5–16.0 → 16.0–18.5 |
| Loading & Error UX | 7.0–17.2 → 9.7–19.9 | 9.5–14.6 → 10.0–15.2 |

Nielsen: severity 0–4, lấy mức cao nhất còn OPEN của từng heuristic; điểm quy đổi dự án = 100 − 2.5 × tổng severity. Đây không phải thang điểm 0–100 chính thức của Nielsen. Khoảng bất định giữ **web 0–55, mobile 0–60** vì các scope UNKNOWN chưa kiểm.

| Heuristic | Web severity trước → sau | Mobile severity trước → sau |
|---|---:|---:|
| H1 — Trạng thái hệ thống | 4 → 2 | 2 → 2 |
| H2 — Phù hợp thực tế | 2 → 2 | 2 → 2 |
| H3 — Quyền kiểm soát | 4 → 2 | 3 → 0 |
| H4 — Nhất quán | 3 → 2 | 3 → 2 |
| H5 — Ngăn lỗi | 3 → 2 | 3 → 2 |
| H6 — Nhận biết | 3 → 2 | 2 → 2 |
| H7 — Hiệu quả | 3 → 2 | 2 → 2 |
| H8 — Thông tin cần thiết | 2 → 2 | 2 → 2 |
| H9 — Phục hồi lỗi | 4 → 2 | 3 → 2 |
| H10 — Trợ giúp | 0 → 0 | 0 → 0 |

## Finding P0/P1 đã sửa

| ID / severity | Category | Thay đổi và cách xác minh | Evidence source sau sửa | Giới hạn |
|---|---|---|---|---|
| W-S-020 / P0 VERIFIED | states | Chuẩn hóa JSON đã redacted thành văn bản; khai báo JsonValue đúng kiểu; thêm ErrorBoundary riêng cho màn hình và nút về Tổng quan. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/W-S-020-green.txt>) | [redacted-log-body.ts](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/redacted-log-body.ts:3>) | Đã mở log thực tế ở 3 viewport; lỗi render cưỡng bức, dữ liệu falsy và bảo vệ redaction kiểm bằng fixture. Không gửi API đối tác. |
| M-001 / P1 VERIFIED | interactive | Nâng minima vùng chạm thành 48dp; header xuống hàng ở màn hẹp, nhãn Gate-in/out co và wrap trong vùng chạm. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile/hit-area-measurements.json>) | [AppHeader.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/AppHeader.tsx:49>) | 352 mẫu XML: 331 vùng đầy đủ đạt ≥48dp, 21 mẫu bị cắt mép viewport loại khỏi phép kết luận kích thước. Android thường và 320dp/font150%; chưa có iOS. |
| M-002 / P1 VERIFIED | accessibility | Tách màu chữ semantic, màu fill và chữ trên fill; tăng contrast success/warning và xác nhận đăng xuất cho sáng/tối. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile/contrast-measurements.json>) | [colors.ts](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/colors.ts:7>) | 9 cặp màu chữ native có RGB pixel thực tế đạt ≥4.5:1. Kết quả chỉ áp dụng các cặp đã đo, không chứng nhận toàn bộ màu của app. |
| M-003 / P1 VERIFIED | navigation | Phiên không có tab được phép có hành động mở Tài khoản để yêu cầu quyền và dùng luồng đăng xuất hiện có. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/mobile/fix-log.json>) | [MainTabNavigator.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/navigation/MainTabNavigator.tsx:26>) | Điều hướng zero-tab và hủy/xác nhận đăng xuất được kiểm bằng fixture. Native zero-tab UNKNOWN vì không có tài khoản tương ứng; native ADMIN chỉ mở/hủy đăng xuất, không đăng xuất thật. |
| W-S-001 / P1 VERIFIED | accessibility | 15 overlay dùng dialog có tên, focus ban đầu, trap Tab/Shift+Tab, khóa nền, Escape và trả focus về nút mở; giữ điều kiện khóa khi đang gửi. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/W-S-001/inventory.json>) | [ModalOverlay.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ModalOverlay.tsx:13>) | 12/15 loại overlay chạy trực tiếp trong browser. MBL/HBL/thanh toán không mở được với dữ liệu hiện tại; kiểm component thật bằng fixture. Đây không phải bằng chứng native browser cho 3 loại đó. |
| W-S-002 / P1 VERIFIED | accessibility | Thêm 59 liên kết label htmlFor/id cho field vận hành; giữ ARIA name đã có. Label được click để đối chiếu focus. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/W-S-002/inventory.json>) | [TruckVisitsView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:189>) | Field có điều kiện kiểm thêm qua 9 fixture component thật, 37 field hiển thị. Chưa xác nhận thông báo screen reader thực tế. |
| W-S-003 / P1 VERIFIED | accessibility | 5 danh sách master/detail dùng button type=button, aria-pressed và focus ring; Enter/Space chọn đúng bản ghi. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/W-S-003/inventory.json>) | [ManifestsView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ManifestsView.tsx:210>) | Đã thao tác keyboard cả 5 danh sách bằng dữ liệu hiện có; không ghi giao dịch. |
| W-S-005 / P1 VERIFIED | states | Thanh toán có khóa ref đồng bộ chống gửi trùng, disabled/loading, khóa đóng/sửa lúc pending và lỗi phục hồi giữ nguyên input. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/W-S-005/evidence.json>) | [BillingView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/BillingView.tsx:65>) | 4 fixture async component thật; không tạo thanh toán. Chỉ phần P1 thanh toán được duyệt; các action phi tài chính còn là việc P2 ngoài phạm vi. |
| W-S-016 / P1 VERIFIED | states | Theo dõi ready/unavailable/forbidden của Holds/Gate Pass từng visit; giữ dữ liệu stale khi lỗi tạm thời, xóa dữ liệu khi mất quyền; cảnh báo/retry và màu bãi chưa kiểm tra. [bằng chứng](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-safety/independent-review-tests.txt>) | [visit-safety-data.ts](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/visit-safety-data.ts:4>) | Fixture GET lỗi trang sau, 403, thiếu status, stale, empty thật và retry đã chạy. Không ép lỗi backend thật. Manifest/Role/Handover detail phi an toàn vẫn là việc P2 ngoài phạm vi. |

### Kiểm chứng có thể tái lập

- Web: 18 màn × 3 viewport (1440/768/375) = **54 capture/measurement mới**; các selector Enter/Space và dialog có log riêng: [5 selector](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/keyboard-selectors.json>), [modal keyboard](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/modal-keyboard-checks.json>). Log modal giữ cả lần phát hiện trap lỗi và lần chạy đạt sau sửa; chỉ kết quả cuối được dùng đóng lỗi.
- 15 overlay đã tích hợp; 12 loại mở được trực tiếp. 9 fixture component thật kiểm 37 field có điều kiện và luồng Escape/focus: [review độc lập](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-conditional-forms/review.md>).
- Android: **36 capture** sáng/tối, thường và 320dp/font150%. **331/331 mẫu vùng đầy đủ đạt ≥48dp; 21/352 mẫu bị cắt viewport loại khỏi kết luận**, không giả sử chúng đạt: [phép đo độc lập](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile/measurements-independent-verification.json>). Không thấy overlap trong các mẫu đã đo.
- Contrast native đo pixel thực: success sáng **3.58 → 5.21:1**, warning sáng **3.07 → 6.84:1**, logout tối **2.69 → 6.29:1**. 9 cặp đã đo đạt 4.5:1; color foreground/fill được kiểm đúng pixel ảnh.
- Lỗi GET-critical: fixture phân biệt empty thật với unavailable/forbidden, không mất stale rows khi lỗi tạm thời, không giữ dữ liệu khi 403, và không hiển thị bãi xanh/no-Hold khi thiếu status: [review độc lập](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-safety/independent-review.md>).
- Diff từng ID: [thư mục fixes](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes>); snapshot before/after và inventory giữ nguyên. Diff ở file dùng chung có ghi phần giao nhau của các finding được duyệt. Các snippet đề xuất gốc vẫn nằm trong báo cáo baseline và findings JSON.

### Ví dụ thay đổi tối thiểu

```tsx
// JSON đã redacted; không đưa object trực tiếp vào React child.
<pre>{formatRedactedLogBody(selectedLog.requestBodyRedacted)}</pre>

// Giữ semantics chuẩn và nhãn rõ ràng.
<label htmlFor="truck-plate">Biển số xe</label>
<input id="truck-plate" />
<button type="button" aria-pressed={selected} onClick={selectRecord}>
  {recordLabel}
</button>
```

## Backlog P2/P3 — toàn bộ finding chưa đóng

Các mục dưới đây giữ severity gốc, không tự áp dụng fix. Evidence source có thể là dòng hiện tại không đổi hoặc snapshot baseline khi dòng đã sửa trong fix P1; đây là nơi tái hiện gốc, không phải khẳng định mọi trạng thái đã tái hiện lại. Finding JSON lưu location_status và baseline_evidence để phân biệt.

| ID / severity | Platform / category | Vấn đề | Evidence file:line | Fix đề xuất / verify |
|---|---|---|---|---|
| M-004 / P2 OPEN | mobile / interactive | Khoảng cách giữa vùng chạm nhỏ hơn8dp | [AppHeader.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/M-001/before/apps/mobile/src/components/AppHeader.tsx:127>) | Use spacing.sm (8dp) for adjacent independent controls and preserve it when targets grow.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-005 / P2 OPEN | mobile / layout | Màn hẹp/font lớn làm chồng và tràn header | [AppHeader.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/AppHeader.tsx:86>) | Give header information and action controls separate rows on narrow/scaled layouts; constrain/wrap segment labels within flex:1 and let the segments grow vertically.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-006 / P2 OPEN | mobile / microcopy | Mã enum/tiếng Anh lẫn trong giao diện nghiệp vụ | [ContainerDetailScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/containers/screens/ContainerDetailScreen.tsx:72>) | Use shared localized display maps for statuses/types and notification templates while preserving stored API codes.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-007 / P2 OPEN | mobile / forms | Kiểm tra seal vẫn yêu cầu mức hư hỏng | [SurveyHomeScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:88>) | Use a neutral inspection title/placeholder and render severity only for damage surveys.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-008 / P2 OPEN | mobile / navigation | Lịch sử giám định hiển thị rỗng trước khi tải xong | [SurveyHomeScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:40>) | Track history loading/error separately, display LoadingState or local ErrorState with retry, and show empty only after a successful response.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-009 / P2 OPEN | mobile / navigation | Tổng số chưa đọc được truyền nhưng không hiển thị | [NotificationsScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:62>) | Render the unread total inside the notification screen or add a dedicated subtitle line in AppHeader.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-010 / P2 OPEN | mobile / forms | Ngày booking cần nhập timestamp thủ công | [YardOperationsScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/YardOperationsScreen.tsx:74>) | Offer date/time controls appropriate to the platform and retain an explicit UTC+7 helper; a minimal alternative is persistent format help plus input normalization.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-011 / P2 OPEN | mobile / tokens | Chế độ sáng/tối không được lưu khi mở lại app | [ThemeProvider.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/ThemeProvider.tsx:9>) | Persist a selected appearance preference, initialize it before showing app content, and use system appearance when no preference is stored.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-012 / P2 OPEN | mobile / forms | Lỗi thiếu input vẫn còn sau khi đã điền | [SurveyHomeScreen.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:107>) | Associate errors with individual fields and clear/re-evaluate missing-field errors on input edits without erasing server errors indiscriminately.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-014 / P2 OPEN | mobile / accessibility | Tiêu đề card thiếu semantics heading | [ScreenLayout.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/ScreenLayout.tsx:28>) | Mark the current meaningful section/title Text as header, avoiding decorative labels or duplicate parent accessibility grouping.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-R-001 / P2 OPEN | web / accessibility | Chữ thông tin phụ thiếu tương phản | [ManifestsView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ManifestsView.tsx:234>) | Use a darker semantic supporting-text token on these light surfaces; preserve status colors and layout. Measure each resulting foreground/background pair.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-R-002 / P2 OPEN | web / accessibility | Tìm kiếm bản đồ bãi thiếu chỉ báo focus | [YardSiteMap.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardSiteMap.tsx:114>) | Add focus-visible ring to the existing input or focus-within ring to its current wrapper.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-004 / P2 OPEN | web / states | Form đóng và xóa input trước khi biết kết quả lưu | [MasterDataView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MasterDataView.tsx:37>) | Await outcome and preserve the form on failure.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-006 / P2 OPEN | web / forms | Thiếu trường bắt buộc nhưng handler thoát mà không chỉ lỗi | [MasterDataView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MasterDataView.tsx:38>) | Add explicit field-specific validation with preserved input and focus.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-007 / P2 OPEN | web / accessibility | Lựa chọn role/quyền chỉ thể hiện bằng màu | [UsersRolesView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/UsersRolesView.tsx:130>) | Pair selected styles with programmatic state.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-008 / P2 OPEN | web / microcopy | Chi tiết Gate Pass hiển thị sai trạng thái hết hạn/hủy | [GatePassView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/GatePassView.tsx:205>) | Derive one display status and render distinct status copy/actions.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-009 / P2 OPEN | web / states | Container 360 dùng biểu tượng thay cho QR chứa token | [ContainersView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:674>) | Render the existing QR component or label an icon as decorative.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-010 / P2 OPEN | web / states | Readiness chưa biết bị trình bày như điều kiện không đạt | [ContainersView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:415>) | Give pending and unknown their own states.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-011 / P2 OPEN | web / forms | Giờ hết hạn mặc định của lệnh lệch giờ địa phương | [MovementOrdersView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MovementOrdersView.tsx:14>) | Format local datetime correctly and state the timezone.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-012 / P2 OPEN | web / navigation | Việc ca truyền sai loại ID khi mở handover | [WorkQueueView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/WorkQueueView.tsx:81>) | Pass/resolve a canonical handover identifier.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-013 / P2 OPEN | web / navigation | Shortcut tạo chuyến xe mất ngữ cảnh container | [MovementOrdersView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MovementOrdersView.tsx:129>) | Propagate the context to the destination and perform the advertised opening action.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-014 / P2 OPEN | web / navigation | Điều hướng trong bộ nhớ làm mất ngữ cảnh/form | [App.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/App.tsx:29>) | Address screens/context and retain view state using the installed router and local draft state.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-015 / P2 OPEN | web / states | Một số danh sách rỗng không hướng dẫn bước tiếp theo | [AuditsView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/AuditsView.tsx:61>) | Explain settled empty and no-match states with context-appropriate next steps.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-017 / P2 OPEN | web / microcopy | EDI gọi dữ liệu ví dụ sinh sẵn là payload đã truyền | [EDIView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/EDIView.tsx:30>) | Show the real backend payload or clearly name the illustrative preview.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-018 / P2 OPEN | web / states | Trang chỉ đọc vẫn hiển thị thao tác ghi | [permissions.ts](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/permissions.ts:4>) | Expose only authorized actions or explain unavailable actions before use.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-S-019 / P2 OPEN | web / navigation | Popover thông báo không đóng bằng Escape/click ngoài | [Header.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:10>) | Add dismissal and a reachable explicit close control without modal behavior.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| M-013 / P3 OPEN | mobile / tokens | Header/layout dùng literal ngoài token hiện có | [AppHeader.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/AppHeader.tsx:98>) | Add named roles for intentional values, reuse existing typography/spacing roles where appropriate, and use contrast-safe fill/on-fill tokens coordinated with M-002.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-R-003 / P3 OPEN | web / tokens | Cỡ chữ metadata lặp lại ngoài hệ token | [DashboardView.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/DashboardView.tsx:339>) | Centralize the existing small type roles and apply their aliases; keep the current visual values initially and remove scattered duplicate literals.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |
| W-R-004 / P3 OPEN | web / layout | Line-height heading chưa theo rubric của dự án | [Header.tsx](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:26>) | Define a heading role with an appropriate line-height and check wrapped localized headings; retain current font sizes and hierarchy.; [code mẫu và tiêu chí verify](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/findings.json>) |

### Phần việc còn lại trong hai finding tổng hợp

- **W-S-005/P2:** pending guard các action phi tài chính (Truck/EDI/khác) chưa sửa; phần thanh toán P1 đã verify. Dùng handler gốc và fixture deferred Promise để kiểm lần gửi lặp.
- **W-S-016/P2:** availability của Manifest bills, Role detail, Handover detail chưa sửa; Holds/Gate Pass P1 đã verify. Reject từng GET trong fixture và yêu cầu hiển thị partial/unavailable thay vì im lặng. Các phần này nằm trong finding gốc, không được cộng thành 2 finding mới.

### Top 10 đề xuất cho lượt tiếp theo

| Thứ tự | Finding | Lý do / thao tác verify |
|---:|---|---|
| 1 | W-S-011 / P2 | Sai giờ hết hạn ảnh hưởng thao tác thực tế; kiểm UTC→giờ Việt Nam quanh nửa đêm. |
| 2 | W-S-012 / P2 | Shortcut review có thể mở sai đối tượng; fixture đúng handoverId. |
| 3 | W-S-013 / P2 | Shortcut Truck Visit mất container; kiểm form và context theo containerVisitId. |
| 4 | W-S-004 / P2 | Mất bản nháp khi API trả lỗi; deferred reject giữ input/modal. |
| 5 | W-S-006 / P2 | Không xác định lỗi field; kiểm nhãn, inline error, focus và lỗi có hướng sửa. |
| 6 | W-S-008 / P2 | Trạng thái expired/cancelled gây hiểu sai; fixture từng trạng thái và thời gian. |
| 7 | W-R-001 / P2 | Chữ hỗ trợ vận hành contrast thấp; đo pixel/DOM ≥4.5:1 và giữ token. |
| 8 | W-R-002 / P2 | Ô tìm bãi thiếu focus; Tab và screenshot focus-visible. |
| 9 | M-007 / P2 | Seal check còn trường damage severity; fixture từng loại giám định. |
| 10 | M-012 / P2 | Thông báo thiếu field không xóa khi nhập đủ; đổi field và kiểm message. |

## Kết quả công cụ và performance

| Kiểm tra | Kết quả | Raw output |
|---|---|---|
| Web source tests | 54/54 PASS | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-tests-final.txt>) |
| Mobile tests | 132/132 PASS | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile-tests-final.txt>) |
| Approved fix fixtures | 57/57 PASS; gồm source/React component/async regressions | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/approved-fix-fixtures-final.txt>) |
| Web build + TypeScript | PASS; vẫn có cảnh báo chunk >500kB | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-semantics/build-final.txt>) |
| Mobile typecheck | PASS | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile-typecheck-final.txt>) |
| ESLint | FAIL: 290 errors / 3 warnings (baseline291/3) | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/eslint.json>) |
| kz browser checks | 108 lần EXECUTED = layout+table ×54 màn; không đồng nghĩa tất cả PASS. 6 check gốc khác NOT_RUN_INCOMPATIBLE với evaluate read-only. | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/kz-browser-checks.json>) |
| frontend-law-auditor | 38.42 không đổi; diagnostic MasterData partial evidence, không thay rubric UX Gap/Nielsen | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/law-report.json>) |
| Color4 rendered web | 5248 samples:4142PASS/333FAIL/770UNKNOWN/3EXEMPT; FAIL mẫu lặp/candidate, không phải333finding. W-R-001 vẫn OPEN. | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/contrast-color4-results.json>) |
| Console cuối browser | 0 error entries trong tab audit | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/console-errors-final.json>) |
| Scope integrity | PASS: 34/200 file baseline đổi; không đổi config/backend/shared contract được bảo vệ | [log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/source-integrity.json>) |

Lighthouse production Login: 3 lượt cùng phiên bản/cấu hình baseline; LCP median **1810ms** (1807–1826), CLS **0**, TBT median **10ms** (4–12.5), performance **98**, accessibility **100**. Baseline LCP1808ms/TBT10.5ms/performance99: chênh nhỏ trong mẫu lab, không suy diễn cải thiện/thoái lui có ý nghĩa. **TBT không phải INP.** Accessibility100 chỉ cho Login và audit được chọn, không áp dụng toàn bộ màn đã đăng nhập.

Báo cáo/raw Lighthouse: [summary](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/lighthouse-summary.json>). Không có field CWV, INP thực tế hoặc performance authenticated.

## Coverage và UNKNOWN

Giữ 140 hàng coverage baseline. 54 hàng màn web có phép đo mới; các hàng không chạy lại được ghi NOT_RETESTED. 36 native capture được thêm riêng với hình/XML/density/font scale; không tự ánh xạ ảnh này thành PASS cho toàn bộ luồng native. PASS ở coverage chỉ có nghĩa màn được mở/đo, không phải mọi yêu cầu UX đạt.

| ID | Scope | Cách xác minh tiếp |
|---|---|---|
| U-01 | roles other than ADMIN | No role-specific test session supplied; no users created or permission changes made. |
| U-02 | iOS/VoiceOver | No iOS runtime; Android evidence does not establish iOS behavior. |
| U-03 | live screen reader; external keyboard on RN | No actual TalkBack/VoiceOver/web screen-reader announcement test. DOM/XML/accessibility props alone are insufficient. |
| U-04 | POST/PATCH/DELETE outcomes; success and rejected save; offline queue | No business writes authorized; conditional handler flaws are source-verified, real transaction outcomes remain unknown. |
| U-05 | full axe and6 original kz checks | CUA evaluate is DOM-read-only; scripts inject/mutate DOM/state/listeners. Only compatible table/layout run. Login-only Lighthouse embedded axe is separately scoped. |
| U-06 | hover runtime, browser zoom200%, exact320px reflow | 375/768/1440 viewport tests done; actual zoom/hover and320px run not performed. Do not equate375px with WCAG reflow at320px. |
| U-07 | Core Web Vitals field and INP | Only production Login navigation lab runs; TBT is not INP. No authenticated performance/real-user dataset. |
| U-08 | native runtime | Current ADMIN session or unmet operation/role prerequisite; source reviewed, no test records/users created. |
| U-09 | all unavailable data variants | Camera denied tested; no complete network failure matrix or artificial response fixtures. Record data availability separately from verified empty. |
| U-10 | pixel confirmation of secondary contrast candidates | Color4 supports measured computed styles; Login Lighthouse reports100. Reconcile the method/scope difference with pixel validation before confirming these extra candidates. Modal-obscured background samples and decoration excluded from actionable contrast evidence. |
| U-11 | not captured state/theme/viewport combinations | Source inventory reviewed; no claim every overlay has been exercised at every viewport/theme. Full cross-product remains in coverage as UNKNOWN. |

Fixture mới đã làm rõ một số lỗi pending/GET/no-tab; không thay bằng chứng giao dịch hoặc vai trò native thực tế. Web không có theme thứ hai nên theme switch N/A. iOS/HIG giữ UNKNOWN, không suy diễn từ Android.

## Kế hoạch fix → verify → re-audit tiếp theo

- [x] Phase0–4: baseline, tool manifest, source snapshot, coverage, rubric và báo cáo gốc đã lưu.
- [x] Phase5: sửa 9 ID P0/P1 được duyệt; diff, RED/GREEN, acceptance và review độc lập đã lưu.
- [x] Phase6: chạy lại các scan tương thích, kiểm phần đã sửa, đo trước/sau và tính lại rubric cùng mẫu số.
- [x] Khôi phục emulator density420/font1.0/theme sáng; camera granted như baseline; không đổi quyền location. Browser reset viewport, đóng tab22 riêng, bảo toàn9 tab của người dùng.
- [ ] Trước quyết định phát hành: kiểm các UNKNOWN thiết yếu bằng tài khoản role được cấp, TalkBack/iOS thực tế, giao dịch ở môi trường test và backend lỗi có kiểm soát.
- [ ] Lượt P2: chọn ID cụ thể trong Top10 cùng hai residual subtask; tái hiện trước sửa, fix nhỏ theo thiết kế có sẵn, xuất diff, chạy acceptance; chưa tự áp dụng trong lượt này.
- [ ] Xử lý ESLint tồn tại theo phạm vi riêng; không dùng score để bỏ qua lỗi kiểm tra.
- [ ] Re-audit lần02 giữ ID/criterion/weights/tool versions; ghi resolved/persistent/new/reopened, không ghi đè baseline hoặc báo cáo01.

### Commands đã dùng / có thể chạy lại

```powershell
# Chạy từ root monorepo. Lint đang FAIL như bảng kết quả.
pnpm --filter @icd/web build
pnpm --filter @icd/mobile typecheck
pnpm --filter @icd/mobile test
pnpm exec eslint apps/web/src apps/mobile/src --format json
$webTestFiles = @(rg --files apps/web/src -g "*.test.ts" -g "*.test.tsx")
node --test --import tsx @webTestFiles
$fixTestFiles = @(
  "audit/tools/partner-log-regression.test.mjs",
  "audit/tools/safety-data-regression.test.mjs",
  "audit/tools/safety-independent-review.test.mjs",
  "audit/tools/conditional-forms-independent-review.test.mjs",
  "audit/tools/runtime/web-semantics.test.mjs",
  "audit/tools/runtime/modal-overlay.test.mjs",
  "audit/raw/re-audit/billing/billing-payment.test.cjs"
)
node --test @fixTestFiles
node audit/tools/convert-web-reaudit-measurements.mjs
python -X utf8 audit/tools/verify-reaudit-measurements.py
python -X utf8 audit/tools/finalize-reaudit.py
python -X utf8 audit/tools/verify-reaudit-artifacts.py
```

## Phụ lục bằng chứng

- [Toàn bộ raw re-audit](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit>) · [Screenshot gallery files](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/screenshots/re-audit>) · [Mobile fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/fixes/mobile/fix-log.json>)
- [Web safety review](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web-safety/independent-review.md>) · [Mobile review](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile/independent-source-review.md>)
- [Browser restore](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/web/browser-restored.json>) · [Emulator restore](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/mobile/device-restored.json>)

- [Kiểm tra artifact cuối](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/raw/re-audit/artifact-verification.json>): đối chiếu ID, phép tính rubric, hash baseline/source, log test, ảnh/XML và đường dẫn báo cáo. File lưu số check và PASS/FAIL thực tế.

JSON log hiển thị được và còn đầy đủ shell sau sửa:

![Partner API log sau sửa](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/screenshots/re-audit/web/partner-api-logs-fixed.jpg>)

Android 320dp/font150%, vùng chạm sau sửa; nhãn tab rút gọn là P2 chưa đóng:

![Android 320dp sau sửa](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/screenshots/re-audit/mobile/26-320-gate-light.png>)

## Next action

Dùng báo cáo này để quyết định phạm vi kiểm các UNKNOWN thiết yếu trước phát hành. Backlog P2/P3 và hai residual subtask đã có ưu tiên cùng tiêu chí verify; chưa có thay đổi code cho chúng.
