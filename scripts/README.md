# Chạy môi trường local

## Khởi động bằng BAT

Nhấp đúp `start-icd.bat` tại thư mục `icd-management`, hoặc `Khoi-dong-ICD.bat` tại thư mục chứa project. Mặc định mở môi trường **Audit/test đang dùng**, rồi mở Web và Expo Web trên trình duyệt:

| Thành phần | Audit mặc định | Local (`-Mode Local`) |
|---|---|---|
| MySQL | 127.0.0.1:3308; `icd_ux_audit_20261003_e2e` | 127.0.0.1:3307; cấu hình `.env` |
| Backend | http://127.0.0.1:3001/api | http://127.0.0.1:3000/api |
| Web | http://127.0.0.1:5174/ | http://127.0.0.1:5173/ |
| Mobile Expo Web | http://127.0.0.1:8081/ | http://127.0.0.1:8081/ |

```bat
start-icd.bat
start-icd.bat -Check
start-icd.bat -NoBrowser
start-icd.bat -Mode Local
```

`-Check` chỉ kiểm tra cấu hình, process/cổng hiện có và readiness; không khởi động dịch vụ hoặc mở trình duyệt. `-NoBrowser` khởi động dịch vụ nhưng không tự mở giao diện. Log các process do launcher tạo nằm trong `logs/launcher/`.

Launcher dùng database đã khởi tạo; không cài dependency, migrate, seed, reset hoặc tự dừng process. Audit yêu cầu file private `audit/runs/2026-10-03-improvement-02/.env.local` và MySQL data tại `%LOCALAPPDATA%\icd-management\mysql-ux-audit-20261003`. Máy chưa có môi trường này sẽ nhận thông báo thiếu cấu hình, không tự tạo dữ liệu demo. Local dùng `start-local-runtime.ps1` bên dưới. Node/pnpm và dependency của ba ứng dụng phải có sẵn.

Mobile dùng chung cổng 8081 giữa hai môi trường. Launcher lưu PID/API URL tại `logs/launcher/mobile-target.json`. Nếu cổng này thuộc một preview khác hoặc không có receipt hợp lệ, launcher dừng với thông báo; đóng terminal Metro cũ trước khi chạy lại/chuyển mode. Không sửa receipt để bỏ qua kiểm tra.

Web/Mobile do launcher tạo cùng trỏ về API của mode đã chọn. API phải ready trước khi bắt đầu frontend. Audit giữ cron và tích hợp email/push/EDI bên ngoài theo provider test đã cấu hình; không phải môi trường production. Expo Web không nghiệm thu camera, TalkBack hoặc date picker native.

Đã đối chiếu `ICD_PROJECT_RULES_MASTER.md`, `ICD_Business_Spec_v1.7_MySQL.md` (core ICD và cách ly Partner Handover), cùng Web/Mobile Spec v1.7. Các URL 9999/3100 trong Web Spec là ví dụ cấu hình của bản tài liệu; BAT này dùng các runtime/guard thực tế của monorepo hiện tại. Không thay đổi nghiệp vụ hoặc triển khai thuật toán tối ưu bãi.

## Khởi động local bằng PowerShell

Chạy từ thư mục `icd-management`, bật backend trước:

```powershell
.\scripts\start-local-runtime.ps1
```

Script dùng MySQL riêng ở `127.0.0.1:3307`, dữ liệu tại `%LOCALAPPDATA%\icd-management\mysql-local\data`, và NestJS ở cổng 3000. Nó kiểm tra process đang chiếm cổng, không tự khởi tạo, reset, migrate hoặc seed database. Runtime này đã được khởi tạo trong lần kiểm chứng 01/10/2026. Máy khác cần cấu hình database và chạy migrations theo hướng dẫn `apps/api/README.md` trước; script không phải bộ cài MySQL.

Sau khi sửa backend, chạy `start-local-runtime.ps1 -RestartApi` để build và khởi động lại API thuộc runtime này. Cấu hình kết nối và tài khoản bootstrap lấy từ `.env` local; không đưa mật khẩu vào lệnh hay Git.

Mở hai terminal riêng:

```powershell
pnpm --filter @icd/web dev --host 127.0.0.1 --port 5173 --strictPort
.\scripts\start-mobile-preview.ps1
```

- Web quản trị: `http://127.0.0.1:5173/`.
- Mobile Expo web preview: `http://127.0.0.1:8081/`.
- API readiness: `http://127.0.0.1:3000/api/health/ready`.
- Swagger: `http://127.0.0.1:3000/api/docs`.

`start-mobile-preview.ps1` chỉ đặt API URL cho process preview, không sửa `.env` của Android. Android emulator dùng `http://10.0.2.2:3000/api`; thiết bị thật phải dùng IP LAN của máy backend và cấu hình truy cập tương ứng. Camera và nhấn giữ gate-out cần kiểm tra trên thiết bị thật. Web preview có nhập QR thủ công và nút xác nhận gate-out.

Kiểm tra build/test:

```powershell
pnpm --filter @icd/api test -- --runInBand
pnpm --filter @icd/web build
pnpm --filter @icd/mobile typecheck
pnpm --filter @icd/mobile test
```

Ảnh và báo cáo kết nối thực tế nằm trong `test-artifacts/2026-10-01-live-integration/REPORT.md`. Dữ liệu QA ở database 3307 là dữ liệu seed/test riêng; không phải dữ liệu cũ trên MySQL 3306.
