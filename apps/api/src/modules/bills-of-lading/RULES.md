# RULES — bills-of-lading

## Trách nhiệm module

Quản lý Master B/L và House B/L, tránh nhầm với module Billing.

## Ownership

Vận đơn và liên kết document với container/consignee.

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
