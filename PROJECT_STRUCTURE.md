# Cấu trúc triển khai dự kiến

```text
icd-management-skeleton-v0.2/
├── RULES.md
├── docs/
│   └── development/
├── apps/
│   ├── api/
│   │   ├── RULES.md
│   │   ├── prisma/
│   │   └── src/
│   │       ├── common/
│   │       ├── config/
│   │       ├── database/
│   │       └── modules/
│   ├── web/
│   │   ├── RULES.md
│   │   └── src/
│   │       ├── app/
│   │       ├── layouts/
│   │       ├── components/
│   │       ├── features/
│   │       ├── services/
│   │       └── hooks/
│   └── mobile/
│       ├── RULES.md
│       └── src/
│           ├── navigation/
│           ├── features/
│           ├── services/
│           └── storage/
├── services/
│   └── ml-service/
│       └── RULES.md
├── packages/
│   └── RULES.md
├── infra/
│   └── RULES.md
├── scripts/
├── .env.example
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Trạng thái hiện tại

- Đã dựng folder.
- Đã dựng tên file dự kiến.
- Đã ghi trách nhiệm tiếng Việt trong file.
- Đã thêm rules theo từng nhánh.
- Chưa scaffold dependency/package.
- Chưa có code thực thi.
- Chưa có Prisma model/migration.
