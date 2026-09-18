# RULES — Web Features

Mỗi feature dùng cấu trúc:

```text
feature-name/
├── RULES.md
├── pages/
├── components/
├── hooks/
├── api/
├── schemas/
└── types/
```

Không import trực tiếp implementation nội bộ sâu của feature khác nếu có thể đi qua public API/type chung.
