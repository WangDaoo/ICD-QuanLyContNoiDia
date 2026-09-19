# Quy chuẩn xử lý các loại thao tác

## 1. Query danh sách

`validate query → build filter → count → findMany → map → data + meta`

Mọi danh sách phải dùng chung pagination/filter/sort convention.

## 2. Query chi tiết

`load → not found error nếu thiếu → load relations cần thiết → map → return`

Không update dữ liệu trong query.

## 3. Create CRUD

`validate DTO → check duplicate/business precondition → create → audit nếu cần → map → return`

## 4. Update CRUD

`load → assert editable → validate DTO → update → audit nếu cần → map → return`

## 5. Cancel

`load → assert cancellable → transaction → mark CANCELLED → audit/event → commit → return`

Không dùng delete nếu nghiệp vụ yêu cầu lưu lịch sử.

## 6. State transition

`load → assert current state → validate business conditions → transaction → transition → related writes → audit/event → commit → side effects → return`

Không expose API `updateStatus`.

## 7. Check và Assert

- `checkXxx`: trả kết quả như `{ valid, blockers }`, không throw vì điều kiện nghiệp vụ.
- `assertXxx`: sai thì throw business exception.

## 8. External side effect

Core transaction commit trước.
Sau đó mới gọi:

- EDI
- Email
- Push
- Partner callback
- ML service

Ngoại lệ chỉ khi đặc tả nghiệp vụ quy định external call là một phần atomic bắt buộc.

## 9. Idempotent external command

`authenticate → authorize scope → check idempotency → load → assert state → transaction → update → log → commit → cache response`

Same key + same payload trả response cũ.
Same key + different payload trả `IDEMPOTENCY_KEY_REUSED`.

## 10. Audit

Action quan trọng ghi:

- action
- entity type/id
- actor
- before/after nếu phù hợp
- timestamp
- request/correlation id
