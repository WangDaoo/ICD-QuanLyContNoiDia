# RULES — React Web

## Mục tiêu

Web phục vụ nghiệp vụ văn phòng, quản trị và giám sát.

## Convention

- Component: `PascalCase.tsx`.
- Hook: `useXxx.ts`.
- Event handler nội bộ: `handleXxx`.
- Callback prop: `onXxx`.
- Feature folder: `kebab-case`.
- Màn hình theo tab (`XxxView.tsx`) và hook giao diện đặt trong `src/components/`; nhóm màn lớn có thư mục con riêng (ví dụ `components/yard/`).
- Hàm gọi API đặt trong `src/services/api/`; ánh xạ DTO sang kiểu giao diện đặt trong `src/services/mappers/`.
- Trạng thái dùng chung và nạp dữ liệu theo tab đặt trong `src/context/`; kênh cập nhật realtime đặt trong `src/services/realtime/`.
- Kiểm tra form dùng `useFormValidation`; không tạo thư mục `pages/`, `api/` hay `schemas/` song song với cấu trúc trên.
- Test đơn vị đặt cạnh tệp nguồn với hậu tố `.test.ts`, chạy bằng `pnpm --filter @icd/web test`.
- Không chứa business rule cuối cùng.
- Nút action phải gọi Backend và xử lý error code chuẩn.
- Không suy luận Gate readiness/Handover transition chỉ từ dữ liệu UI.
