# Web/mobile kết nối backend — kiểm chứng 01/10/2026

## Kết quả và phạm vi

Giao diện quản trị mới chạy trong `apps/web`. App hiện trường chạy riêng trong `apps/mobile` bằng React Native/Expo `.tsx`, với navigation, đăng nhập và phiên riêng. Web không còn import/render `MobileTerminalView`, khung thiết bị hoặc demo persona. Bản thiết kế tham chiếu trong `dựng (2)` được giữ lại.

Các màn cổng, bãi, công việc, tra cứu và thông báo mobile gọi NestJS trực tiếp. Mọi thao tác ghi trên web đợi phản hồi API rồi đọc lại dữ liệu; API từ chối không tạo bản ghi local hay thông báo thành công giả. Quyền lấy từ permission codes của phiên backend, không cấp thêm quyền theo tên ADMIN.

## Môi trường đang chạy

| Thành phần | Địa chỉ | Ghi chú |
|---|---|---|
| MySQL test riêng | `127.0.0.1:3307` | `%LOCALAPPDATA%\icd-management\mysql-local\data` |
| NestJS | `http://127.0.0.1:3000/api` | Readiness 200, database up |
| Web quản trị | `http://127.0.0.1:5173/` | Vite |
| Mobile preview | `http://127.0.0.1:8081/` | Expo web, API URL 127.0.0.1 |

MySQL cũ ở 3306 từ chối thông tin đăng nhập hiện có. Không reset hoặc nhập lại dữ liệu đó. Các thao tác QA dùng database riêng đã chạy migrations/seed và lưu bản ghi MySQL thực. **Kết quả này chưa chứng minh kết nối với dữ liệu cũ ở 3306.**

Docker bị kẹt socket runtime. Automatic approval review đã từ chối thao tác xóa socket vì chính sách chặn thao tác đó; môi trường MySQL riêng là đường chạy thay thế đã kiểm chứng.

Hướng dẫn chạy lại: `scripts/README.md`; backend `scripts/start-local-runtime.ps1`, mobile browser `scripts/start-mobile-preview.ps1`. Script backend không tự reset, migrate hoặc seed lại. Tài khoản bootstrap dùng `.env` local, không ghi mật khẩu/token/API key vào báo cáo.

## Luồng nghiệp vụ đã kiểm chứng

Container QA: `QATU2282957`, visit `0a6afd91-946f-47ab-a4c0-fcf2b69a032f`.

| Bước | Cách thao tác | Kết quả đọc lại backend |
|---|---|---|
| Manifest | Tạo trên web, bổ sung MBL/HBL/container qua API | Manifest `MF-20261001-7B83BFFF`, submit thành công |
| Movement / chuyến xe | API authorize với thời hạn; tạo và xác nhận xe đến | AUTHORIZED, truck ARRIVED |
| Gate-in | Form mobile: chọn lượt xe, seal, trọng lượng | IN_YARD, reception thực được lưu |
| Xếp bãi | Chọn khuyến nghị thật trên mobile | Slot `A-01-01-2`, lưu theo visit ID/context recommendation |
| Tác nghiệp bãi | API di chuyển, kiểm định PASS, booking; start/complete | Vị trí chuyển tới `A-01-02-2`; tác nghiệp hoàn tất |
| Hold | API đặt CUSTOMS hold rồi giải phóng | Readiness false khi đang giữ; không bỏ qua chốt chặn |
| Dịch vụ / hóa đơn | API preview → draft → confirm → invoice → payment | Hóa đơn `INV-20261001-EE40A1D78A`, 990.000 VND, PAID; web hiển thị đúng sau reload |
| Phiếu ra cổng | Phát hành trên web | Phiếu và signed QR từ backend; không tạo QR từ code phiếu |
| Gate-out | Scan token và xác nhận trên mobile preview | EXITED; phiếu USED; vị trí bãi được giải phóng |
| Dùng lại phiếu | Scan lại trên mobile | `canGateOut=false`, nút xác nhận bị khóa |
| EDI | Kiểm tra outbox sau gate-in/out | Hai sự kiện CODECO đã được tạo; chưa chứng minh giao thành công tới hãng tàu |
| Bàn giao | API tạo/publish, external API accept/in-transit/warehouse-received, ICD xác nhận trên web | COMPLETED; lịch sử có bốn mốc xác nhận |
| Idempotency đối tác | Gửi accept hai lần với cùng idempotency key | Chỉ một confirmation PARTNER_ACCEPTED |
| Thông báo | Mobile đánh dấu đã đọc, web đọc lại | readAt lưu trên backend; web còn 0 chưa đọc |
| Việc ca | Quay lại tab sau gate-out | Việc gate-out biến mất, còn 0 công việc |

Gate-in lặp bị trả 409. Khóa partner QA đã được revoke sau `verify-handover`; raw key chỉ tồn tại trong bộ nhớ khi test.

Các file `workflow-resume-prepare.json`, `workflow-operations.json`, `workflow-verify-exit.json`, `workflow-partner.json`, `workflow-verify-handover.json` ghi tổng cộng **47 lần kiểm tra HTTP** của những pha trên. Đây không phải số lượng toàn bộ kịch bản nghiệp vụ của dự án. `workflow-read.json` là lần đọc bổ sung, không cộng vào 47.

## Những lỗi đã sửa từ kiểm tra trực tiếp

