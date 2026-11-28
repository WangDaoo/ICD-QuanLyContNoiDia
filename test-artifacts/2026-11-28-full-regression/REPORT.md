# Kiểm thử hồi quy toàn bộ sau đợt dọn mã, 28/11/2026

Thư mục này lưu bằng chứng của lần kiểm thử lại toàn bộ backend, Web và Mobile sau khi gỡ mã rác, thư mục rác
và sắp lại bố cục kho mã. Nhánh `claude/realtime-sync`, chạy trên cây làm việc tính từ commit `01452d7`.

## Môi trường

| Thành phần | Cấu hình |
|---|---|
| Cơ sở dữ liệu | MySQL 8 riêng cho đợt này, cổng 3311, CSDL `icd_regression_20261128_e2e` (không dùng chung với CSDL phát triển) |
| API | NestJS, `http://localhost:3000/api` |
| Web | Vite dev server, `http://localhost:5173` |
| Mobile | Expo Web (react-native-web), `http://localhost:8081`; chưa chạy trên máy thật hay trình giả lập |
| Trình duyệt tự động | Playwright Chromium, kịch bản `capture-web.mjs` và `capture-mobile.mjs` |
| Tài khoản thử | Lấy từ biến môi trường của tệp cấu hình riêng ngoài kho; không ghi mật khẩu vào kho |

## Tổng hợp kết quả

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Kiểm tra kiểu API | `pnpm --filter @icd/api run typecheck` | Đạt |
| Kiểm thử đơn vị API | `pnpm --filter @icd/api test` | 59/59 bộ, 342/342 ca đạt |
| Build API | `pnpm --filter @icd/api run build` | Đạt |
| Kiểm tra kiểu Web | `pnpm --filter @icd/web run typecheck` | Đạt |
| Kiểm thử đơn vị Web | `pnpm --filter @icd/web run test` | 125/125 ca đạt |
| Build Web | `pnpm --filter @icd/web run build` | Đạt |
| Kiểm tra kiểu Mobile | `pnpm --filter @icd/mobile run typecheck` | Đạt |
| Kiểm thử đơn vị Mobile | `pnpm --filter @icd/mobile run test` | 193/193 ca đạt |
| ESLint các tệp đã sửa | `pnpm exec eslint ... --max-warnings 0` | Đạt |
| Kiểm thử đầu cuối API | `jest --config ./test/jest-e2e.json --runInBand` | 10 tệp: 9 đạt, 1 bỏ qua; 49 ca: 48 đạt, 1 bỏ qua, 0 lỗi (107 s) |
| Giao diện Web | `node capture-web.mjs` | 31/31 ca đạt, có ảnh chụp |
| Giao diện Mobile | `node capture-mobile.mjs` | 37/37 ca đạt, có ảnh chụp |

Log đã lọc ANSI và bỏ đường dẫn tuyệt đối nằm trong `logs/`.

### Ghi chú về kiểm thử đầu cuối

- Tệp bị bỏ qua là `ui-audit-server.e2e-spec.ts`. Đây là trình khởi chạy API cho công cụ rà soát giao diện, không
  phải bài kiểm thử: nó chỉ chạy khi đặt `ICD_AUDIT_RUN` và tự từ chối mọi cấu hình lệch với môi trường rà soát.
- Script `test:e2e` trong `apps/api/package.json` gán cứng CSDL `icd_management_e2e`. Lần chạy đầu của đợt này đi
  qua script đó nên cả bộ hỏng ở bước đăng nhập (401). Log lần ấy không dùng làm bằng chứng. Các lần chạy được
  ghi nhận gọi thẳng `jest` với biến môi trường trỏ tới CSDL hồi quy riêng.
- Mười tệp e2e được sửa để đọc phản hồi qua `test/helpers/api-envelope.ts` (dạng `{data}` và `{data, meta}`)
  và đọc tài khoản quản trị từ biến môi trường.

### Đồng bộ thời gian thực

| Ca | Chi tiết đo được |
|---|---|
| WEB-RT-02 | Tài khoản thứ hai tạo manifest qua API (HTTP 201); màn hình quản trị đang mở hiện manifest mới sau 2563 ms, số lần tải lại trang: 0 |
| MB-RT-01 | Ứng dụng Mobile mở luồng SSE; sau thay đổi từ tài khoản khác, lệnh gọi lại đầu tiên tới `/containers/work-queue` sau 812 ms; không có lệnh gọi nào trong khoảng lặng; tải lại trang: 0 |

## Ca kiểm thử giao diện Web

