# RULES — containers

## Trách nhiệm module

Quản lý physical container, Container Visit, timeline và lifecycle chính.

## Ownership

Container/Container Visit state; module khác không update trực tiếp state nếu không qua service/policy được thiết kế.

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
