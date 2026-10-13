# ICD - Kiểm chứng Android native, lượt 01 ngày 11/10/2026

## Trạng thái tại checkpoint chuẩn bị

ADB đã kết nối `emulator-5554`, Expo Go 57.0.9 đang mở. Docker audit và API test đã chạy; truy vấn health từ Android qua ADB reverse trả HTTP 200 và database `up`. Mobile typecheck đạt; 175/175 source regression tests đạt.

**Kiểm chứng giao diện ICD native vẫn PENDING:** tại checkpoint này Metro 8081 chưa chạy, ảnh hiện có là trang chủ Expo Go. Chưa nâng điểm UX hoặc chuyển finding thành VERIFIED dựa trên lượt chuẩn bị này.

Baseline được giữ tại [re-audit 04/10](2026-10-04-reaudit-01-report.md). Điểm có bằng chứng trong baseline: mobile UX Gap 60,6/100, Nielsen 45/100. Những điểm này không được tính lại bằng kết quả API hoặc source tests.

## Môi trường

| Thành phần | Trạng thái và bằng chứng |
|---|---|
| Thiết bị | `emulator-5554`, Android 9; kích thước ban đầu 1920x1080, density 280. Chưa đổi kích thước/font/theme. [Manifest](runs/2026-10-11-native-01/manifest.json) |
| Expo Go | 57.0.9. [Ảnh trang chủ](runs/2026-10-11-native-01/screenshots/00-expo-go-preflight.png), [hierarchy](runs/2026-10-11-native-01/raw/00-expo-go-preflight.xml) |
| Database | Container `icd-native-audit-mysql-20261011`, image `mysql:8.4`, bind `127.0.0.1:3308:3306`, volume `icd-native-audit-20261011-mysql`. DB test `icd_ux_audit_20261003_e2e`. [Identity và schema counts](runs/2026-10-11-native-01/raw/docker-database-preflight.json) |
| API | Guarded Jest UI audit runtime, cổng 3001; cron dừng, delivery ra ngoài dùng provider test, EDI dùng MOCK. Guard kiểm DB thực tế và PID runtime. |
| Kết nối Android | `http://127.0.0.1:3001/api`, ADB reverse tcp:3001; [health từ thiết bị](runs/2026-10-11-native-01/raw/device-api-connectivity-curl.json). Đây là bằng chứng đường mạng, chưa xác nhận URL biên dịch trong app. |
| Metro | Chưa chạy. Automatic approval review từ chối lệnh khởi động với lý do `blocked by policy`. Chờ người dùng mở launcher thủ công. |
| Mã mobile | Hash 129 file nguồn/test/entrypoint trong manifest; không sửa source UI trong lượt này. |

MySQL và API local được mở ở đầu phiên đã dừng sau khi người dùng yêu cầu dùng container. Các bằng chứng local ban đầu đã bị thay thế về phạm vi môi trường; nghiệm thu giao dịch tiếp theo dùng Docker audit.

## Những kiểm tra đã chạy

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Mobile typecheck | Exit 0 | [Raw và metadata](runs/2026-10-11-native-01/raw/mobile-source-checks/typecheck.result.json); source |
| Mobile regression | 175 PASS, 0 FAIL | [Raw và metadata](runs/2026-10-11-native-01/raw/mobile-source-checks/test.result.json); source |
| Guard môi trường test | RED 5 FAIL; sau sửa GREEN 7/7 PASS | [Diff và metadata](runs/2026-10-11-native-01/raw/mobile-source-checks/guard-pin.summary.json); ghim DB3308/API3001 ngay cả khi cả env và URL cùng đổi. |
| Docker schema và seed | Thành công, schema mới trong volume audit | [Schema log](runs/2026-10-11-native-01/raw/schema.log), [seed log](runs/2026-10-11-native-01/raw/seed.log) |
| Tài khoản theo quyền | 7 lớp quyền; API login và các phép từ chối đã ghi nhận | [Accounts](runs/2026-10-11-native-01/raw/web-types-api/accounts.json). Tài khoản UI riêng cũng đã tạo; secrets giữ trong private env. |
| Workflow API thật trên DB test | Hoàn tất, 127 assertion PASS, 46 entity fixture | [Kết quả](runs/2026-10-11-native-01/raw/web-types-api/workflows.json), [ID và state](runs/2026-10-11-native-01/raw/web-types-api/workflow-fixtures.json) |
| Android truy cập API Docker | HTTP 200, database up | [Native curl](runs/2026-10-11-native-01/raw/device-api-connectivity-curl.json); không thay cho thao tác UI |

