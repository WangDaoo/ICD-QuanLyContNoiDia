# Chạy môi trường local

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
