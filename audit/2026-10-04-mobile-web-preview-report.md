# ICD mobile - Expo Web smoke test, 2026-10-04

## Phạm vi

Theo yêu cầu mới, mở cùng app React Native bằng Expo Web để kiểm thử trên trình duyệt. URL: http://127.0.0.1:8081/. API: http://127.0.0.1:3001/api. Database đã kiểm guard: `icd_ux_audit_20261003_e2e`, MySQL 3308. Tài khoản ADMIN tổng hợp; không ghi credential hoặc token vào báo cáo.

Không tiếp tục cài/chạy app trên emulator trong lượt này. Các ca Android, iOS, camera, TalkBack và picker native vẫn chưa được nghiệm thu. Kết quả dưới đây là smoke test Expo Web; không đổi điểm hoặc trạng thái VERIFIED native trong báo cáo re-audit.

## Lỗi đã sửa

| ID | Severity | Category | Evidence | Vấn đề | Sửa và verify |
|---|---|---|---|---|---|
| M-WEB-001 | P1 trong môi trường test | Kết nối frontend/backend | `audit/tools/setup-audit-db.mjs:18`; `apps/api/src/bootstrap/configure-app.ts:29`; raw CORS trước/sau bên dưới | API test chỉ cho phép origin 5174. Preflight 8081 trả 204 nhưng thiếu `Access-Control-Allow-Origin`; đăng nhập báo không kết nối. | Bổ sung chính xác localhost/127.0.0.1 cổng 8081 vào cấu hình private của DB test và script setup; restart đúng API audit. Verify bốn origin local được cho phép, origin không tin cậy vẫn bị từ chối. Đăng nhập và khôi phục phiên qua UI thành công. |

Chỉ sửa cấu hình công cụ/môi trường audit, không sửa mã ứng dụng hoặc contract nghiệp vụ. Không chạy lại schema, seed hoặc reset database. API 3000 và các web runtime khác được bảo toàn.

## Kết quả thao tác trực tiếp

| Case | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Đăng nhập ADMIN | PASS | Màn Cổng hiện phiên `UI Audit ADMIN`; sau reload vẫn đăng nhập. |
| Năm tab Cổng/Bãi/Giám định/Tra cứu/Việc ca | PASS cho mở màn | Đã click từng tab; chưa có nghĩa mọi giao dịch của mỗi tab đã nghiệm thu. |
| Bãi | PASS cho tải dữ liệu | Sơ đồ hiện 56/56 ô, Legend, Block/Tier và các slot. Không thực hiện xếp/dời vị trí. |
| Việc ca | PASS cho tải danh sách | Hiện 12 tác vụ, 10 quá hạn từ backend test. Không xác nhận tác vụ. |
| Tra cứu và chi tiết | PASS | Tìm `TCSU8849201`, mở chi tiết; vị trí `A-01-01-1` khớp slot trong sơ đồ. |
| Giám định seal | PASS cho presentation | Chọn `Kiểm tra seal`; số radio mức độ hư hỏng đang hiển thị là 0. Không gửi biên bản. |
| Scanner Web | PASS cho fallback | Khung quét có thông báo camera không hỗ trợ Web; nhập thủ công mở form Cổng. Không chứng minh decode từ camera. |
| Thông báo | PASS cho trạng thái empty đã thấy | Chưa đọc 0, empty có hướng thay filter/tải lại; mark-all disabled. Chưa kiểm nhiều trang và mark-read có dữ liệu. |
| Đặt lịch bãi | MỞ ĐƯỢC FORM | Web có field `YYYY-MM-DD HH:mm`, ghi rõ UTC+7. Không tạo booking; picker Android chưa kiểm. |
| Theme và restore | PASS trên Web | Đổi tối, reload, vẫn tối và đăng nhập; đã trả về sáng trước bàn giao. |
| Reflow màn Cổng 320px | PASS cho root overflow | `clientWidth = scrollWidth = 320`; không khẳng định toàn bộ màn/overlay đã đạt responsive. |

Các ảnh chụp ngay khi chuyển tab có thể ghi lại trạng thái loading. Dùng bằng chứng `*-populated-*` cho dữ liệu đã tải xong.

## Artifacts

- [CORS trước sửa](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/cors-before.json).
- [CORS sau sửa và origin bị từ chối](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/cors-after.json).
- [Sơ đồ bãi đã tải](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/yard-populated-375.txt).
- [Việc ca đã tải](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/work-queue-populated-375.txt).
- [Tra cứu thành công](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/lookup-success-375.txt).
- [Chi tiết container](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/container-detail-populated-375.txt).
- [Giám định seal](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/survey-seal-web.txt).
- [Scanner Web](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/scanner-web-fallback.txt).
- [Form booking Web](runs/2026-10-03-improvement-02/raw/mobile-web-2026-10-04/booking-web-form.txt).
- [Phiên khôi phục ở theme tối](runs/2026-10-03-improvement-02/screenshots/mobile-web-2026-10-04/gate-dark-restored-375.png).
- [Màn Cổng bàn giao](runs/2026-10-03-improvement-02/screenshots/mobile-web-2026-10-04/gate-light-ready-375.png).

## Bàn giao runtime

Expo Web và API audit tiếp tục chạy để người dùng test. Viewport override đã reset; theme trả về sáng. Tab app được giữ làm deliverable. Không có giao dịch vận hành mới được gửi trong lượt smoke này. Đăng nhập tạo phiên trên backend test qua luồng auth thật.

Khởi động lại preview khi cần bằng script hiện có, truyền đúng API test:

```powershell
cd 'D:\Project\Đồ Án 4 +Mobile\icd-management'
.\scripts\start-mobile-preview.ps1 -ApiBaseUrl 'http://127.0.0.1:3001/api'
```

Điểm số và các giới hạn toàn dự án vẫn theo [re-audit 01](2026-10-04-reaudit-01-report.md). Chưa kết luận hoàn thành mục tiêu >=95 cho mobile hoặc toàn bộ giao dịch vận hành.
