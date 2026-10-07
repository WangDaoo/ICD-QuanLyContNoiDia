# RULES — auth

## Trách nhiệm module

Đăng nhập, refresh token, logout và lấy thông tin user hiện tại.

## Ownership

Authentication session/token; không sở hữu role/permission definition.

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
