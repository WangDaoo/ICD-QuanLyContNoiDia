# RULES — Business Modules

Mỗi folder là một bounded feature/module.

Mẫu chuẩn:

```text
module-name/
├── RULES.md
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── dto/
├── policies/
├── validators/
├── mappers/
├── types/
└── constants/
```

Module phức tạp được tách sub-domain nhưng vẫn tuân Controller → Service → Policy/Validator.

Không dùng public `updateStatus`.
Action nghiệp vụ phải có tên cụ thể.
