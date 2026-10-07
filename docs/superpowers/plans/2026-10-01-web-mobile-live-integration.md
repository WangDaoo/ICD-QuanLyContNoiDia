# Web và Mobile kết nối backend thật

**Goal:** Đưa UI quản trị mới từ `dựng (2)` vào `apps/web`, tách mobile thành React Native/Expo `.tsx` trong `apps/mobile`, kiểm chứng API và sửa lỗi giao diện bằng ảnh chụp.

**Architecture:** Web và mobile có shell, phiên đăng nhập và navigation riêng. Cùng NestJS/MySQL là nguồn dữ liệu; mọi command đợi API thành công rồi đọc lại dữ liệu. Không chuyển dữ liệu mock, demo persona hay khung thiết bị sang runtime thật. Giữ API/mappers đã có và bổ sung phần còn thiếu.

**Tech Stack:** React/Vite/TypeScript, React Native/Expo, NestJS/Prisma/MySQL.

## 1. Khởi động và xác nhận backend
- [x] Đọc RULES, script chạy local và config hiện tại; không reset dữ liệu hiện có.
- [x] Khởi động MySQL/API; `GET /api/health/ready` phải trả 200.
- [x] Đăng nhập API, kiểm tra Swagger và dùng chính route/DTO hiện tại.

## 2. Tách mobile
- [x] Đọc giao diện `dựng (2)/src/components/MobileTerminalView.tsx`, mobile spec và các feature `.tsx` hiện có.
- [x] Chuyển cấu trúc UI cổng/bãi/tra cứu/việc ca sang native screens trong `apps/mobile`; giữ API thật và quyền đăng nhập.
- [x] Form một cột, vùng nhấn >=44px, nội dung cuộn độc lập, bottom tabs không mất trên màn nhỏ.
- [x] Bổ sung preview Expo web riêng để test; không render mobile trong Web Admin.
- [x] Typecheck, kiểm tra lỗi validation/API và chụp các màn 390x844/360x640.

## 3. Đưa UI web mới vào ứng dụng thật
- [x] So sánh component mới và component hiện tại; chuyển layout vào `apps/web` đồng thời giữ binding API.
- [x] Bỏ simulator/device switch/demo persona. Dùng login/logout thật, role và permission backend.
- [x] Giữ đủ module quản trị hiện có, bổ sung Container detail và điều hướng theo context.
- [x] Typecheck/build; kiểm tra hiển thị desktop và viewport hẹp.

## 4. Hoàn thiện lớp gọi API
- [x] Viết kiểm tra hồi quy cho lỗi đọc response/command còn local được phát hiện.
- [x] Bổ sung services/mappers/commands cho danh sách, manifest, movement/truck visit, billing và các màn quản trị.
- [x] Backend từ chối phải hiện lý do; không báo thành công hoặc thêm record local.
- [x] Sau mỗi command refresh dữ liệu từ backend; refresh trang vẫn giữ kết quả đã lưu.

## 5. Kiểm chứng và sửa UI/UX
- [x] Chạy các luồng có dữ liệu test riêng, xác nhận record API sau thao tác UI và sau reload.
- [x] Chụp login/dashboard/container/cổng/bãi/billing/mobile; tìm overflow, control bị khuất, lỗi console và phản hồi sai.
- [x] Sửa nguyên nhân được tái hiện, test lại và lưu báo cáo tại `test-artifacts/2026-10-01-live-integration`.
- [x] Review code, typecheck/build và test liên quan trước khi bàn giao; ghi rõ phần chưa được chứng minh trên thiết bị thật.
