# RULES — Backend NestJS

## Vai trò
Backend là source of truth cho business rules.

## Luồng chuẩn
`Controller → Service → Policy/Validator → Prisma/External Client`

## Controller
- Chỉ nhận request, param, auth context.
- Gọi service.
- Không query Prisma trực tiếp.
- Không chứa business transaction.

## Service
- Giữ orchestration/business logic.
- Public method dùng động từ rõ nghĩa.
- Action thay đổi state phải re-check state.
- Transaction nằm ở service/application layer.

## DTO
- Validate input shape.
- Không chứa business rule.

## Policy
- State transition và điều kiện nghiệp vụ tái sử dụng.
- Có thể expose `check...` và `assert...`.

## Prisma
- MySQL 8.x + InnoDB.
- Không để module khác bypass ownership để update state.

## External integration
- EDI/Partner/ML client tách riêng.
- External failure không rollback core nếu đặc tả không yêu cầu.