| Mã | Nội dung kiểm tra | Kết quả | Ảnh |
|---|---|---|---|
| WEB-AUTH-01 | Trang đăng nhập hiển thị | PASS | [00-login.png](screenshots/web/00-login.png) |
| WEB-AUTH-02 | Sai mật khẩu bị từ chối, vẫn ở trang đăng nhập | PASS | [01-login-invalid.png](screenshots/web/01-login-invalid.png) |
| WEB-AUTH-03 | Đăng nhập quản trị viên vào bảng điều khiển | PASS | [02-login-success-dashboard.png](screenshots/web/02-login-success-dashboard.png) |
| WEB-RT-01 | Header báo kênh realtime đang kết nối trực tiếp | PASS | [03-realtime-indicator.png](screenshots/web/03-realtime-indicator.png) |
| WEB-TAB-dashboard | Mở phân hệ Tổng quan vận hành | PASS | [10-dashboard.png](screenshots/web/10-dashboard.png) |
| WEB-TAB-work-queue | Mở phân hệ Danh sách công việc | PASS | [11-work-queue.png](screenshots/web/11-work-queue.png) |
| WEB-TAB-manifests | Mở phân hệ Manifest | PASS | [12-manifests.png](screenshots/web/12-manifests.png) |
| WEB-TAB-containers | Mở phân hệ Container | PASS | [13-containers.png](screenshots/web/13-containers.png) |
| WEB-TAB-movement-orders | Mở phân hệ Lệnh di chuyển | PASS | [14-movement-orders.png](screenshots/web/14-movement-orders.png) |
| WEB-TAB-truck-visits | Mở phân hệ Chuyến xe ra/vào | PASS | [15-truck-visits.png](screenshots/web/15-truck-visits.png) |
| WEB-TAB-gate-in | Mở phân hệ Nhập cổng | PASS | [16-gate-in.png](screenshots/web/16-gate-in.png) |
| WEB-TAB-yard | Mở phân hệ Bãi container | PASS | [17-yard.png](screenshots/web/17-yard.png) |
| WEB-TAB-billing | Mở phân hệ Dịch vụ & Thanh toán | PASS | [18-billing.png](screenshots/web/18-billing.png) |
| WEB-TAB-gate-pass | Mở phân hệ Xuất cổng | PASS | [19-gate-pass.png](screenshots/web/19-gate-pass.png) |
| WEB-TAB-edi | Mở phân hệ EDI / CODECO | PASS | [20-edi.png](screenshots/web/20-edi.png) |
| WEB-TAB-handovers | Mở phân hệ Bàn giao vận chuyển | PASS | [21-handovers.png](screenshots/web/21-handovers.png) |
| WEB-TAB-partner-clients | Mở phân hệ Đối tác tích hợp API | PASS | [22-partner-clients.png](screenshots/web/22-partner-clients.png) |
| WEB-TAB-partner-api-logs | Mở phân hệ Nhật ký API đối tác | PASS | [23-partner-api-logs.png](screenshots/web/23-partner-api-logs.png) |
| WEB-TAB-master-data | Mở phân hệ Danh mục dùng chung | PASS | [24-master-data.png](screenshots/web/24-master-data.png) |
| WEB-TAB-users-roles | Mở phân hệ Người dùng & Phân quyền | PASS | [25-users-roles.png](screenshots/web/25-users-roles.png) |
| WEB-TAB-admin | Mở phân hệ Báo cáo | PASS | [26-admin.png](screenshots/web/26-admin.png) |
| WEB-TAB-activity | Mở phân hệ Nhật ký kiểm toán | PASS | [27-activity.png](screenshots/web/27-activity.png) |
| WEB-AUDIT-01 | Tìm nhật ký kiểm toán theo request ID trên Web | PASS | [28-audit-search-request-id.png](screenshots/web/28-audit-search-request-id.png) |
| WEB-RBAC-manager | Vai trò manager: menu theo quyền | PASS | [40-role-manager.png](screenshots/web/40-role-manager.png) |
| WEB-RBAC-operator | Vai trò operator: menu theo quyền | PASS | [40-role-operator.png](screenshots/web/40-role-operator.png) |
| WEB-RBAC-docs | Vai trò docs: menu theo quyền | PASS | [40-role-docs.png](screenshots/web/40-role-docs.png) |
| WEB-RBAC-gate | Vai trò gate: menu theo quyền | PASS | [40-role-gate.png](screenshots/web/40-role-gate.png) |
| WEB-RBAC-yard | Vai trò yard: menu theo quyền | PASS | [40-role-yard.png](screenshots/web/40-role-yard.png) |
| WEB-RBAC-agent | Vai trò agent: menu theo quyền | PASS | [40-role-agent.png](screenshots/web/40-role-agent.png) |
| WEB-RBAC-consignee | Vai trò consignee: menu theo quyền | PASS | [40-role-consignee.png](screenshots/web/40-role-consignee.png) |
| WEB-RT-02 | Manifest do tài khoản khác tạo tự hiện trên màn hình quản trị (không tải lại trang) | PASS | [50-realtime-before.png](screenshots/web/50-realtime-before.png), [51-realtime-after.png](screenshots/web/51-realtime-after.png) |

