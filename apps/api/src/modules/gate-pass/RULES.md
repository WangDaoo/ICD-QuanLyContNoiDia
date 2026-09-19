# RULES — gate-pass

## Trách nhiệm module

Kiểm tra readiness và phát hành/quản lý Phiếu ra cổng.

## Ownership

Gate Pass lifecycle và readiness aggregation.

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