- Mobile nằm trong web, giao diện giả lập thiết bị và tài khoản demo: tách thành app Expo riêng và đăng nhập thật.
- Mobile chỉ tìm PENDING nên bỏ sót lượt AUTHORIZED: tra cứu đúng trạng thái đủ điều kiện gate-in.
- Form gate-in thiếu truckVisitId/nhập thông tin xe giả: chọn lượt ARRIVED và gửi DTO chuẩn, kiểm tra seal khác khai báo phải có ghi chú.
- Vị trí bãi hiển thị `[object Object]` hoặc trống dù đã xếp: map DTO vị trí và occupied container visit ID thật.
- Recommendation có envelope lồng, ID sai/context bị bỏ: unwrap dữ liệu và gửi yardSlotId, recommendationId, contextToken thực.
- Màn tra cứu mobile giữ trạng thái cũ khi quay về: đọc lại kết quả khi màn được focus.
- Gate pass scan nhầm physical container ID với visit ID: backend trả rõ visitId; mobile xác nhận đúng lượt.
- QR từ code phiếu không hợp lệ hoặc mất sau reload: dùng signed token và endpoint QR có quyền issuer, chỉ với phiếu ACTIVE chưa hết hạn; no-store.
- Handover chọn nhầm tên partner và không có confirmation timeline: đọc detail thật; bỏ nút giả lập hành vi đối tác trong web ICD.
- Form tính phí tự gán đơn giá/số lượng: preview và draft do backend tính từ tác nghiệp thực. Bỏ các ô tên/đơn vị giá không được backend lưu và lựa chọn thanh toán thẻ không được hỗ trợ.
- Mapper tự gán 5 ngày miễn phí: không còn mặc định frontend. Ngưỡng cảnh báo lấy từ report API; thiếu dữ liệu thì ghi rõ. UI không suy diễn phí thực từ ngưỡng cảnh báo.
- Báo cáo có tăng trưởng 14,2% và biểu đồ 75/15/10 cố định: thay bằng dữ liệu hồ sơ thực; sửa TEU container 45ft và không đưa EXITED vào biểu đồ lưu bãi hiện tại.
- Web trắng sau hot reload Context: tách đối tượng Context sang module ổn định; kiểm tra lại hot refresh/reload không còn lỗi useApp/AppProvider.
- Tab mobile cắt nhãn: bổ sung chiều cao, line-height và vị trí nhãn dưới icon. Tab bãi web bị ép chữ ở 390px: cho các nút xuống hàng, giữ nhãn liền.
- Header/menu, modal, table overflow, QR dài: giới hạn khung, cuộn bảng riêng, modal cuộn trên màn hẹp, token xuống dòng; không tràn ngang trang ở các màn đã thử.

## Kiểm tra tự động

| Lệnh/nhóm | Kết quả |
|---|---|
| API Jest `--runInBand` | 38 suites, 164 tests PASS |
| ESLint các file backend sửa QR/scan/CORS | PASS |
| Web `pnpm --filter @icd/web build` | PASS, TypeScript + Vite |
| Web operation, live-contract, mapper smoke, permission, report metrics | 5 test files PASS |
| Mobile `typecheck` | PASS |
| Mobile `test` | 12 tests PASS |
| Expo `export --platform web` với API URL 127.0.0.1 | PASS; artifact `apps/mobile/dist-qa` ignored |
| Readiness/API + runtime restart script không restart | PASS; API/database đang chạy |

Vite còn cảnh báo bundle JS khoảng 580 KB trước gzip; build không lỗi. Không coi kích thước bundle này là kết quả đo tốc độ trên thiết bị thật. Không dùng browser automation khác ngoài CUA. Console không có lỗi mới trong lượt QA cuối; lỗi Context/HMR cũ vẫn còn trong lịch sử console trước khi sửa.

## Ảnh kiểm chứng

Ảnh mobile 360×640 và 390×844, web desktop và web 390×844. Các ảnh `before` và ảnh chụp trong lúc resize/load được giữ để chẩn đoán; dùng các ảnh cuối bên dưới khi đánh giá kết quả.

- `web-dashboard-final.jpg`: số liệu backend và giao diện quản trị.
- `web-yard-final.jpg`: sơ đồ bãi mới, occupancy thật.
- `web-390-yard-final.jpg`: tab bãi sau sửa ở khung hẹp.
- `web-billing-final.jpg`: hóa đơn và thanh toán đã lưu.
- `web-handover-final.jpg`: trạng thái COMPLETED sau ICD xác nhận.
- `web-reports-final.jpg`: biểu đồ đã bỏ tỷ lệ demo.
- `mobile-390-login-final.jpg`: đăng nhập app riêng, không điền sẵn tài khoản.
- `mobile-360-container-final.jpg`: hồ sơ và vị trí `A-01-01-1` của container seed, khớp web.
- `mobile-gate-in.jpg`, `mobile-yard-assigned.jpg`, `mobile-gate-out.jpg`: kết quả thao tác luồng QA.

## Giới hạn kiểm chứng

Chưa chạy Android/iOS trên thiết bị hoặc emulator thật; camera QR, quyền camera, chụp/upload ảnh, nhấn giữ native và mạng LAN cần lượt kiểm tra thiết bị riêng. Luồng hiện tại được chứng minh qua Expo browser với nhập QR thủ công.

Chưa kiểm thử mọi tổ hợp vai trò, mọi CRUD admin, import Excel, vận chuyển EDI bên ngoài hay đầy đủ báo cáo theo kỳ. Import Excel giả đã bỏ vì backend chưa có route nhập tương ứng; không thể gọi đây là chức năng nhập Excel đã hoàn thành. Bản ghi QA/seed ở MySQL 3307 được giữ lại để xem và test, không xóa dữ liệu cũ 3306.

Ngưỡng cảnh báo lưu bãi lấy từ report API; tính tiền lấy từ billing preview/invoice API. Báo cáo frontend tổng hợp hồ sơ hiện có và không giả định đó là sản lượng/thống kê của một tháng cụ thể.
