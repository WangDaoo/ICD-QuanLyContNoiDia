# ICD UI/UX — Checkpoint đo thực tế và re-audit

Cập nhật: 2026-10-04T14:48:19.642289+07:00. Phạm vi: web và mã mobile hiện tại; Android native đang chờ kiểm chứng.

## Executive summary

Web đạt mục tiêu UX Gap≥95 trong rubric104observation đã khóa, với bằng chứng đo và điểm từng dimension ở bảng dưới. **Chưa nghiệm thu toàn bộ dự án**: Android native, lời đọc screen reader, các overlay/quyền còn thiếu và performance thực tế chưa xác minh. Fixture không xác nhận pixel, hitbox, TalkBack hoặc giao dịch native.

Giữ UI/nghiệp vụ; backend quyết định giao dịch. Môi trường MySQL3308/API3001/web5174 sử dụng database `icd_ux_audit_20261003_e2e`; provider ngoài/cron được cô lập. Không reset database đang dùng.

Baseline được giữ nguyên: [re-audit01](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/2026-10-03-reaudit-01-report.md>).

Checkpoint trước batch này: [báo cáo trước](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/2026-10-04-report.md>); dữ liệu điểm/findings cũ đã lưu riêng tại [scores trước](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/checkpoints/2026-10-04-before-spacing/scores.json>). Không đổi IDs, trọng số hoặc mẫu số để tăng điểm.

Trạng thái finding: VERIFIED=58, FIXED=13. `VERIFIED` là acceptance trong phương pháp/phạm vi ghi ở từng finding; coverage khác còn UNKNOWN.

## Điểm số và phạm vi

| Nền tảng | UX Gap re-audit01 | UX Gap checkpoint | Nielsen checkpoint / khoảng bất định | Mục tiêu |
|---|---:|---:|---:|---:|
| web | 57,4–88,1 | 96,5–100,0 | 100,0 / 0,0–100,0 | ≥95 |
| mobile | 42,2–72,7 | 60,6–100,0 | 45,0 / 0,0–45,0 | ≥95 |

Nielsen là quy đổi dự án:100−2,5×Σseverity. Lỗi có nguồn đã sửa nhưng acceptance còn pending vẫn được giữ bảo thủ. Điểm cao của một rubric không chứng minh toàn sản phẩm đạt.

| Dimension /25 | Web | Mobile |
|---|---:|---:|
| Typography & Spacing | 23,0–25,0 | 19,5–25,0 |
| Interactive States | 25,0–25,0 | 4,2–25,0 |
| Content Hierarchy | 23,5–25,0 | 17,0–25,0 |
| Loading & Error UX | 25,0–25,0 | 19,9–25,0 |

### Nielsen — mười heuristic

| Heuristic | Web severity0–4 đã biết / có thể | Mobile severity0–4 đã biết / có thể | Finding còn chờ acceptance |
|---|---:|---:|---|
| H1 — Trạng thái hệ thống | 0 / 4 | 3 / 4 | M-008, M-009, M-N-001, M-N-002 |
| H2 — Phù hợp thực tế | 0 / 4 | 2 / 4 | M-006, M-007 |
| H3 — Quyền kiểm soát | 0 / 4 | 3 / 4 | M-N-001 |
| H4 — Nhất quán | 0 / 4 | 2 / 4 | M-004, M-005, M-011, M-014, M-013 |
| H5 — Ngăn lỗi | 0 / 4 | 3 / 4 | M-004, M-010, M-012, M-N-001 |
| H6 — Nhận biết | 0 / 4 | 2 / 4 | M-006, M-009, M-014 |
| H7 — Hiệu quả | 0 / 4 | 2 / 4 | M-010, M-011 |
| H8 — Thông tin cần thiết | 0 / 4 | 2 / 4 | M-005, M-007 |
| H9 — Phục hồi lỗi | 0 / 4 | 3 / 4 | M-008, M-012, M-N-001, M-N-002 |
| H10 — Trợ giúp | 0 / 4 | 0 / 4 | Không có finding đã biết chưa verify; coverage UNKNOWN vẫn còn |

Severity hiện tại giữ các finding FIXED đang chờ acceptance. Cột có thể là giới hạn bất định từ phần chưa kiểm tra, không phải mười lỗi catastrophic đã phát hiện. IDs observation, trọng số và mẫu số giữ nguyên baseline.


Dữ liệu tái lập: [scores](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/scores.json>), [findings](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/findings.json>), [coverage](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/coverage-checkpoint.json>).

## Findings đầy đủ — sắp theo severity

