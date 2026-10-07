# Cấu trúc triển khai

```text
icd-management/
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

- Monorepo đã có API NestJS, Web React/Vite, Mobile React Native/Expo và ML service FastAPI.
- Backend đã triển khai module nghiệp vụ, DTO validation, policy, guard, mapper, Prisma schema và migration.
- API dùng MySQL 8.x/InnoDB, response envelope chuẩn `{ data }` hoặc `{ data, meta }`.
- Danh sách dùng `page`, `pageSize`, `sortBy`, `sortOrder`.
- Các module phải tuân thủ `RULES.md` gần nhất và rule cấp cao hơn.
