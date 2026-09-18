# Quy tắc phát triển

- Không bỏ qua module ownership.
- Không query/update DB trực tiếp từ controller.
- Không để frontend tự tính readiness cuối cùng.
- Không share API key xuống Web/Mobile.
- Không gọi external service trong transaction core nếu external failure không được phép rollback core.
- Không duplicate business rule giữa Web, Mobile và Backend.
- Không viết magic string cho state/error code.
- Không tạo circular dependency giữa module nếu có thể tách orchestration.
- Không dùng một service làm "god service".
- Không merge nếu lint/type-check/test của phần đã triển khai bị lỗi.