Workflow fixture đi qua Manifest/MBL/HBL, authorize/chuyến xe/Gate-in, kiểm và xếp slot, movement/inspection/booking, thanh toán một phần/toàn phần, Hold/readiness, Gate Pass hủy/dùng, Gate-out, EDI MOCK và handover/idempotency. Entity và request status được ghi vào JSON; QR token, password, JWT và API key không ghi trong báo cáo.

## Danh sách native acceptance còn chờ

Tất cả ID sau giữ trạng thái source `FIXED`, trạng thái native `PENDING`. [Acceptance ledger](runs/2026-10-11-native-01/acceptance-cases.json) giữ tiêu chí baseline.

| ID | Phép kiểm bắt buộc |
|---|---|
| M-004 | Đo target >=48dp và khoảng cách >=8dp tại 320/360/412/768dp; tránh hitbox chồng nhau. |
| M-005 | Font 150%/200%, màn hẹp, tab labels/header/Gate mode, keyboard và safe area; ảnh + bounds. |
| M-006 | Nhãn tiếng Việt trên list/detail/confirmation; unknown enum trung tính, thông báo backend không lộ raw code. |
| M-007 | Damage có severity; Seal/Condition bỏ severity; payload persisted không giữ nội dung cũ. |
| M-008 | History delayed/loading, error/retry, empty thật, refresh có dữ liệu cũ và response tới muộn. |
| M-009 | Unread count 0/>0; mark-one/mark-all cập nhật theo server; count error không giả 0. |
| M-010 | Native date/time picker, cancel giữ giá trị; UTC+7 khớp ISO và dữ liệu persisted. |
| M-011 | Theme sáng/tối/hệ thống; cold launch giữ lựa chọn và phiên. |
| M-012 | Lỗi theo field cập nhật khi sửa; giữ lỗi server tới retry hoặc dữ liệu liên quan đổi. |
| M-013 | Token usage có kiểm nguồn, bố cục native hai theme/màn hẹp/chữ lớn còn phải đo. |
| M-014 | TalkBack đi qua heading đúng thứ tự, một lần; nội dung/control còn reachable. Cần chứng cứ lời đọc. |
| M-N-001 | Refresh/cleanup tới muộn không khôi phục phiên đã logout hoặc xóa phiên mới; cần tạo race thực tế. |
| M-N-002 | Cache write/clear cũ không xóa cache mới cùng user; kiểm offline/reconnect và đổi phiên. |

## Các batch thao tác sau khi mở được app

- [ ] Login, restore, logout, ADMIN/GATE/YARD/OPERATOR/read-only/zero permissions; kiểm Back và Tài khoản.
- [ ] Cổng: Gate-in scan/fallback/form/success, readiness, Gate Pass invalid/used/cancelled, Gate-out confirmation và đối chiếu persisted state.
- [ ] Bãi và Giám định: map/slot detail/xếp tay, movement, survey validation/severity/history, booking native picker, popup xác nhận và chi tiết.
- [ ] Tra cứu/Việc ca/Thông báo: filter/empty/error/stale, mở đúng entity, unread count và mark-read.
- [ ] Responsive: 320/360/412/768dp, font 1.0/1.5/2.0, sáng/tối, keyboard; lưu PNG/XML/target measurements.
- [ ] Mạng, camera permissions, background/resume; TalkBack và external keyboard. Camera decode và lời đọc chỉ đóng khi có bằng chứng tương ứng.
- [ ] Tính lại rubric từ observation đã verify; giữ iOS/VoiceOver và field performance UNKNOWN.

## Launcher cho người dùng

Nhấp đúp [start-mobile-native-audit.bat](../start-mobile-native-audit.bat) trong File Explorer và giữ cửa sổ mở. Launcher dùng `pnpm.cmd`, kiểm guard API/database, ADB và mapping, rồi mở Metro/Expo Go. Agent chưa chạy launcher vì action khởi động Metro bị automatic approval review từ chối.

Nếu Metro chạy nhưng Expo Go chưa mở dự án, nhập `exp://127.0.0.1:8081` tại Enter URL. Nếu lỗi, giữ nguyên dòng lỗi để chẩn đoán; không tự đổi sang API/database khác.

## Giới hạn và trạng thái bàn giao

Đây là checkpoint chuẩn bị môi trường, chưa phải biên bản hoàn tất native audit. Không có screenshot ICD, số đo hitbox/font, thao tác native transaction hoặc spoken TalkBack mới trong checkpoint này. Các runtime Docker/API đang giữ để tiếp tục phiên test; cấu hình màn hình/font/theme chưa đổi.