| ID | Severity | Category | Trạng thái | Vấn đề / thay đổi | Evidence hiện tại |
|---|---|---|---|---|---|
| W-S-020 | P0 | states | VERIFIED | Nhật ký API đối tác làm toàn bộ web trắng | [apps/web/src/services/redacted-log-body.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/redacted-log-body.ts:3>) |
| M-001 | P1 | interactive | VERIFIED | Vùng chạm dùng chung nhỏ hơn48dp | [apps/mobile/src/components/AppHeader.tsx:50](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/AppHeader.tsx:50>) |
| M-002 | P1 | accessibility | VERIFIED | Màu chữ trạng thái và nút chưa đủ tương phản | [apps/mobile/src/theme/colors.ts:7](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/colors.ts:7>) |
| M-003 | P1 | navigation | VERIFIED | Fallback thiếu quyền không có lối ra tài khoản | [apps/mobile/src/navigation/MainTabNavigator.tsx:27](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/navigation/MainTabNavigator.tsx:27>) |
| M-N-001 | P1 | auth | FIXED | Logout could be undone by a late token refresh or cleanup. | [apps/mobile/src/services/api/api-client.ts:39](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/services/api/api-client.ts:39>) |
| W-N-002 | P1 | data-contract | VERIFIED | Loose DTO/pagination fallbacks invented financial/status/catalog data. | [apps/web/src/services/api/load-list.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/api/load-list.ts:3>) |
| W-N-003 | P1 | auth | VERIFIED | A previous session command closure could write after user switch. | [apps/web/src/context/AppContext.tsx:612](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:612>) |
| W-N-005 | P1 | safety | VERIFIED | String false in canGateOut was truthy and could authorize a gate-out command. | [apps/web/src/context/AppContext.tsx:653](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:653>) |
| W-N-006 | P1 | financial | VERIFIED | parseInt truncated backend-valid fractional payment values. | [apps/web/src/services/payment-amount.ts:1](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/payment-amount.ts:1>) |
| W-N-007 | P1 | states | VERIFIED | Newly refreshed already-expired pass could reuse stale clock and show QR/exit. | [apps/web/src/components/useGatePassExpiry.ts:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useGatePassExpiry.ts:4>) |
| W-N-009 | P1 | authorization | VERIFIED | Role editor stayed writable after same-user permission downgrade. | [apps/web/src/components/UsersRolesView.tsx:192](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/UsersRolesView.tsx:192>) |
| W-N-010 | P1 | states | VERIFIED | Container detail could close or change context during unresolved Gate Pass creation. | [apps/web/src/components/ContainersView.tsx:508](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:508>) |
| W-N-012 | P1 | navigation | VERIFIED | URL Bàn giao có ID không tồn tại chọn và có thể gửi lệnh cho bản ghi đầu tiên. | [apps/web/src/components/HandoversView.tsx:55](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/HandoversView.tsx:55>) |
| W-N-013 | P1 | navigation | VERIFIED | Popup tác nghiệp bãi không chặn Back/reload khi đang lưu hoặc còn bản nháp. | [apps/web/src/components/yard/YardOperations.tsx:102](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardOperations.tsx:102>) |
| W-N-018 | P1 | auth | VERIFIED | Lỗi kết nối hoặc500 khi khôi phục phiên xóa credentials; nút đổi tài khoản thiếu pending và gửi logout lặp. | [apps/web/src/context/AppContext.tsx:537](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:537>) |
| W-N-019 | P1 | auth | VERIFIED | Refresh mất kết nối/500 hoặc401 tới muộn có thể xóa phiên mới hoặc replay request của actor cũ. | [packages/api-client/src/index.ts:81](<D:/Project/Đồ Án 4 +Mobile/icd-management/packages/api-client/src/index.ts:81>) |
| W-N-021 | P1 | auth | VERIFIED | Logout cũ hoàn tất có thể xóa credentials và UI của phiên vừa đăng nhập, kể cả khe microtask trước khi provider commit actor. | [apps/web/src/services/api/auth.service.ts:34](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/api/auth.service.ts:34>) |
| W-N-022 | P1 | data-availability | VERIFIED | Vị trí đã xếp và thông tin liên kết chỉ cập nhật sau read cuối; giao diện tạm khẳng định container chưa xếp bãi. | [apps/web/src/context/AppContext.tsx:324](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:324>) |
| W-N-023 | P1 | data-availability | VERIFIED | Container360 hiển thị chưa phát sinh hóa đơn/lệnh/bàn giao và action tạo mới khi resource chưa xác nhận hoặc bị cấm đọc. | [apps/web/src/components/ContainersView.tsx:62](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:62>) |
| W-N-028 | P1 | error-feedback | VERIFIED | Banner lỗi read dài khoảng865px đẩy nội dung vận hành xuống dưới màn hình. | [apps/web/src/App.tsx:268](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/App.tsx:268>) |
| W-S-001 | P1 | accessibility | VERIFIED | Popup nghiệp vụ chưa quản lý focus, Tab và Escape | [apps/web/src/components/ModalOverlay.tsx:13](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ModalOverlay.tsx:13>) |
| W-S-002 | P1 | accessibility | VERIFIED | Nhãn hiển thị chưa liên kết với trường nhập liệu | [apps/web/src/components/TruckVisitsView.tsx:268](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:268>) |
| W-S-003 | P1 | accessibility | VERIFIED | Năm danh sách chi tiết chỉ chọn được bằng chuột | [apps/web/src/components/ManifestsView.tsx:308](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ManifestsView.tsx:308>) |
| W-S-005 | P1 | states | VERIFIED | Nút thanh toán chưa chặn gửi lặp trong lúc xử lý | [apps/web/src/components/BillingView.tsx:84](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/BillingView.tsx:84>) |
| W-S-016 | P1 | states | VERIFIED | Lỗi đọc holds/passes bị biến thành danh sách rỗng | [apps/web/src/context/AppContext.tsx:96](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:96>) |
| M-004 | P2 | interactive | FIXED | Khoảng cách giữa vùng chạm nhỏ hơn8dp | [apps/mobile/src/theme/layout.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/layout.ts:3>) |
| M-005 | P2 | layout | FIXED | Màn hẹp/font lớn làm chồng và tràn header | [apps/mobile/src/navigation/ResponsiveTabBar.tsx:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/navigation/ResponsiveTabBar.tsx:9>) |
| M-006 | P2 | microcopy | FIXED | Mã enum/tiếng Anh lẫn trong giao diện nghiệp vụ | [apps/mobile/src/presentation/labels.ts:25](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/presentation/labels.ts:25>) |
| M-007 | P2 | forms | FIXED | Kiểm tra seal vẫn yêu cầu mức hư hỏng | [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:35](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:35>) |
| M-008 | P2 | navigation | FIXED | Lịch sử giám định hiển thị rỗng trước khi tải xong | [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:39](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:39>) |
| M-009 | P2 | navigation | FIXED | Tổng số chưa đọc được truyền nhưng không hiển thị | [apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:29>) |
| M-010 | P2 | forms | FIXED | Ngày booking cần nhập timestamp thủ công | [apps/mobile/src/components/BookingDateField.tsx:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/BookingDateField.tsx:9>) |
| M-011 | P2 | tokens | FIXED | Chế độ sáng/tối không được lưu khi mở lại app | [apps/mobile/src/theme/ThemeProvider.tsx:12](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/ThemeProvider.tsx:12>) |
| M-012 | P2 | forms | FIXED | Lỗi thiếu input vẫn còn sau khi đã điền | [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:45](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:45>) |
| M-014 | P2 | accessibility | FIXED | Tiêu đề card thiếu semantics heading | [apps/mobile/src/components/ScreenLayout.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/ScreenLayout.tsx:29>) |
| M-N-002 | P2 | states | FIXED | Late old cache writes/clears could remove a newer same-user cache. | [apps/mobile/src/storage/read-cache.ts:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/storage/read-cache.ts:9>) |
| W-N-001 | P2 | states | VERIFIED | Forbidden resource reads displayed zero revenue/capacity/unread counts. | [apps/web/src/components/CollectionState.tsx:20](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:20>) |
| W-N-004 | P2 | authorization | VERIFIED | MANAGER/read-only log readers were rejected by unrelated API-key management permission. | [apps/api/src/modules/partner-handover/controllers/internal/partner-api-log.controller.ts:12](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/api/src/modules/partner-handover/controllers/internal/partner-api-log.controller.ts:12>) |
| W-N-008 | P2 | navigation | VERIFIED | Opening an existing Gate-out pass also opened an unintended issue form. | [apps/web/src/components/GatePassView.tsx:22](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/GatePassView.tsx:22>) |
| W-N-011 | P2 | navigation | VERIFIED | A collection refresh reopened a dismissed Truck Visit create form and could overwrite its draft. | [apps/web/src/components/TruckVisitsView.tsx:36](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:36>) |
| W-N-014 | P2 | microcopy | VERIFIED | Tác nghiệp bãi nhập giờ Việt Nam nhưng hướng dẫn và thời gian lịch sử theo múi giờ thiết bị. | [apps/web/src/components/yard/YardOperations.tsx:65](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardOperations.tsx:65>) |
| W-N-015 | P2 | navigation | VERIFIED | Liên kết tài liệu API của Bàn giao hardcode localhost3000 thay vì backend đã cấu hình. | [apps/web/src/components/HandoversView.tsx:223](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/HandoversView.tsx:223>) |
| W-N-016 | P2 | states | VERIFIED | Header danh sách và tab hiển thị số0 khi dữ liệu chưa được xác nhận hoặc bị cấm đọc. | [apps/web/src/components/CollectionState.tsx:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:4>) |
| W-N-017 | P2 | loading | VERIFIED | Resource đã tải xong phải chờ toàn bộ read khác, và tariff lỗi làm mất rules của dữ liệu stale. | [apps/web/src/context/AppContext.tsx:413](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:413>) |
| W-N-020 | P2 | states | VERIFIED | Danh sách Movement Order và vị trí bãi báo không có dữ liệu khi request lỗi hoặc bị cấm đọc. | [apps/web/src/components/MovementOrdersView.tsx:196](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MovementOrdersView.tsx:196>) |
| W-N-024 | P2 | data-contract | VERIFIED | Lệnh vận chuyển trong Container360 thiếu định danh do backend không trả orderCode/orderNumber. | [apps/web/src/services/mappers/live-view.mapper.ts:182](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/mappers/live-view.mapper.ts:182>) |
| W-N-025 | P2 | layout | VERIFIED | Popup Container360 tại320px bẻ ký tự cuối mã container và ép nhãn tab thành nhiều dòng. | [apps/web/src/components/ContainersView.tsx:516](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:516>) |
| W-N-026 | P2 | accessibility | VERIFIED | Sáu tab chi tiết Container360 chỉ biểu thị lựa chọn bằng màu, thiếu state cho accessibility. | [apps/web/src/components/ContainersView.tsx:546](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:546>) |
| W-N-027 | P2 | spacing | VERIFIED | Nhịp spacing có các giá trị2/6/10/14px ngoài grid4px đã chốt. | [apps/web/src/components/Header.tsx:70](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:70>) |
| W-N-029 | P2 | interaction | VERIFIED | Ô nhập thiếu hover; selector bổ sung ban đầu lấn active của nút/link. | [apps/web/src/index.css:21](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:21>) |
| W-N-030 | P2 | accessibility | VERIFIED | Placeholder bị giảm alpha50% nên chữ gợi ý không đạt contrast4,5:1. | [apps/web/src/index.css:42](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:42>) |
| W-R-001 | P2 | accessibility | VERIFIED | Chữ thông tin phụ thiếu tương phản | [apps/web/src/index.css:15](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:15>) |
| W-R-002 | P2 | accessibility | VERIFIED | Tìm kiếm bản đồ bãi thiếu chỉ báo focus | [apps/web/src/components/yard/YardSiteMap.tsx:381](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardSiteMap.tsx:381>) |
| W-S-004 | P2 | states | VERIFIED | Form đóng và xóa input trước khi biết kết quả lưu | [apps/web/src/components/useCommandAction.tsx:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useCommandAction.tsx:4>) |
| W-S-006 | P2 | forms | VERIFIED | Thiếu trường bắt buộc nhưng handler thoát mà không chỉ lỗi | [apps/web/src/components/useFormValidation.tsx:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useFormValidation.tsx:3>) |
| W-S-007 | P2 | accessibility | VERIFIED | Lựa chọn role/quyền chỉ thể hiện bằng màu | [apps/web/src/components/UsersRolesView.tsx:72](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/UsersRolesView.tsx:72>) |
| W-S-008 | P2 | microcopy | VERIFIED | Chi tiết Gate Pass hiển thị sai trạng thái hết hạn/hủy | [apps/web/src/components/useGatePassExpiry.ts:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useGatePassExpiry.ts:4>) |
| W-S-009 | P2 | states | VERIFIED | Container 360 dùng biểu tượng thay cho QR chứa token | [apps/web/src/components/ContainersView.tsx:1042](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:1042>) |
| W-S-010 | P2 | states | VERIFIED | Readiness chưa biết bị trình bày như điều kiện không đạt | [apps/web/src/components/useBackendReadiness.ts:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useBackendReadiness.ts:5>) |
| W-S-011 | P2 | forms | VERIFIED | Giờ hết hạn mặc định của lệnh lệch giờ địa phương | [apps/web/src/lib/time.ts:19](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/lib/time.ts:19>) |
| W-S-012 | P2 | navigation | VERIFIED | Việc ca truyền sai loại ID khi mở handover | [apps/web/src/navigation.ts:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/navigation.ts:5>) |
| W-S-013 | P2 | navigation | VERIFIED | Shortcut tạo chuyến xe mất ngữ cảnh container | [apps/web/src/components/TruckVisitsView.tsx:14](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:14>) |
| W-S-014 | P2 | navigation | VERIFIED | Điều hướng trong bộ nhớ làm mất ngữ cảnh/form | [apps/web/src/App.tsx:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/App.tsx:5>) |
| W-S-015 | P2 | states | VERIFIED | Một số danh sách rỗng không hướng dẫn bước tiếp theo | [apps/web/src/components/CollectionState.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:29>) |
| W-S-017 | P2 | microcopy | VERIFIED | EDI gọi dữ liệu ví dụ sinh sẵn là payload đã truyền | [apps/web/src/components/EDIView.tsx:337](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/EDIView.tsx:337>) |
| W-S-018 | P2 | states | VERIFIED | Trang chỉ đọc vẫn hiển thị thao tác ghi | [apps/web/src/services/write-permissions.ts:528](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/write-permissions.ts:528>) |
| W-S-019 | P2 | navigation | VERIFIED | Popover thông báo không đóng bằng Escape/click ngoài | [apps/web/src/components/Header.tsx:42](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:42>) |
| M-013 | P3 | tokens | FIXED | Header/layout dùng literal ngoài token hiện có | [apps/mobile/src/theme/typography.ts:19](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/typography.ts:19>) |
| W-N-031 | P3 | interaction | VERIFIED | Feedback hover bằng filter đổi tức thì dù các màu khác transition150ms. | [apps/web/src/index.css:37](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:37>) |
| W-R-003 | P3 | tokens | VERIFIED | Cỡ chữ metadata lặp lại ngoài hệ token | [apps/web/src/index.css:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:4>) |
| W-R-004 | P3 | layout | VERIFIED | Line-height heading chưa theo rubric của dự án | [apps/web/src/index.css:32](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:32>) |

## Chi tiết fix, verification và diff

### W-S-020 — P0 / VERIFIED

Root runtime audit confirmed that opening Nhật ký API đối tác produced a blank application and React console error: Objects are not valid as a React child, with structured request-body keys. The detail panel renders requestBodyRedacted and responseBodyRedacted as React children inside pre. The live mapper spreads backend fields unchanged, while API logs store JSON objects and the web type declares string. There is no web ErrorBoundary around the view; the unexpected object therefore removes the entire React root. Runtime confirmation is from the parent audit, not an interaction by the static agent.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: Đã mở log thực tế ở 3 viewport; lỗi render cưỡng bức, dữ liệu falsy và bảo vệ redaction kiểm bằng fixture. Không gửi API đối tác.

Evidence: [apps/web/src/services/redacted-log-body.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/redacted-log-body.ts:3>)

```tsx
export function formatRedactedLogBody(value?: JsonValue): string {
  if (value == null) return '// Empty or Redacted';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-020/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-001 — P1 / VERIFIED

At density420 (2.625px/dp), header theme/bell/account are79×84px≈30×32dp and back68×84px≈26×32dp. Fields, filter chips and primary buttons are40dp; SelectField rows/scanner close/grid tabs44dp; picker close≈20×20dp; ActionDialog close36×36dp. No hitSlop compensates these boxes.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: 352 mẫu XML: 331 vùng đầy đủ đạt ≥48dp, 21 mẫu bị cắt mép viewport loại khỏi phép kết luận kích thước. Android thường và 320dp/font150%; chưa có iOS.

Evidence: [apps/mobile/src/components/AppHeader.tsx:50](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/AppHeader.tsx:50>)

```tsx
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-001/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-002 — P1 / VERIFIED

Rendered exact-color pixels confirm dark logout white on#FB7185=2.6914:1, failing even3:1. Light success badge#059669/#ECFDF5=3.5771 and light readiness warning#D97706/#FFFBEB=3.0721 fail normal text4.5:1. These labels are9–13sp, below large-text thresholds. Body text passes17.85light/15.55dark.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: 9 cặp màu chữ native có RGB pixel thực tế đạt ≥4.5:1. Kết quả chỉ áp dụng các cặp đã đo, không chứng nhận toàn bộ màu của app.

Evidence: [apps/mobile/src/theme/colors.ts:7](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/colors.ts:7>)

