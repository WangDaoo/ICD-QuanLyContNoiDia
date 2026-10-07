# Health Module Rules

- Health endpoints chỉ kiểm tra liveness/readiness.
- Không chứa business logic hoặc thao tác thay đổi dữ liệu.
- `live` không phụ thuộc database; `ready` phải phản ánh trạng thái kết nối database.
- Response lỗi vẫn đi qua global exception filter.
