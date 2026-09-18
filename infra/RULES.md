# RULES — Infrastructure

- CSDL chính: MySQL 8.x / InnoDB.
- Không commit password/secret.
- Config môi trường đi qua biến môi trường.
- Docker chỉ phục vụ runtime/infrastructure, không chứa business logic.
- Schema database do Prisma migration quản lý khi bắt đầu triển khai.