```tsx
  successText: '#047857', warningText: '#92400E', dangerText: '#B91C1C', successButton: '#047857',
  dangerButton: '#BE123C', onDangerButton: '#FFFFFF',
  infoBackground: '#EFF6FF', successBackground: '#ECFDF5', warningBackground: '#FFFBEB', dangerBackground: '#FEF2F2',
};
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-002/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-003 — P1 / VERIFIED

MainTabNavigator returns a bare ForbiddenScreen when tabs are empty. ForbiddenScreen contains only text and has no AppHeader/account/logout button. RootNavigator still renders authenticated Main rather than Login. An authenticated account lacking all mobile tab permissions cannot switch accounts through this screen.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: Điều hướng zero-tab và hủy/xác nhận đăng xuất được kiểm bằng fixture. Native zero-tab UNKNOWN vì không có tài khoản tương ứng; native ADMIN chỉ mở/hủy đăng xuất, không đăng xuất thật.

Evidence: [apps/mobile/src/navigation/MainTabNavigator.tsx:27](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/navigation/MainTabNavigator.tsx:27>)

```tsx
  if (!tabs.length) return <ForbiddenScreen message="Tài khoản chưa được cấp quyền sử dụng chức năng hiện trường. Liên hệ quản trị viên để được cấp quyền." onOpenAccount={() => navigation.navigate('Account')} />;
  return <Tab.Navigator tabBar={props => <ResponsiveTabBar {...props} visibleTabs={tabs} />} screenOptions={{ headerShown: false,
    tabBarStyle: { backgroundColor: theme.colors.chrome, borderTopColor: theme.colors.border, height: 62 + insets.bottom, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 5) },
    tabBarActiveTintColor: theme.colors.info, tabBarInactiveTintColor: theme.colors.textMuted,
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-003/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-N-001 — P1 / FIXED

Logout could be undone by a late token refresh or cleanup.

Thay đổi: Generation-fenced auth/response acceptance and serialized token/cache cleanup. Source regression PASS; native session transitions pending.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/mobile/src/services/api/api-client.ts:39](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/services/api/api-client.ts:39>)

```tsx
export function invalidateApiSession(): void {
  sessionGeneration++;
  refreshPromise = null;
}
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-N-001/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### W-N-002 — P1 / VERIFIED

Loose DTO/pagination fallbacks invented financial/status/catalog data.

Thay đổi: Canonical unknown boundaries, strict pagination, CANCELLED/UNKNOWN/ACK and tariff restrictions preserved; no invented zero or ALL.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/services/api/load-list.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/api/load-list.ts:3>)

```tsx
export interface ListPageParams {
  page: number;
  pageSize: number;
}
```

Verify/raw: [web-source-tests-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-source-tests-final.txt>), [web-types-independent-checkpoint.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-independent-checkpoint.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-002/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-003 — P1 / VERIFIED

A previous session command closure could write after user switch.

Thay đổi: Current-session and exact backend-derived command permission checks; stale callback emits zero writes.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/context/AppContext.tsx:612](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:612>)

```tsx
  const commandSession = sessionVersion.current;
  const command = async (path: string, payload?: unknown, method: 'POST' | 'PATCH' | 'PUT' = 'POST'): Promise<CommandResult<Record<string, unknown>>> => {
    if (!isAuthenticated || !tokenStorage.getAccessToken()) return { success: false, message: 'Vui lòng đăng nhập.' };
    if (commandSession !== sessionVersion.current) return { success: false, message: 'Phiên đăng nhập đã thay đổi. Mở lại biểu mẫu để kiểm tra quyền và dữ liệu.' };
```

Verify/raw: [context-write-permission-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/context-write-permission-green.txt>), [refresh-session-race-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/refresh-session-race-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-003/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-005 — P1 / VERIFIED

String false in canGateOut was truthy and could authorize a gate-out command.

Thay đổi: Require boolean true; false/string/object/missing scan flags issue zero writes.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/context/AppContext.tsx:653](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:653>)

```tsx
        if (scan.canGateOut !== true) return { success: false, message: 'Chưa đủ điều kiện xuất cổng: ' + asStrings(readiness.blockers).join(', ') };
        const result = await command('/gate-out', { visitId: scan.visitId ?? asOptionalString(scanPass.containerVisitId) ?? knownPass?.containerVisitId, qrToken: token });
        return { ...result, containerNumber: asOptionalString(scanContainer.containerNumber) };
      } catch (error: unknown) { return { success: false, message: errorMessage(error) }; }
```

Verify/raw: [web-types-independent-checkpoint.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-independent-checkpoint.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-005/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-006 — P1 / VERIFIED

parseInt truncated backend-valid fractional payment values.

Thay đổi: Finite positive Number, maximum2decimals, input step0.01; preserve12.50 and0.29 without rounding; invalid direct command blocked.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/services/payment-amount.ts:1](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/payment-amount.ts:1>)

```tsx
export const PAYMENT_AMOUNT_ERROR =
  'Số tiền phải lớn hơn 0 và có tối đa 2 chữ số thập phân.';

