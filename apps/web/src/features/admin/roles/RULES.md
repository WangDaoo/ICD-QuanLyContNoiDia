# RULES — Web feature: admin/roles

- Feature chỉ chịu trách nhiệm UI/use-case của `admin/roles`.
- Không duplicate business rule từ Backend.
- Data fetching/mutation qua file `api/*.api.ts`.
- Component trình bày không gọi HTTP trực tiếp nếu đã có hook/api layer.
- Error hiển thị dựa trên error code/message chuẩn từ API.
- Event handler dùng `handleXxx`; callback prop dùng `onXxx`.
