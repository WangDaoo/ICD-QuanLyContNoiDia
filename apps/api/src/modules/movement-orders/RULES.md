# RULES — movement-orders

## Trách nhiệm module
Quản lý lệnh vận chuyển cho phép container di chuyển về ICD.

## Ownership
Movement Order lifecycle và authorization.

## Quy tắc
- Public method phải dùng động từ rõ nghĩa.
- Không expose `updateStatus`.
- Query không thay đổi dữ liệu.
- Command thay đổi dữ liệu phải validate state/business rule.
- Action quan trọng phải audit.
- Không bypass ownership của module khác bằng Prisma trực tiếp.
- DTO chỉ validate input.
- Controller không chứa transaction.
- Nếu có side effect external, commit core trước trừ khi đặc tả nói khác.