export function isValidPaymentAmount(amount: unknown): amount is number {
```

Verify/raw: [web-types-independent-checkpoint.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-independent-checkpoint.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-006/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-007 — P1 / VERIFIED

Newly refreshed already-expired pass could reuse stale clock and show QR/exit.

Thay đổi: Current render clock and deadline timer; refreshed expired pass removes QR/exit; component fixture verified.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/useGatePassExpiry.ts:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useGatePassExpiry.ts:4>)

```tsx
export function useGatePassExpiry(passes: GatePass[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const current = Date.now();
```

Verify/raw: [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-007/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-009 — P1 / VERIFIED

Role editor stayed writable after same-user permission downgrade.

Thay đổi: Render and command recheck current roles.manage; dropdown/editor cannot issue stale write.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/UsersRolesView.tsx:192](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/UsersRolesView.tsx:192>)

```tsx
                {can('roles.manage') &&
                  (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === 'ready') && (
                    <button
                      onClick={() => setEditingRoleId(editingRoleId === r.id ? null : r.id)}
```

Verify/raw: [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-009/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-010 — P1 / VERIFIED

Container detail could close or change context during unresolved Gate Pass creation.

Thay đổi: Pending detail closes/navigation/context disabled; delayed POST remains visible and single-flight.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/ContainersView.tsx:508](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:508>)

```tsx
          pending={action.pending}
          onClose={closeDetail}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
```

Verify/raw: [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-010/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-012 — P1 / VERIFIED

URL Bàn giao có ID không tồn tại chọn và có thể gửi lệnh cho bản ghi đầu tiên.

Thay đổi: Chọn đúng target, chờ loading/response tới muộn; báo lỗi rõ và quay về danh sách; URL thiếu hồ sơ không còn action cho bản ghi khác.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/HandoversView.tsx:55](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/HandoversView.tsx:55>)

```tsx
  const selectedHandover = targetHandoverId
    ? handovers.find((h) => h.id === targetHandoverId) ?? null
    : selectedHandoverState;
  const handoverLoadState = resourceStatus?.handovers ?? (isLoading ? 'loading' : 'ready');
```

Verify/raw: [handover-target-red.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/handover-target-red.txt>), [handover-target-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/handover-target-green.txt>), [handover-missing-target-runtime.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/handover-missing-target-runtime.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-012/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-013 — P1 / VERIFIED

Popup tác nghiệp bãi không chặn Back/reload khi đang lưu hoặc còn bản nháp.

Thay đổi: Dùng ModalOverlay hiện có: chặn rời khi pending, xác nhận giữ draft, suspend lớp modal của màn ẩn. Browser Back/cancel giữ bản nháp; Back/accept rồi Forward mở lại đúng popup và giá trị chưa gửi.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/yard/YardOperations.tsx:102](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardOperations.tsx:102>)

```tsx
    <ModalOverlay pending={pending} onClose={onClose} aria-labelledby={titleId}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => {
```

Verify/raw: [yard-dialog-navigation-red.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/yard-dialog-navigation-red.txt>), [yard-dialog-navigation-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/yard-dialog-navigation-green.txt>), [yard-back-cancel-draft-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/yard-back-cancel-draft-2026-10-04.json>), [yard-back-forward-retained-draft-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/yard-back-forward-retained-draft-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-013/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-018 — P1 / VERIFIED

Lỗi kết nối hoặc500 khi khôi phục phiên xóa credentials; nút đổi tài khoản thiếu pending và gửi logout lặp.

Thay đổi: Giữ credentials khi lỗi có thể phục hồi nhưng ẩn dữ liệu nghiệp vụ tới khi xác minh actor; retry coalesced/generation fenced. UI đổi tài khoản single-flight, có pending, bắt rejection. Browser reload khi API ngừng đã hiện màn phục hồi không lộ dữ liệu; retry sau API restart đăng nhập lại đúng ADMIN mà không nhập mật khẩu.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/context/AppContext.tsx:537](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:537>)

```tsx
  const retrySessionRestore = useCallback((): Promise<void> => {
    if (!restoreMounted.current) return Promise.resolve();
    if (pendingSessionRestore.current?.version === sessionVersion.current)
      return pendingSessionRestore.current.promise;
```

Verify/raw: [auth-progressive-regressions-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/auth-progressive-regressions-green.txt>), [auth-restore-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/auth-restore-checkpoint-2026-10-04.md>), [root-auth-recovery-independent-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/root-auth-recovery-independent-green-2026-10-04.txt>), [bootstrap-outage-recovery-before.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/bootstrap-outage-recovery-before.json>), [bootstrap-outage-recovery-after.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/bootstrap-outage-recovery-after.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-018/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-019 — P1 / VERIFIED

Refresh mất kết nối/500 hoặc401 tới muộn có thể xóa phiên mới hoặc replay request của actor cũ.

Thay đổi: Refresh đồng phiên được coalesce; lỗi tạm thời giữ credentials và truyền đúng ApiError. Generation/token lineage có giới hạn chỉ cho phép retry cùng actor, stale actor không clear hoặc replay phiên hiện tại; public contract bổ sung getSessionVersion tùy chọn.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [packages/api-client/src/index.ts:81](<D:/Project/Đồ Án 4 +Mobile/icd-management/packages/api-client/src/index.ts:81>)

```tsx
  const knownRotation = (previous: SessionIdentity, current: SessionIdentity): boolean => {
    if (previous.version === undefined || previous.version !== current.version) return false;
    let cursor = previous;
    for (let count = 0; count < rotations.length; count++) {
```

Verify/raw: [web-refresh-recovery-regressions.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-refresh-recovery-regressions.txt>), [web-refresh-recovery-review.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-refresh-recovery-review.md>), [web-refresh-recovery-verification.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-refresh-recovery-verification.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-019/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-021 — P1 / VERIFIED

Logout cũ hoàn tất có thể xóa credentials và UI của phiên vừa đăng nhập, kể cả khe microtask trước khi provider commit actor.

Thay đổi: Service kiểm credential generation; provider kiểm actor generation và credential generation. Same-actor refresh vẫn được cleanup; logout cũ không xóa phiên mới; giữ lỗi server cho UI xử lý.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/services/api/auth.service.ts:34](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/api/auth.service.ts:34>)

```tsx
    const version = tokenStorage.getSessionVersion();
    try {
      await apiClient.post('/auth/logout');
    } finally {
```

Verify/raw: [logout-session-race-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/logout-session-race-green-2026-10-04.txt>), [logout-race-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/logout-race-checkpoint-2026-10-04.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-021/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-022 — P1 / VERIFIED

Vị trí đã xếp và thông tin liên kết chỉ cập nhật sau read cuối; giao diện tạm khẳng định container chưa xếp bãi.

Thay đổi: Reconcile field liên kết khi nguồn phụ hoàn tất; giữ giá trị stale được phép đọc, bỏ giá trị bị hạn chế. Vị trí chưa xác minh có copy trung tính. Browser trước/sau read hãng tàu chậm5s xác nhận vị trí canonical đã hiện khi read khác còn pending; Holds/readiness vẫn chờ xác minh server.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/context/AppContext.tsx:324](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:324>)

```tsx
const DEPENDENT_FIELDS: Array<{
  resource: keyof LiveCollections; field: string; sources: Array<keyof LiveCollections>; missing: string | undefined;
}> = [
  { resource: 'containerVisits', field: 'currentLocation', sources: ['yardSlots'], missing: undefined },
```

Evidence: [apps/web/src/components/ContainersView.tsx:70](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:70>)

```tsx
  const yardLocationReady = yardLocationStates.every((state) => state === 'ready');
  const yardLocationForbidden = yardLocationStates.includes('forbidden');
  const yardLocationLabel = (visit: ContainerVisit, emptyLabel = 'Chưa xếp') => {
    if (yardLocationReady) return visit.currentLocation || emptyLabel;
```

Verify/raw: [progressive-dependencies-red-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/progressive-dependencies-red-2026-10-04.txt>), [progressive-dependencies-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/progressive-dependencies-green-2026-10-04.txt>), [dependency-location-regressions-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-location-regressions-2026-10-04.txt>), [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>), [progressive-containers-catalog5s-series-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/progressive-containers-catalog5s-series-2026-10-04.json>), [progressive-containers-location-fixed-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/progressive-containers-location-fixed-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-022/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-022-container.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-022-container.diff>), [W-N-022-provider.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-022-provider.diff>)

### W-N-023 — P1 / VERIFIED

Container360 hiển thị chưa phát sinh hóa đơn/lệnh/bàn giao và action tạo mới khi resource chưa xác nhận hoặc bị cấm đọc.

Thay đổi: CollectionState và count trung tính theo resource; chặn tạo từ absence chưa xác minh, kiểm handover.create riêng. Không lọc record chưa xác nhận thanh toán như blocker-free. GATE_STAFF thực tế không thấy số0/empty giả hoặc giá trị tài chính khi403; trạng thái khác có regression.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/ContainersView.tsx:62](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:62>)

```tsx
  const collectionState = (resource: string) => resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready');
  const invoiceState = collectionState('invoices');
  const movementOrderState = collectionState('movementOrders');
  const handoverState = collectionState('handovers');
```

Evidence: [apps/web/src/components/ContainersView.tsx:854](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:854>)

```tsx
                          hidden={!can('handover.create')}
                          disabled={action.pending}
                          onClick={() => {
                            setActiveModalVisitId(null);
```

Verify/raw: [container-derived-sections-red-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/container-derived-sections-red-2026-10-04.txt>), [container-derived-sections-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/container-derived-sections-green-2026-10-04.txt>), [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>), [container-billing-role-forbidden-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-billing-role-forbidden-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-023/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-023.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-023.diff>)

### W-N-028 — P1 / VERIFIED

Banner lỗi read dài khoảng865px đẩy nội dung vận hành xuống dưới màn hình.

Thay đổi: Chi tiết lỗi giới hạn96px, có scroll/accessible region và Tab focus. Banner còn129,3px tại320/375/768/1440;7.170ký tự vẫn còn và ArrowDown cuộn thật. Giữ retry và trạng thái nghiệp vụ; nguyên nhân HTTP của read failure vẫn UNKNOWN.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/App.tsx:268](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/App.tsx:268>)

```tsx
                  aria-label="Chi tiết dữ liệu cần tải lại"
                  tabIndex={0}
                  className="min-w-0 flex-1 max-h-24 overflow-y-auto break-words"
                >
```

Verify/raw: [read-error-bounds-before-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/read-error-bounds-before-2026-10-04.json>), [read-error-bounds-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/read-error-bounds-after-2026-10-04.json>), [read-error-bounds-responsive-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/read-error-bounds-responsive-after-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-028/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-028.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/read-error-bounds-2026-10-04/W-N-028.diff>)

### W-S-001 — P1 / VERIFIED

Create/edit overlays are fixed divs without a named dialog role, focus transfer, Tab containment, Escape handling or focus restoration. Container 360 has role/aria-modal/name but still has no focus mechanism. The modal panel can therefore open while keyboard focus remains on its opener outside the panel; aria-modal alone does not move or contain focus. Background scroll/click leakage must be measured separately. Yard dialogs are excluded because their source implements these behaviors.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: 12/15 loại overlay chạy trực tiếp trong browser. MBL/HBL/thanh toán không mở được với dữ liệu hiện tại; kiểm component thật bằng fixture. Đây không phải bằng chứng native browser cho 3 loại đó.

Evidence: [apps/web/src/components/ModalOverlay.tsx:13](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ModalOverlay.tsx:13>)

```tsx
export function ModalOverlay({
  children,
  onClose,
  pending = false,
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-001/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-002 — P1 / VERIFIED

Several form fields render label and input/select as siblings with no htmlFor/id relationship, no wrapping label and no aria-label/labelledby. Their nearby visible labels do not programmatically name those controls. The unambiguous examples below have no placeholder fallback either. Login, Gate-in and Yard wrapping labels are correct; Gate Pass receiver fields and Container master selectors already have aria-label and are not claimed unnamed.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: Field có điều kiện kiểm thêm qua 9 fixture component thật, 37 field hiển thị. Chưa xác nhận thông báo screen reader thực tế.

Evidence: [apps/web/src/components/TruckVisitsView.tsx:268](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:268>)

```tsx
                    htmlFor="truck-visits-plate"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Biển số đầu kéo*
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-002/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-003 — P1 / VERIFIED

The record selectors are divs with onClick and cursor-pointer but no native interactive element, tabIndex or keyboard handler. They cannot receive sequential keyboard focus, so keyboard users cannot choose the record whose detail and subsequent actions are displayed. This is a concrete non-native interaction failure, not a missing-ARIA guess.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: Đã thao tác keyboard cả 5 danh sách bằng dữ liệu hiện có; không ghi giao dịch.

Evidence: [apps/web/src/components/ManifestsView.tsx:308](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ManifestsView.tsx:308>)

```tsx
                    aria-pressed={isSelected}
                    key={m.id}
                    onClick={() => setSelectedManifestId(m.id)}
                    className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition ${
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-003/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-005 — P1 / VERIFIED

Billing payment submission awaits recordPayment but never sets a pending state or guards re-entry, and its submit remains enabled. Repeated clicks/Enter can start multiple calls before the first settles. Context recordPayment creates a new referenceNo with crypto.randomUUID on every call. This proves distinct outgoing command attempts, not that the backend necessarily accepts or duplicates them. Truck/Partner/Handover create and multiple EDI actions also omit pending protection; Yard and Gate-in already protect writes.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: 4 fixture async component thật; không tạo thanh toán. Chỉ phần P1 thanh toán được duyệt; các action phi tài chính còn là việc P2 ngoài phạm vi.

Evidence: [apps/web/src/components/BillingView.tsx:84](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/BillingView.tsx:84>)

```tsx
  const paymentPending = useRef(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');

```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-005/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-016 — P1 / VERIFIED

The top-level loader records failures, but later per-visit holds/gate-pass requests use allSettled and substitute [] without adding to failures. Manifest bills, role detail and handover detail also catch and return the less-complete row with no local availability marker. After such a rejected GET, UI can show no holds or no pass rather than unavailable data while apiError remains empty if other requests succeeded. Backend readiness/Gate-out rechecks still enforce business rules.

Thay đổi: Prior accepted fix retained; fresh regression suite rechecked.

Giới hạn: Fixture GET lỗi trang sau, 403, thiếu status, stale, empty thật và retry đã chạy. Không ép lỗi backend thật. Manifest/Role/Handover detail phi an toàn vẫn là việc P2 ngoài phạm vi.

Evidence: [apps/web/src/context/AppContext.tsx:96](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:96>)

```tsx
  visitSafetyStatus: VisitSafetyStatus;
  workQueue: WorkQueueTask[];
  ediMessages: EdiOutboxMessage[];
  warehouses: CustomerWarehouse[];
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>), [web-old-billing-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-billing-final.txt>), [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-016/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-004 — P2 / FIXED

Header action gaps are4dp (10–11px at420dpi); Gate-In search/scan and survey severity targets are separated by6dp (≈16px). These are below the requested8dp separation.

Thay đổi: Shared touch targets/gaps use48dp/8dp and narrow reflow instead of overlapping hitboxes.

Giới hạn: FIXED; requires current Android XML/bounds at320/360/412/768dp before VERIFIED.

Evidence: [apps/mobile/src/theme/layout.ts:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/layout.ts:3>)

```tsx
  touchTarget: 48,
  contentMaxWidth: 600,
  dialogMaxWidth: 480,
  multilineInputMinHeight: 74,
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-004/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-005 — P2 / FIXED

At840×1680px/420dpi (320×640dp) with fontScale1.5, ADMIN becomes an unreadable narrow sliver overlapping the theme action, and the selected Gate-In truck icon spills outside its segment. Body fields remain scrollable. The fixed header action row and unconstrained GateModeSwitch text cause the crowding.

Thay đổi: Header/action/tab labels wrap at narrow widths and retain font scaling.

Giới hạn: FIXED; actual native font150/200%, keyboard and safe-area matrix still pending.

Evidence: [apps/mobile/src/navigation/ResponsiveTabBar.tsx:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/navigation/ResponsiveTabBar.tsx:9>)

```tsx
export function ResponsiveTabBar({ state, descriptors, navigation, visibleTabs }: BottomTabBarProps & { visibleTabs: Array<keyof MainTabParamList> }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-005/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-006 — P2 / FIXED

Native lookup/detail show IN_YARD, SIZE_40 and DRY; yard operation rows show COMPLETED/CANCELLED/INSPECTION; confirmations show DAMAGE_SURVEY and STRIPPING despite localized chooser labels. Notifications contain English titles/body in otherwise Vietnamese chrome. This increases interpretation effort at review time.

Thay đổi: Known business enums and notification templates use Vietnamese labels; custom codes remain honest.

Giới hạn: Known/custom presentation tested from real source; native list/detail screenshots pending.

Evidence: [apps/mobile/src/presentation/labels.ts:25](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/presentation/labels.ts:25>)

```tsx
export function displayCode(code?: string | null): string {
  if (!code) return 'Chưa ghi nhận';
  return labels[code] || (/^[A-Z][A-Z0-9_]*$/.test(code) ? `Chưa xác định (${code})` : code);
}
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-006/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-007 — P2 / FIXED

Selecting Kiểm tra seal changes inspectionType toSEAL_CHECK, but the card keeps 'Biên bản Giám định Hư hỏng Hiện trường', a damage-specific placeholder and severity radios Nhẹ/Trung bình/Nặng. The selected severity is only included in notes for DAMAGE_SURVEY; therefore the displayed severity is irrelevant for seal/condition checks.

Thay đổi: Seal/condition checks omit damage severity; damage surveys retain canonical severity.

Giới hạn: Mode-switch payload fixture; native flow/popup pending.

Evidence: [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:35](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:35>)

```tsx
  const [inspectionType, setInspectionType] = useState('DAMAGE_SURVEY');
  const [confirm, setConfirm] = useState(false);
  const [severity, setSeverity] = useState('Nhẹ');
  const [rows, setRows] = useState<InspectionRecord[]>([]);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-007/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-008 — P2 / FIXED

SurveyHomeScreen initializes rows=[] and has no loading state for yardApi.inspections(). Its history renders 'Chưa có biên bản giám định' whenever rows are empty, including while the request is pending or has failed; load errors appear in the creation form rather than next to history. This can imply that no inspections exist.

Thay đổi: Inspection history has separate loading/error/retry and stale response fencing.

Giới hạn: Delayed/rejected source component fixtures; native slow/offline behavior pending.

Evidence: [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:39](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:39>)

```tsx
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRequest = useRef(0);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-008/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-009 — P2 / FIXED

NotificationsScreen supplies subtitle 'Chưa đọc: ${unreadCount}', but AppHeader uses onBack ? title : ... and discards subtitle whenever a back action exists. Native notification headers show only 'Thông báo'; no unread total is displayed elsewhere on this screen.

Thay đổi: Server unread count is visible and only updated after authoritative mark-read outcomes.

Giới hạn: Zero/nonzero/count failures fixtures; native notification integration pending.

Evidence: [apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:29>)

```tsx
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<NotificationRecord | null>(null);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-009/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-010 — P2 / FIXED

Booking form uses an unrestricted text field for the schedule. The required YYYY-MM-DD HH:mm syntax is explained only after review fails; the initial field presents one example with no persistent format helper or native date/time selection. Operators must type punctuation and remember the format.

Thay đổi: Native date/time picker with explicit Vietnam timezone replaces memorized timestamp input.

Giới hạn: Expo-compatible9.1.0 installed; native picker/cancel/timezone not yet exercised this run.

Evidence: [apps/mobile/src/components/BookingDateField.tsx:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/BookingDateField.tsx:9>)

```tsx
export function BookingDateField({ value, onChange, disabled, error }: { value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }) {
  const { theme } = useTheme();
  const styles = useFieldStyles();
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-010/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-011 — P2 / FIXED

ThemeProvider always initializes mode='LIGHT' with no persisted preference or system appearance fallback. The native app was dark before force-stop/reopen;84-session-reopened-light confirms the same ADMIN session returned with light appearance. Font-setting recreation also reset the choice.

Thay đổi: Persist theme preference, initial system default and bootstrap before app content.

Giới hạn: Storage/bootstrap fixtures; native cold-launch light/dark screenshots pending.

Evidence: [apps/mobile/src/theme/ThemeProvider.tsx:12](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/ThemeProvider.tsx:12>)

```tsx
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<AppearancePreference>('SYSTEM');
  const [ready, setReady] = useState(false);
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-011/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-012 — P2 / FIXED

After blank review produces 'Nhập số container và nội dung ghi nhận', entering bothTCSU8849201 and Audit draft leaves the red missing-fields message until the next submit. The source onChangeText handlers do not clear/re-evaluate the validation state.

Thay đổi: Survey errors are per field; validation clears on related edit while server errors remain recoverable.

Giới hạn: Actual screen source fixture; native focus/keyboard/TalkBack error read pending.

Evidence: [apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:45](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:45>)

```tsx
  const [fieldErrors, setFieldErrors] = useState<{ containerNo?: string; notes?: string }>({});
  const [success, setSuccess] = useState('');
  const canInspect = hasAnyPermission(user, ['yard.inspect']);
  const load = useCallback(async () => {
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-012/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-014 — P2 / FIXED

Card renders visible title as Text without accessibilityRole="header". AppHeader title is also plain Text. Scanner and ActionDialog already use the header role and are excluded. Live TalkBack announcements have not been exercised; this is verified source evidence of missing heading semantics.

Thay đổi: Card/header titles expose accessibilityRole header without duplicate accessible labels.

Giới hạn: Static/component semantics verified; actual TalkBack traversal and spoken output UNKNOWN.

Evidence: [apps/mobile/src/components/ScreenLayout.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/components/ScreenLayout.tsx:29>)

```tsx
  return <View style={fieldStyles.card}>{title ? <Text accessibilityRole="header" style={fieldStyles.cardTitle}>{title}</Text> : null}{children}</View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-014/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### M-N-002 — P2 / FIXED

Late old cache writes/clears could remove a newer same-user cache.

Thay đổi: Partition mutation queue and generation fences; meaningful stale-write race RED/GREEN. Native offline matrix pending.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/mobile/src/storage/read-cache.ts:9](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/storage/read-cache.ts:9>)

```tsx
  const generations = new Map<string, number>();
  const mutations = new Map<string, Promise<void>>();
  const mutate = (scopeKey: string, action: () => Promise<void>): Promise<void> => {
    const next = (mutations.get(scopeKey) ?? Promise.resolve()).then(action, action);
```

Verify/raw: [mobile-cache-checkpoint-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-cache-checkpoint-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-N-002/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### W-N-001 — P2 / VERIFIED

Forbidden resource reads displayed zero revenue/capacity/unread counts.

Thay đổi: Resource-gated metrics and explicit unavailable/stale notices; actual GATE_STAFF dashboard checked.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/CollectionState.tsx:20](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:20>)

```tsx
export function ResourceContent({ resource, count, children }: { resource: string; count: number; children: React.ReactNode }) {
  const { resourceStatus = {}, isLoading } = useApp();
  const state = resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready');
  return <>
```

Verify/raw: [dashboard-resource-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dashboard-resource-green.txt>), [header-availability-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/header-availability-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-001/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-004 — P2 / VERIFIED

MANAGER/read-only log readers were rejected by unrelated API-key management permission.

Thay đổi: Restore documented partner_api_log.read for GET list/detail; client/key writes remain denied.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/api/src/modules/partner-handover/controllers/internal/partner-api-log.controller.ts:12](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/api/src/modules/partner-handover/controllers/internal/partner-api-log.controller.ts:12>)

```tsx
  @Permissions(PERMISSION_CODES.PARTNER_API_LOG_READ)
  findMany(@Query() query: QueryPartnerApiLogsDto) {
    return this.partnerApiLogService.findMany(query);
  }
```

Verify/raw: [partner-log-access-green.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-api/partner-log-access-green.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-004/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-008 — P2 / VERIFIED

Opening an existing Gate-out pass also opened an unintended issue form.

Thay đổi: Existing pass takes priority; auto-issue requires explicit create intent and permission.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/GatePassView.tsx:22](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/GatePassView.tsx:22>)

```tsx
  targetAction?: 'create';
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}
```

Verify/raw: [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-008/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-011 — P2 / VERIFIED

A collection refresh reopened a dismissed Truck Visit create form and could overwrite its draft.

Thay đổi: Consume the target intent after it resolves; unrelated refresh does not reopen; initially missing target may resolve later.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/TruckVisitsView.tsx:36](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:36>)

```tsx
  const consumedTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!targetVisitId) {
```

Verify/raw: [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-011/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-014 — P2 / VERIFIED

Tác nghiệp bãi nhập giờ Việt Nam nhưng hướng dẫn và thời gian lịch sử theo múi giờ thiết bị.

Thay đổi: Hiển thị lịch sử và hướng dẫn UTC+7, đúng instant ngay cả khi thiết bị dùng UTC; không chuyển ISO thêm lần nữa.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/yard/YardOperations.tsx:65](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardOperations.tsx:65>)

```tsx
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
```

Verify/raw: [yard-dialog-navigation-red.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/yard-dialog-navigation-red.txt>), [yard-dialog-navigation-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/yard-dialog-navigation-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-014/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-015 — P2 / VERIFIED

Liên kết tài liệu API của Bàn giao hardcode localhost3000 thay vì backend đã cấu hình.

Thay đổi: URL docs dùng cùng API_BASE_URL với HTTP client; kiểm chứng đúng API3001 trong môi trường test.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/HandoversView.tsx:223](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/HandoversView.tsx:223>)

```tsx
            href={`${API_BASE_URL.replace(/\/$/, '')}/docs`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
```

Verify/raw: [handover-docs-link-runtime.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/handover-docs-link-runtime.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-015/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-016 — P2 / VERIFIED

Header danh sách và tab hiển thị số0 khi dữ liệu chưa được xác nhận hoặc bị cấm đọc.

Thay đổi: Count chỉ hiện khi các resource phụ thuộc đã ready/stale; stale được gắn nhãn. Browser403 đã xóa toàn bộ hàng cũ và hiển thị hai nhãn chưa xác nhận, không giả danh sách rỗng.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/CollectionState.tsx:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:4>)

```tsx
export function ConfirmedResourceValue({
  resource,
  children,
  unavailable = 'Chưa xác nhận số lượng',
```

Verify/raw: [count-consumers-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/count-consumers-green.txt>), [web-observation-review.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-observation-review.md>), [network-containers-forbidden-counts-after.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/network-containers-forbidden-counts-after.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-016/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-017 — P2 / VERIFIED

Resource đã tải xong phải chờ toàn bộ read khác, và tariff lỗi làm mất rules của dữ liệu stale.

Thay đổi: Validate/publish từng list hoàn chỉnh; detail/safety vẫn loading tới khi reconcile authoritative. Giữ tariff và rules stale cùng nhau; phép đo browser5s chỉ chứng minh section danh mục đã hiện khi read container còn pending.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/context/AppContext.tsx:413](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/context/AppContext.tsx:413>)

```tsx
      const publishResource = (key: keyof LiveCollections) => {
        if (!activeSession()) return;
        const mapped = mapLiveCollections(raw, latestActor.current.role);
        const affected = new Set([key, ...DEPENDENT_FIELDS.filter(rule => rule.sources.includes(key)).map(rule => rule.resource)]);
```

Verify/raw: [progressive-context-regressions-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/progressive-context-regressions-green.txt>), [progressive-loading-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/progressive-loading-checkpoint-2026-10-04.md>), [network-progressive-delay5-master.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/network-progressive-delay5-master.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-017/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-020 — P2 / VERIFIED

Danh sách Movement Order và vị trí bãi báo không có dữ liệu khi request lỗi hoặc bị cấm đọc.

Thay đổi: Body dùng CollectionState, phân biệt loading/error/forbidden/stale/ready-empty/filter-empty; có retry hoặc xóa bộ lọc đúng trạng thái. Fixture actual2views đã kiểm, runtime các consumer này được ghi riêng.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/MovementOrdersView.tsx:196](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/MovementOrdersView.tsx:196>)

```tsx
                  <CollectionState
                    resource="movementOrders"
                    count={filtered.length}
                    total={movementOrders.length}
```

Verify/raw: [empty-body-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/empty-body-green.txt>), [empty-body-consumers-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/empty-body-consumers-green.txt>), [empty-body-review.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/empty-body-review.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-020/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-N-024 — P2 / VERIFIED

Lệnh vận chuyển trong Container360 thiếu định danh do backend không trả orderCode/orderNumber.

Thay đổi: Dùng ID canonical backend khi không có mã hiển thị; không tạo mã nghiệp vụ mới. Contract regression RED/GREEN và actual Container360 hiển thị UUID đúng record.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/services/mappers/live-view.mapper.ts:182](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/mappers/live-view.mapper.ts:182>)

```tsx
      orderCode: asString(d.orderCode ?? d.orderNumber ?? d.id),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      status: asEnum(d.status, ['DRAFT', 'AUTHORIZED', 'EXPIRED', 'CANCELLED'], 'DRAFT'),
```

Evidence: [apps/api/prisma/schema.prisma:904](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/api/prisma/schema.prisma:904>)

```tsx
model MovementOrder {
  id String @id @default(uuid()) @db.Char(36)

  containerVisitId String @map("container_visit_id") @db.Char(36)
```

Verify/raw: [movement-identity-red-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/movement-identity-red-2026-10-04.txt>), [movement-identity-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/movement-identity-green-2026-10-04.txt>), [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>), [container-movement-identity-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-movement-identity-after-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-024/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-024.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-024.diff>)

### W-N-025 — P2 / VERIFIED

Popup Container360 tại320px bẻ ký tự cuối mã container và ép nhãn tab thành nhiều dòng.

Thay đổi: Header wrap badge theo chiều rộng, nút đóng không co; tab giữ nhãn một dòng trong thanh cuộn hiện có. Đo thực320/375/768/1440px: mã11ký tự một dòng, không tràn document hoặc phần thân popup. Không suy luận zoom200% đã đạt.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/ContainersView.tsx:516](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:516>)

```tsx
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="text-xl font-bold font-mono text-slate-900">
                    {activeVisit.containerNumber}
                  </h3>
```

Verify/raw: [container-dialog-320-oct04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-dialog-320-oct04.json>), [container-dialog-narrow-header-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-dialog-narrow-header-after-2026-10-04.json>), [container-detail-responsive-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-detail-responsive-after-2026-10-04.json>), [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-025/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-025.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-025.diff>)

### W-N-026 — P2 / VERIFIED

Sáu tab chi tiết Container360 chỉ biểu thị lựa chọn bằng màu, thiếu state cho accessibility.

Thay đổi: aria-pressed cập nhật theo tab hiện tại trên sáu native button; regression ban đầu/chuyển toàn bộ tab. Browser Enter chọn đúng mỗi tab, chỉ một pressed=true, focus-visible solid2px. Lời đọc screen reader chưa kiểm.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/ContainersView.tsx:546](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:546>)

```tsx
                aria-pressed={activeDetailTab === 'OVERVIEW'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
```

Verify/raw: [container-detail-selection-red-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/container-detail-selection-red-2026-10-04.txt>), [container-detail-selection-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/container-detail-selection-green-2026-10-04.txt>), [container-detail-keyboard-selection-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/container-detail-keyboard-selection-2026-10-04.json>), [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-026/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-026.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/dependency-detail-2026-10-04/W-N-026.diff>)

### W-N-027 — P2 / VERIFIED

Nhịp spacing có các giá trị2/6/10/14px ngoài grid4px đã chốt.

Thay đổi: Chuẩn hóa281 utility spacing trên21file bằng đơn vị4px, giữ kích thước/icon/offset quang học. Đo72cấu hình main và28cấu hình form/tab: không có spacing ngoài grid trừ sr-only và auto centering có lý do; không tràn document. Không coi sampling này đã bao phủ mọi loại overlay.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/components/Header.tsx:70](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:70>)

```tsx
        <button type="button" onClick={() => void refreshData()} disabled={isLoading} aria-label="Tải lại dữ liệu" title="Tải lại dữ liệu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
        <div className="relative" ref={panelGroup}>
          <button ref={notificationTrigger} type="button" onClick={() => setShowNotifs((show) => !show)} aria-controls={panelId} aria-label={notificationLabel} aria-expanded={showNotifs} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell aria-hidden="true" className="h-4 w-4" />{notificationsAvailable && unreadCount > 0 && <span aria-hidden="true" className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />}</button>
          {showNotifs && <div id={panelId} role="region" aria-label="Danh sách thông báo" className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-xl text-xs overflow-hidden">
```

Verify/raw: [ui-measurements-summary-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/ui-measurements-summary-2026-10-04.json>), [style-matrix-production-main18-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/style-matrix-production-main18-2026-10-04.json>), [spacing-overlay-production-after-bounds-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/spacing-overlay-production-after-bounds-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-027/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [App.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/App.tsx.diff>), [BillingView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/BillingView.tsx.diff>), [ContainersView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/ContainersView.tsx.diff>), [DashboardView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/DashboardView.tsx.diff>), [EDIView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/EDIView.tsx.diff>), [GateInView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/GateInView.tsx.diff>), [GatePassView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/GatePassView.tsx.diff>), [HandoversView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/HandoversView.tsx.diff>), [Header.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/Header.tsx.diff>), [ManifestsView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/ManifestsView.tsx.diff>), [MasterDataView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/MasterDataView.tsx.diff>), [MovementOrdersView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/MovementOrdersView.tsx.diff>), [PartnerManagementView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/PartnerManagementView.tsx.diff>), [Sidebar.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/Sidebar.tsx.diff>), [TruckVisitsView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/TruckVisitsView.tsx.diff>), [UsersRolesView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/UsersRolesView.tsx.diff>), [WebLoginView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/WebLoginView.tsx.diff>), [WorkQueueView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/WorkQueueView.tsx.diff>), [YardOperations.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/yard/YardOperations.tsx.diff>), [YardSiteMap.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/yard/YardSiteMap.tsx.diff>), [YardView.tsx.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/spacing-grid-2026-10-04/diffs/apps/web/src/components/YardView.tsx.diff>)

### W-N-029 — P2 / VERIFIED

Ô nhập thiếu hover; selector bổ sung ban đầu lấn active của nút/link.

Thay đổi: Token hover brightness0,97 cho control đang dùng; selector ưu tiên thấp giữ active0,92 của nút/link và bỏ qua disabled/aria-disabled. Native trusted down và settled hover đo riêng, giữ cả mẫu không so sánh được. Không thêm chuyển động hoặc đổi bố cục.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/index.css:21](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:21>)

```tsx
  --icd-control-hover-brightness: .97;
  --icd-login-grid: #1e3a8a;
  --icd-yard-empty: #f8fafc;
  --icd-yard-site: #eef2f6;
```

Verify/raw: [pointer-states-before-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/pointer-states-before-2026-10-04.json>), [pointer-states-after-input-button-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/pointer-states-after-input-button-2026-10-04.json>), [pointer-states-complete-final-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/pointer-states-complete-final-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-029/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-029.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/pointer-hover-2026-10-04/W-N-029.diff>)

### W-N-030 — P2 / VERIFIED

Placeholder bị giảm alpha50% nên chữ gợi ý không đạt contrast4,5:1.

Thay đổi: Dùng semantic token chữ phụ hiện có và opacity1, token riêng trên nền tối của chính ô nhập. Giữ label và nội dung gợi ý. Giữ kết quả RED của ô QR sau sửa đầu để chứng minh ngoại lệ đã được xử lý; không coi đây là chứng nhận WCAG toàn ứng dụng.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/index.css:42](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:42>)

```tsx
input::placeholder, textarea::placeholder { color: var(--icd-text-secondary); opacity: 1; }
:is(input, textarea):is(.bg-slate-800, .bg-slate-900, .bg-slate-950)::placeholder { color: var(--icd-text-on-dark-secondary); }
button:not(:disabled), [role="button"] { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--icd-focus); outline-offset: 3px; }
```

Verify/raw: [placeholder-contrast-before-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/placeholder-contrast-before-2026-10-04.json>), [placeholder-contrast-after-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/placeholder-contrast-after-2026-10-04.json>), [placeholder-contrast-final-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/placeholder-contrast-final-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-030/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-030.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/placeholder-contrast-2026-10-04/W-N-030.diff>)

### W-R-001 — P2 / VERIFIED

Computed CSS Color 4 measurements show voyage metadata 2.4044:1, EDI field labels 2.5108:1, dashboard lane 2.5573:1 and request ID 2.6282:1. These meaningful labels are normal small text. Decorative separators/icons are excluded. Login-only Lighthouse pass does not cover these authenticated screens.

Thay đổi: Semantic supporting-text colors; measured contrast on72 screen/width cases.

Giới hạn: Computed Color4/ancestor alpha; opacity, images and obscured pixels remain separately scoped.

Evidence: [apps/web/src/index.css:15](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:15>)

```tsx
  --icd-text-secondary: #475569;
  --icd-text-on-dark-secondary: #cbd5e1;
  --icd-focus: #2563eb;
  --icd-state-hover: #eff6ff;
```

Verify/raw: [contrast-after.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/contrast-after.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-R-001/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-R-002 — P2 / VERIFIED

Keyboard focus reaches the map search (:focus-visible=true), but input outline is none, shadow is none and its wrapper has no outline/shadow. Source removes the outline; global focus styling only covers buttons and links.

Thay đổi: Keyboard-visible search focus outline restored on yard map.

Giới hạn: Actual native browser Tab: solid2px outline, focus-visible true; see screenshot.

Evidence: [apps/web/src/components/yard/YardSiteMap.tsx:381](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardSiteMap.tsx:381>)

```tsx
                aria-label="Tìm vị trí hoặc container trên bản đồ"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mã vị trí / container"
```

Verify/raw: [yard-search-focus-final.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/yard-search-focus-final.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-R-002/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-004 — P2 / VERIFIED

Master Data dispatches a Promise and immediately resets all fields and closes the panel. Users create similarly calls createManagedUser without awaiting and clears/closes. A delayed or failed request therefore loses the entered data and removes the local recovery surface. AppContext.command does show the global apiError banner on failure, so this finding does not claim errors are absent everywhere.

Thay đổi: Await guarded commands; failed save keeps input and dialog; distinguish saved/refresh failure.

Giới hạn: Actual components in deferred/rejected fixtures plus real browser duplicate/save evidence.

Evidence: [apps/web/src/components/useCommandAction.tsx:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useCommandAction.tsx:4>)

```tsx
export function useCommandAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<CommandResult | null>(null);
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [master-data-save-persisted-375.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/master-data-save-persisted-375.json>), [master-data-conflict-retains-draft-375.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/master-data-conflict-retains-draft-375.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-004/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-006 — P2 / VERIFIED

Master Data blank name, Users blank name/email, MBL blank number and HBL blank number/consignee silently return. These panels use div + onClick rather than a native required form, so the visible asterisk does not provide browser validation. Users/Master Data email inputs also default to text. No invalid/error association or first-invalid focus is provided in these paths. This is verified from the handlers and control markup; no submit was exercised.

Thay đổi: Field-associated validation and focus to first invalid control.

Giới hạn: Fixture and native browser validation; actual screen-reader announcements pending.

Evidence: [apps/web/src/components/useFormValidation.tsx:3](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useFormValidation.tsx:3>)

```tsx
export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = (form: HTMLFormElement) => {
    const next: Record<string, string> = {};
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [axe-master-validation-final.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/axe-master-validation-final.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-006/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-007 — P2 / VERIFIED

Permission codes in the role editor and role chips in Add User are native named buttons, but their selected state is rendered only through CSS color/border. No aria-pressed/checked state is attached. Similar top-level local view toggles in Billing, Master Data, EDI and Users/Roles use color-only active state. Native buttons are correct for actions; a tablist is not required if these controls remain a button group with explicit pressed state.

Thay đổi: Selection exposes aria-pressed and native checked state.

Giới hạn: Actual component semantics; keyboard selection rechecked in retained regression suite.

Evidence: [apps/web/src/components/UsersRolesView.tsx:72](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/UsersRolesView.tsx:72>)

```tsx
              aria-pressed={tab === 'USERS'}
              onClick={() => setTab('USERS')}
              className={`px-3 py-2 rounded-md text-xs font-bold ${tab === 'USERS' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
```

Verify/raw: [web-old-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-old-regressions-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-007/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-008 — P2 / VERIFIED

The list derives EXPIRED when an ACTIVE pass expires, but detail badge/actions use only status === ACTIVE and still invite Gate-out. For every non-ACTIVE status, detail copy says the pass was used and offers the Handover next action, including CANCELLED or EXPIRED. Container 360 also locates any ACTIVE pass without expiry and labels it currently valid. Backend rechecks Gate-out; the finding is contradictory UI guidance, not bypassed enforcement.

Thay đổi: Canonical status/expiry helper and deadline-triggered updates; unknown state fails closed.

Giới hạn: Expired/cancelled/used/boundary and refreshed-expired fixtures; Android scan pending.

Evidence: [apps/web/src/components/useGatePassExpiry.ts:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useGatePassExpiry.ts:4>)

```tsx
export function useGatePassExpiry(passes: GatePass[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const current = Date.now();
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [independent-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-business/independent-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-008/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-009 — P2 / VERIFIED

The inline Gate Pass display uses Lucide QrCode, which draws a fixed icon unrelated to qrToken. It cannot encode the issued token. The dedicated Gate Pass view already uses react-qr-code with the token, so the same business artifact appears scannable in one screen and as a decorative symbol in another.

Thay đổi: Token-bearing react-qr-code replaces decorative icon in Container360.

Giới hạn: Real backend-ready synthetic lifecycle, real Container360 QR screenshot; OpenCV decoded value SHA256 equals backend token. Test pass cancelled afterward; token text is not in the report.

Evidence: [apps/web/src/components/ContainersView.tsx:1042](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/ContainersView.tsx:1042>)

```tsx
                          <QRCode
                            value={activeVisitGatePass.qrToken}
                            size={160}
                            data-testid="container-gate-pass-qr"
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [qr-runtime-decode.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/qr-runtime-decode.json>), [qr-runtime-backend.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/qr-runtime-backend.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-009/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-010 — P2 / VERIFIED

Overview distinguishes checking, result and no result. The Gate Pass tab branches only on readiness?.blockers.length === 0; both null/pending and failed network check fall into copy saying unmet conditions are blocking issue. No checking/error branch is rendered in that tab. Unknown evaluation is therefore stated as a business blocker.

Thay đổi: Readiness distinguishes checking/error/unavailable/blocked/ready and rejects incomplete flags.

Giới hạn: Deferred old responses cannot enable a newly selected visit; API readiness also tested on isolated DB.

Evidence: [apps/web/src/components/useBackendReadiness.ts:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/useBackendReadiness.ts:5>)

```tsx
export function useBackendReadiness(visitId?: string | null) {
  const {
    checkReadiness,
    containerVisits,
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-010/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-011 — P2 / VERIFIED

The datetime-local default is built using toISOString().slice(0,16), which removes the UTC zone but presents the UTC clock as a local value. Submission then parses that value as local and converts it back to UTC. On the workspace Asia/Saigon UTC+07 zone, the default intended now+24h becomes now+17h. Source proves this timezone transformation; real-browser displayed date was not measured by this agent.

Thay đổi: Date-only/timestamp conversion uses Vietnam UTC+7 once, including tariff business dates.

Giới hạn: Calendar, timezone and invalid date fixtures; API persisted dates inspected.

Evidence: [apps/web/src/lib/time.ts:19](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/lib/time.ts:19>)

```tsx
export function vietnamBusinessDateToIso(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return vietnamDateTimeToIso(`${value}T00:00`);
  // Preserve instants from callers that already supply an explicit timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
```

Verify/raw: [tariff-vietnam-date-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/tariff-vietnam-date-green.txt>), [web-source-tests-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-source-tests-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-011/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-012 — P2 / VERIFIED

HANDOVER_REVIEW fallback navigation sends task.containerVisitId. App forwards the generic context as targetHandoverId. Handovers resolves this exclusively by handover.id, then falls back to the first handover. A task can therefore open an unrelated first handover instead of its review record. This is a source contract mismatch; whether fixture IDs happen to match remains runtime UNKNOWN.

Thay đổi: Navigation carries visit/handover/pass/truck IDs and explicit action independently.

Giới hạn: Backend does not currently produce HANDOVER_REVIEW; no invented producer.

Evidence: [apps/web/src/navigation.ts:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/navigation.ts:5>)

```tsx
export function makeDestination(tab: NavTabId, id?: string, explicit: NavigationContext = {}): string {
  const context: NavigationContext = { ...explicit };
  if (id) context[tab === 'handovers' ? 'handoverId' : 'visitId'] = id;
  if (tab === 'truck-visits' && context.visitId) context.action = 'create';
```

Verify/raw: [web-source-tests-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-source-tests-final.txt>), [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-012/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-013 — P2 / VERIFIED

Movement Order action says Tạo Truck Visit and sends containerVisitId, but App renders TruckVisitsView with only onNavigate; TruckVisitsView supports no context prop and initializes showCreateModal=false, selectedConts empty. Users arrive at a generic list and must reopen the form and retype the intended container. Truck Visit Gate-in shortcut also omits its linked visit, sending users to a blank selection.

Thay đổi: Truck Visit shortcut keeps linked container context and opens authorized create form.

Giới hạn: Actual component fixture; no write on navigation.

Evidence: [apps/web/src/components/TruckVisitsView.tsx:14](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/TruckVisitsView.tsx:14>)

```tsx
  targetVisitId?: string;
  onNavigate: (tab: NavTabId, contextId?: string) => void;
}

```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-013/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-014 — P2 / VERIFIED

App navigation changes local activeTab/activeContextId without router, URL or history. A reload starts at dashboard; browser Back cannot restore in-app selections. Conditional renderContent also unmounts most views, so their local filters, selections and form drafts disappear when navigating away and back. Partner CLIENTS/LOGS is the same component type and can retain state, so this is not claimed for that pair. Session state/data security resets are separate.

Thay đổi: Router URL state, user-scoped query state, retained draft and dirty/pending navigation guards.

Giới hạn: Real browser Back/Forward/cancel/accept, Tab/Shift+Tab/Escape; late logout clears user-scoped views.

Evidence: [apps/web/src/App.tsx:5](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/App.tsx:5>)

```tsx
  useBlocker,
  useLocation,
  useNavigate,
} from 'react-router-dom';
```

Verify/raw: [navigation-draft-runtime.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/navigation-draft-runtime.json>), [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-014/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-015 — P2 / VERIFIED

Audits and Master Data table bodies contain only mapped rows. Truck Visit cards, Partner clients/logs, Manifest list, Handover list, Gate Pass list and EDI outbox/routes similarly have no explicit collection/no-match branch at the list location. Existing detail placeholders ask users to choose a record even when no records exist. Global loading/error indicators do exist; this finding is specifically settled zero/no-match state.

Thay đổi: Empty, no-match, loading, failure, forbidden and stale states are distinct with recovery.

Giới hạn: Fixture zero/filter/error/403 plus measured main views; broader network matrix pending.

Evidence: [apps/web/src/components/CollectionState.tsx:29](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/CollectionState.tsx:29>)

```tsx
export function CollectionState({
  resource,
  count,
  total = count,
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [dashboard-resource-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dashboard-resource-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-015/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-017 — P2 / VERIFIED

getSimulatedEdifact constructs segments from UI fields and hardcodes EQD ISO type 45G1 and other envelope values. Both Copy and the panel labelled raw UN/EDIFACT payload use that function rather than the actual outbound message. An operator inspecting a 20-foot/reefer message can therefore copy a generated 40HC example presented as source-of-truth transmission data.

Thay đổi: EDI inspector displays canonical payloadSnapshot and separates send state from ACK.

Giới hạn: MOCK external provider; internal outbox, ACK and alert operations persisted; no actual external delivery claimed.

Evidence: [apps/web/src/components/EDIView.tsx:337](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/EDIView.tsx:337>)

```tsx
                      disabled={selectedEdi.payloadSnapshot == null}
                      onClick={() =>
                        handleCopy(JSON.stringify(selectedEdi.payloadSnapshot, null, 2))
                      }
```

Verify/raw: [web-fixtures-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-fixtures-final.txt>), [dashboard-edi-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dashboard-edi-green.txt>), [workflows-completed.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-api/workflows-completed.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-017/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-018 — P2 / VERIFIED

Sidebar page permission checks distinguish read from write, but Users/Roles, Master Data and Billing show creation/toggle/edit controls without checking the corresponding write permissions. Read-only users may enter these pages and are invited to actions the API will reject. This is an interaction/permission-state issue, not a claim that the backend is insecure. Yard already demonstrates exact permission gating.

Thay đổi: Exact action permissions, command/session boundary checks and read-only notice.

Giới hạn: Seven real UI accounts; custom roles and104 generated routes/102 single-decorator methods independently compared; exact/downgraded permission fixtures and real read-only notice. Full per-overlay role cross-product remains coverage UNKNOWN.

Evidence: [apps/web/src/services/write-permissions.ts:528](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/services/write-permissions.ts:528>)

```tsx
export function requiredWritePermission(path: string, method = 'POST'): string | null | undefined {
  return rules.find(rule => rule.method === method && rule.pattern.test(path))?.permission;
}
```

Verify/raw: [web-all-regressions-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-all-regressions-final.txt>), [context-write-permission-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/context-write-permission-green.txt>), [read-only-containers-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/read-only-containers-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-018/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-S-019 — P2 / VERIFIED

Header provides a correctly named trigger and aria-expanded, and the trigger can toggle the panel closed. However, its panel contains no Escape handler, outside-click listener or visible Done/close control. It can remain open over changed content until users rediscover the same trigger. A nonmodal panel does not require dialog/menu roles or focus trapping, so those are not claimed missing.

Thay đổi: Nonmodal notification panel has Escape, outside click, trigger, explicit close and route cleanup.

Giới hạn: Real browser four dismiss paths; asynchronous mark-read fixtures; unavailable count no longer announces zero.

Evidence: [apps/web/src/components/Header.tsx:42](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/Header.tsx:42>)

```tsx
  const notificationState = resourceStatus.notifications ?? (isLoading ? 'loading' : 'ready');
  const notificationsAvailable = notificationState === 'ready' || notificationState === 'stale';
  const notificationLabel = notificationState === 'ready' ? `Thông báo (${unreadCount} chưa đọc)`
    : notificationState === 'stale' ? `Thông báo (${unreadCount} chưa đọc, chưa cập nhật)`
```

Verify/raw: [notification-dismiss-final.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/notification-dismiss-final.json>), [header-availability-green.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/header-availability-green.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-S-019/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### M-013 — P3 / FIXED

AppHeader embeds scanner red/white colors and8/10/12px type values. Shared ScreenLayout uses14dp padding/gap and10/9dp input padding despite a4/8 spacing scale. Theme definitions may contain literals; this finding concerns consumer components bypassing them. It does not require a new visual design.

Thay đổi: Shared styles use named typography/spacing/layout tokens and heading-specific line-height.

Giới hạn: Static styles and actual rendered heading style fixtures; geometry/reflow still requires native.

Evidence: [apps/mobile/src/theme/typography.ts:19](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/mobile/src/theme/typography.ts:19>)

```tsx
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
```

Verify/raw: [checkpoint-mobile-tests.log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-agent/checkpoint-mobile-tests.log>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/M-013/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

- [ ] Hoàn thành acceptance còn thiếu bằng phương pháp runtime phù hợp; không đóng lỗi từ fixture.

### W-N-031 — P3 / VERIFIED

Feedback hover bằng filter đổi tức thì dù các màu khác transition150ms.

Thay đổi: Thêm filter vào transition150ms ease-out hiện có. Đo các frame khi native click/hover và giữ CSS active ưu tiên hơn hover; reduced-motion vẫn tắt transition không thiết yếu. Không thêm animation trang hoặc optimistic transaction.

Giới hạn: Native/runtime matrix remains separate from fixture result; see coverage.

Evidence: [apps/web/src/index.css:37](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:37>)

```tsx
button, a, input, select, textarea { transition-property: background-color, color, border-color, opacity, filter; transition-duration: var(--icd-motion-feedback); transition-timing-function: ease-out; }
:where(button, a, input, select, textarea, [role="button"]):hover:not(:disabled, [aria-disabled="true"]) { filter: brightness(var(--icd-control-hover-brightness)); }
button:active:not(:disabled), a:active:not([aria-disabled="true"]) { filter: brightness(.92); }
button:disabled { cursor: not-allowed; }
```

Verify/raw: [pointer-states-complete-final-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/pointer-states-complete-final-2026-10-04.json>), [feedback-frames-final-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/feedback-frames-final-2026-10-04.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-N-031/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

Diff snapshot liền kề riêng của fix: [W-N-031.diff](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/feedback-transition-2026-10-04/W-N-031.diff>)

### W-R-003 — P3 / VERIFIED

Dashboard and Manifest repeat arbitrary 9/10/11px Tailwind values. These are local literals outside the named default type scale, making changes to metadata/action roles inconsistent. Named Tailwind spacing/color utilities are treated as tokens; literals inside a token definition are not findings.

Thay đổi: Repeated arbitrary metadata sizes replaced with named typography roles.

Giới hạn: Source criterion; complete font/spacing matrix still pending.

Evidence: [apps/web/src/index.css:4](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:4>)

```tsx
  --text-caption: .75rem;
  --text-caption--line-height: 1rem;
  --text-body: .875rem;
  --text-body--line-height: 1.25rem;
```

Verify/raw: [web-source-tests-final.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-source-tests-final.txt>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-R-003/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

### W-R-004 — P3 / VERIFIED

Measured desktop shell h1 is16px/24px=1.5. The current heading utilities inherit loose line heights rather than the requested1.1-1.3. This is a rubric consistency gap, not a WCAG failure or a demonstrated task blocker.

Thay đổi: Heading line-height set to1.25 within the agreed1.1–1.3 range.

Giới hạn: CSS and sampled computed headings; no claim all content role exceptions are audited.

Evidence: [apps/web/src/index.css:32](<D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/index.css:32>)

```tsx
h1, h2, h3, h4, h5, h6 { line-height: 1.25; overflow-wrap: anywhere; }
.text-slate-400, .text-slate-500 { color: var(--icd-text-secondary); }
aside .text-slate-400, aside .text-slate-500 { color: var(--icd-text-on-dark-secondary); }
.bg-slate-900 .text-slate-400, .bg-slate-900 .text-slate-500,
```

Verify/raw: [axe-dashboard-final.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/axe-dashboard-final.json>)

Diff/fix log: [fix log](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/fixes/W-R-004/fix-log.json>); shared-file diffs được ghi rõ phạm vi chồng nhau.

## Hai residual subtask

- W-S-005 / VERIFIED: Non-financial command guards and input preservation; deferred/rejected components verified.
- W-S-016 / VERIFIED: Manifest/Role/Handover detail availability with stale/403 recovery.

## Đo thực tế trong batch này

| Phép kiểm | Kết quả | Phạm vi / giới hạn |
|---|---|---|
| Nhịp spacing | 281utility/21file;100main/overlay samples;0document overflow | sr-only và auto-centering được tách; mọi loại overlay chưa đủ |
| Chữ gợi ý | 11/11PASS; thấp nhất 7,2:1 | Pseudo-element/nền thực, gồm QR và Login tối; không phải toàn WCAG |
| Loading | 18/18main có trạng thái đang tải | Real bounded GETcontainer5s; chưa đủ mọi overlay/network combination |
| Progressive | Known records 688,6ms; all reads 6352,3ms | DOMpoll50ms nominal; không phải exact first paint |
| Hover/active | Native trusted down và các frame chuyển dần150ms ease-out | Input/button/link; không tạo event giả |
| Banner lỗi read | Khoảng865px→129,3px; chi tiết96px có keyboard scroll | Toàn nội dung và retry giữ nguyên; nguyên nhân HTTP vẫnUNKNOWN |
| navigation input→feedback | 20samples; p50=23,5ms; p95=57,9ms | Local two-frame upper-bound proxy; không phải fieldINP |
| dialog input→feedback | 20samples; p50=19,4ms; p95=24,1ms | Local two-frame upper-bound proxy; không phải fieldINP |
| selection input→feedback | 20samples; p50=12,3ms; p95=13,8ms | Local two-frame upper-bound proxy; không phải fieldINP |
| filter input→feedback | 20samples; p50=14,9ms; p95=19,4ms | Local two-frame upper-bound proxy; không phải fieldINP |
| submit input→feedback | 20samples; p50=13,9ms; p95=16,9ms | Local two-frame upper-bound proxy; không phải fieldINP |

Raw tổng hợp: [measurements](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/ui-measurements-summary-2026-10-04.json>). 80record tổng hợp từ bốn lượt UI được đối chiếu persisted trên DB test; không phải giao dịch native.

Ảnh UI375px cuối: [Gate Pass / scanner web](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/screenshots/gatepass-375-final-2026-10-04.png>); lỗi read sau sửa: [banner lỗi có giới hạn](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/screenshots/read-error-bounds-375-after-2026-10-04.png>).

WCAG áp dụng contrast cả placeholder: [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Top10 ưu tiên kiểm chứng tiếp

- [ ] Android: nạp phiên bản nguồn mới vào Expo Go bằng thao tác được hỗ trợ; xác nhận API3001 trước giao dịch.
- [ ] M-N-001: logout/refresh/login/reconnect native; phiên cũ không khôi phục token hoặc xóa phiên mới.
- [ ] Cổng native: Gate-in/QR/readiness/Gate-out, fail/pending/double-submit; đối chiếu persisted state.
- [ ] M-004/M-005: đo hitbox/gap320–768dp, font150/200%, keyboard và safe area cả hai theme.
- [ ] M-010/M-011: picker ngày/giờ và cold-launch/theme persistence native.
- [ ] Web: hoàn tất các form/overlay theo lớp quyền và đường dẫn entity không tồn tại; tránh thao tác nhầm bản ghi.
- [ ] Web/Android: screen-reader speech và Android external keyboard; props/XML không đủ.
- [ ] Web: hoàn thành ma trận delay1/5s, offline/reconnect401/403/409/422/500 theo màn và overlay.
- [ ] Performance: năm route production có auth;100mẫu input→feedback đã có. FieldINP và dữ liệu người dùng thực tế vẫn riêng.
- [ ] Re-audit toàn matrix và tính lại cùng IDs/trọng số; mỗi dimension≥23 và tổng≥95 trước nghiệm thu.

## Kiểm tra kỹ thuật và nghiệp vụ

- [final-verification-manifest-feedback-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/final-verification-manifest-feedback-2026-10-04.json>)
- [technical-check-exits-feedback-2026-10-04.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/technical-check-exits-feedback-2026-10-04.json>)
- [dependency-detail-checkpoint-2026-10-04.md](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/dependency-detail-checkpoint-2026-10-04.md>)
- [web-sdk-source-tests-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-sdk-source-tests-feedback-2026-10-04.txt>)
- [web-runtime-fixtures-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-runtime-fixtures-feedback-2026-10-04.txt>)
- [web-existing-ui-regressions-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-existing-ui-regressions-feedback-2026-10-04.txt>)
- [web-typecheck-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-typecheck-feedback-2026-10-04.txt>)
- [mobile-tests-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-tests-2026-10-04.txt>)
- [mobile-typecheck-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/mobile-typecheck-2026-10-04.txt>)
- [web-build-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-build-feedback-2026-10-04.txt>)
- [lint-feedback-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/lint-feedback-2026-10-04.txt>)
- [root-auth-recovery-independent-green-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/root-auth-recovery-independent-green-2026-10-04.txt>)
- [billing-regressions-2026-10-04.txt](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/billing-regressions-2026-10-04.txt>)
- [workflows-completed.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-api/workflows-completed.json>)
- [final-persisted-state.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/web-types-api/final-persisted-state.json>)
- [qr-runtime-decode.json](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/browser/qr-runtime-decode.json>)

Bộ kết quả606/606tests:431chạy lại trên mã cuối (web/SDK122, fixtures257, runtimeUI52), cộng175mobile source giữ từ lượt trước vì mã mobile không đổi. ESLint0errors/0warnings; web typecheck/build exit0. Mobile175 không phải175case native. Manifest ghi hash220file nguồn và hash log; không cộng lại test subset vào tổng.


Workflow API:132 assertions thực tế trên DB test; Manifest→MBL/HBL, Gate-in, bãi, inspection/booking, billing, Holds/readiness, Gate Pass/use/Gate-out, EDI MOCK và partner handover. Trạng thái workflow-fixtures là snapshot từng giai đoạn; final-persisted-state ưu tiên cho trạng thái hiện tại. Không suy luận native đã thực hiện các giao dịch này.

Lighthouse3lượt production **Login only**: [summary](<D:/Project/Đồ Án 4 +Mobile/icd-management/audit/runs/2026-10-03-improvement-02/raw/performance/lighthouse-summary.json>).

```json
{
  "LCP_ms": {
    "values": [
      1810.245,
      1807.9718,
      1809.2039
    ],
    "median": 1809.2039,
    "range": [
      1807.9718,
      1810.245
    ]
  },
  "CLS": {
    "values": [
      0,
      0,
      0
    ],
    "median": 0,
    "range": [
      0,
      0
    ]
  },
  "TBT_ms": {
    "values": [
      7,
      9,
      6.5
    ],
    "median": 7,
    "range": [
      6.5,
      9
    ]
  },
  "performance_score": {
    "values": [
      0.99,
      0.99,
      0.99
    ],
    "median": 0.99,
    "range": [
      0.99,
      0.99
    ]
  },
  "accessibility_score": {
    "values": [
      1,
      1,
      1
    ],
    "median": 1,
    "range": [
      1,
      1
    ]
  }
}
```

## Coverage tám nhóm và giới hạn

| Nhóm | Có bằng chứng | Phần tiếp tục |
|---|---|---|
| Accessibility | Contrast72cases; axe main/overlay; keyboard modal/map | Live screen-reader, native target/font/safe-area; incomplete axe manual |
| Interactive states | Fixtures; real save/reject; native hover/pressed/frame transition | Full runtime delay/offline/permission matrix |
| Layout | Web320/375/768/1440 captures and overflow repairs | Real200%zoom; native new-source geometry |
| Forms | Labels/field errors/input retention; decimal/time/date checks | All overlay native/browser transactional acceptance |
| Tokens | Named semantic web/mobile roles; shared Legend/model tests | Full-source exceptional geometry and pixel checks |
| Navigation | Canonical URL IDs; real Back/Forward/draft; exact permissions | Every deep link/auth/error/role cross-product native |
| Microcopy | Known enums/templates; unavailable/stale and next actions | Native actual strings/text scaling across secondary screens |
| Performance | ProductionLogin lab3runs; lazy chunks;100feedback timings | Authenticated5routes; fieldLCP/INP/CLS |

## Plan tiếp tục và bàn giao

- [x] Lưu snapshot trước sửa; giữ working tree của người dùng.
- [x] Database/API test cô lập và tài khoản bảy lớp quyền; runtime backend thật.
- [x] Work packages mã nguồn và regression; phát hiện/sửa thêm lỗi độc lập.
- [x] Web UX Gap≥95 và từng dimension≥23 trong rubric đã khóa; measurement và raw giữ đầy đủ.
- [ ] Hoàn tất native Android và toàn bộ runtime acceptance còn pending.
- [ ] Chạy lại checks sau thay đổi cuối; bổ sung evidence tương ứng thay vì đổi mẫu số.
- [ ] Đạt≥95/các dimension≥23; Nielsen≥95 cùng coverage đầy đủ thiết yếu.
- [ ] Re-audit cuối, khôi phục cấu hình emulator/API và chỉ dừng runtime của audit khi hoàn tất.

**Next action:** xử lý các ô UNKNOWN theo Top10; phiên audit tiếp tục ở checkpoint này. Chưa kết luận sẵn sàng ship.

Automatic approval review đã từ chối thao tác reload/intent Expo Go với lý do “blocked by policy”. Hiện ADB không có thiết bị kết nối. Không thử lại hoặc đi đường vòng; cần emulator mở và app nguồn hiện tại được nạp bằng thao tác được hỗ trợ trước khi đóng các acceptance Android.