## Ca kiểm thử giao diện Mobile

| Mã | Nội dung kiểm tra | Kết quả | Ảnh |
|---|---|---|---|
| MB-AUTH-01 | Màn hình đăng nhập Mobile hiển thị | PASS | [00-login.jpg](screenshots/mobile/00-login.jpg) |
| MB-AUTH-02 | Sai mật khẩu bị từ chối, vẫn ở màn đăng nhập | PASS | [01-login-invalid.jpg](screenshots/mobile/01-login-invalid.jpg) |
| MB-ROLE-gate | Vai trò gate: tab hiện trường theo quyền | PASS | [10-gate-home.jpg](screenshots/mobile/10-gate-home.jpg) |
| MB-TAB-gate-Cổng | gate: mở tab Cổng | PASS | [11-gate-tab-cong.jpg](screenshots/mobile/11-gate-tab-cong.jpg) |
| MB-TAB-gate-Tra cứu | gate: mở tab Tra cứu | PASS | [12-gate-tab-tra-cuu.jpg](screenshots/mobile/12-gate-tab-tra-cuu.jpg) |
| MB-TAB-gate-Việc ca | gate: mở tab Việc ca | PASS | [13-gate-tab-viec-ca.jpg](screenshots/mobile/13-gate-tab-viec-ca.jpg) |
| MB-NOTI-gate | gate: mở hộp thông báo | PASS | [14-gate-notifications.jpg](screenshots/mobile/14-gate-notifications.jpg) |
| MB-ACC-gate | gate: màn tài khoản hiển thị đúng người dùng | PASS | [15-gate-account.jpg](screenshots/mobile/15-gate-account.jpg) |
| MB-ROLE-yard | Vai trò yard: tab hiện trường theo quyền | PASS | [16-yard-home.jpg](screenshots/mobile/16-yard-home.jpg) |
| MB-TAB-yard-Bãi | yard: mở tab Bãi | PASS | [17-yard-tab-bai.jpg](screenshots/mobile/17-yard-tab-bai.jpg) |
| MB-TAB-yard-Giám định | yard: mở tab Giám định | PASS | [18-yard-tab-giam-dinh.jpg](screenshots/mobile/18-yard-tab-giam-dinh.jpg) |
| MB-TAB-yard-Tra cứu | yard: mở tab Tra cứu | PASS | [19-yard-tab-tra-cuu.jpg](screenshots/mobile/19-yard-tab-tra-cuu.jpg) |
| MB-TAB-yard-Việc ca | yard: mở tab Việc ca | PASS | [20-yard-tab-viec-ca.jpg](screenshots/mobile/20-yard-tab-viec-ca.jpg) |
| MB-NOTI-yard | yard: mở hộp thông báo | PASS | [21-yard-notifications.jpg](screenshots/mobile/21-yard-notifications.jpg) |
| MB-ACC-yard | yard: màn tài khoản hiển thị đúng người dùng | PASS | [22-yard-account.jpg](screenshots/mobile/22-yard-account.jpg) |
| MB-ROLE-operator | Vai trò operator: tab hiện trường theo quyền | PASS | [23-operator-home.jpg](screenshots/mobile/23-operator-home.jpg) |
| MB-TAB-operator-Tra cứu | operator: mở tab Tra cứu | PASS | [24-operator-tab-tra-cuu.jpg](screenshots/mobile/24-operator-tab-tra-cuu.jpg) |
| MB-TAB-operator-Việc ca | operator: mở tab Việc ca | PASS | [25-operator-tab-viec-ca.jpg](screenshots/mobile/25-operator-tab-viec-ca.jpg) |
| MB-TAB-operator-Điều phối | operator: mở tab Điều phối | PASS | [26-operator-tab-dieu-phoi.jpg](screenshots/mobile/26-operator-tab-dieu-phoi.jpg) |
| MB-NOTI-operator | operator: mở hộp thông báo | PASS | [27-operator-notifications.jpg](screenshots/mobile/27-operator-notifications.jpg) |
| MB-ACC-operator | operator: màn tài khoản hiển thị đúng người dùng | PASS | [28-operator-account.jpg](screenshots/mobile/28-operator-account.jpg) |
| MB-ROLE-admin | Vai trò admin: tab hiện trường theo quyền | PASS | [29-admin-home.jpg](screenshots/mobile/29-admin-home.jpg) |
| MB-TAB-admin-Cổng | admin: mở tab Cổng | PASS | [30-admin-tab-cong.jpg](screenshots/mobile/30-admin-tab-cong.jpg) |
| MB-TAB-admin-Bãi | admin: mở tab Bãi | PASS | [31-admin-tab-bai.jpg](screenshots/mobile/31-admin-tab-bai.jpg) |
| MB-TAB-admin-Giám định | admin: mở tab Giám định | PASS | [32-admin-tab-giam-dinh.jpg](screenshots/mobile/32-admin-tab-giam-dinh.jpg) |
| MB-TAB-admin-Tra cứu | admin: mở tab Tra cứu | PASS | [33-admin-tab-tra-cuu.jpg](screenshots/mobile/33-admin-tab-tra-cuu.jpg) |
| MB-TAB-admin-Việc ca | admin: mở tab Việc ca | PASS | [34-admin-tab-viec-ca.jpg](screenshots/mobile/34-admin-tab-viec-ca.jpg) |
| MB-NOTI-admin | admin: mở hộp thông báo | PASS | [35-admin-notifications.jpg](screenshots/mobile/35-admin-notifications.jpg) |
| MB-ACC-admin | admin: màn tài khoản hiển thị đúng người dùng | PASS | [36-admin-account.jpg](screenshots/mobile/36-admin-account.jpg) |
| MB-ROLE-docs | Vai trò docs: tab hiện trường theo quyền | PASS | [37-docs-home.jpg](screenshots/mobile/37-docs-home.jpg) |
| MB-TAB-docs-Tra cứu | docs: mở tab Tra cứu | PASS | [38-docs-tab-tra-cuu.jpg](screenshots/mobile/38-docs-tab-tra-cuu.jpg) |
| MB-TAB-docs-Việc ca | docs: mở tab Việc ca | PASS | [39-docs-tab-viec-ca.jpg](screenshots/mobile/39-docs-tab-viec-ca.jpg) |
| MB-TAB-docs-Điều phối | docs: mở tab Điều phối | PASS | [40-docs-tab-dieu-phoi.jpg](screenshots/mobile/40-docs-tab-dieu-phoi.jpg) |
| MB-NOTI-docs | docs: mở hộp thông báo | PASS | [41-docs-notifications.jpg](screenshots/mobile/41-docs-notifications.jpg) |
| MB-ACC-docs | docs: màn tài khoản hiển thị đúng người dùng | PASS | [42-docs-account.jpg](screenshots/mobile/42-docs-account.jpg) |
| MB-LOOKUP-01 | Tra cứu container theo một phần số hiệu | PASS | [43-lookup-results.jpg](screenshots/mobile/43-lookup-results.jpg) |
| MB-RT-01 | Mobile mở luồng realtime và tự làm mới "Việc ca" khi có thay đổi từ tài khoản khác | PASS | [44-realtime-before.jpg](screenshots/mobile/44-realtime-before.jpg), [45-realtime-after.jpg](screenshots/mobile/45-realtime-after.jpg) |

