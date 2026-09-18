# Quy chuẩn đặt tên và hình thức code

## TypeScript / JavaScript

- variable/function/method/property: `camelCase`.
- class/type/interface/enum: `PascalCase`.
- enum value và global constant: `UPPER_SNAKE_CASE`.
- file/folder: `kebab-case`.
- không prefix interface bằng `I`.
- acronym viết như từ thường: `apiClient`, `httpUrl`, `userId`.

## File suffix chuẩn NestJS

- `.module.ts`
- `.controller.ts`
- `.service.ts`
- `.dto.ts`
- `.policy.ts`
- `.validator.ts`
- `.guard.ts`
- `.mapper.ts`
- `.client.ts`
- `.job.ts`
- `.types.ts`
- `.constants.ts`

## React

- Component: `PascalCase.tsx`.
- Hook: `useXxx.ts`.
- Event handler nội bộ: `handleXxx`.
- Callback prop: `onXxx`.
- Web dùng `pages/`.
- Mobile dùng `screens/`.

## Python / FastAPI

- file/module/function/variable: `snake_case`.
- class: `PascalCase`.
- constant: `UPPER_SNAKE_CASE`.
- endpoint chỉ điều phối HTTP; logic ranking nằm trong service.

## Database

- table/column/index name: `snake_case`.
- MySQL 8.x + InnoDB.
- UUID logic lưu `CHAR(36)`.
- thời gian `DATETIME(3)` lưu UTC.
- JSON dùng `JSON`.
