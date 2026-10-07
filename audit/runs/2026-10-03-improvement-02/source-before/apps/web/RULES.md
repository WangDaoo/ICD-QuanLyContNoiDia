# RULES — React Web

## Mục tiêu

Web phục vụ nghiệp vụ văn phòng, quản trị và giám sát.

## Convention

- Component: `PascalCase.tsx`.
- Hook: `useXxx.ts`.
- Event handler nội bộ: `handleXxx`.
- Callback prop: `onXxx`.
- Feature folder: `kebab-case`.
- Page đặt trong `pages/`.
- API function đặt trong `api/`.
- Schema/form validation đặt trong `schemas/`.
- Không chứa business rule cuối cùng.
- Nút action phải gọi Backend và xử lý error code chuẩn.
- Không suy luận Gate readiness/Handover transition chỉ từ dữ liệu UI.