## Phạm vi dọn mã trong cùng đợt

- Gỡ các tệp khung không dùng: module `bills-of-lading` (chưa đăng ký), các tệp ở `common/` và `config/` không có
  nơi import, các tệp khung trong module billing, containers, edi... (nội dung chỉ là chú thích sinh sẵn).
- Gỡ hai gói không còn được import: `packages/contracts`, `packages/shared`.
- Gỡ phụ thuộc không dùng: `clsx`, `motion` (Web), `expo-image-picker` (Mobile); gỡ `apps/web/src/data/mockData.ts`.
- Thêm script `test` cho Web (`node --import tsx --test`) và `pnpm test` ở gốc kho.
- Gỡ ảnh và bản chụp trung gian của các đợt rà soát cũ không được báo cáo trích dẫn; giữ nguyên
  `audit/runs/2026-10-03-improvement-02` (phát hiện, bản sửa, độ phủ), `audit/runs/2026-10-11-native-01` và `audit/tools`.
- Gỡ tài liệu và kế hoạch cũ đã lỗi thời (bản nháp báo cáo, mô tả cấu trúc cũ, kế hoạch tháng 9–10, ảnh chụp
  Mobile ngày 01/10, mẫu báo cáo tuần 6). Toàn bộ đã được sao lưu ra thư mục lưu trữ ngoài kho mã và vẫn còn
  trong lịch sử Git.
