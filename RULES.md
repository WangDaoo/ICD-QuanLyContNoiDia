# RULES — Quy chuẩn chung cho toàn bộ ICD Management System

Tài liệu này là **nguồn quy chuẩn cấp cao nhất** của repository. Mọi nhánh con có `RULES.md` riêng để bổ sung quy tắc cục bộ, nhưng không được mâu thuẫn với file này.

## 1. Thứ tự ưu tiên của rules

1. `RULES.md` ở root.
2. `RULES.md` của ứng dụng/service gần file đang sửa nhất.
3. `RULES.md` của module/feature.
4. Ghi chú trách nhiệm ngay trong file code.

Nếu hai rule mâu thuẫn, rule cấp cao hơn được ưu tiên trừ khi tài liệu cấp cao cho phép override.

## 2. Ngôn ngữ

- Code identifier dùng tiếng Anh.
- Tên biến, hàm, class, file, folder, enum, API field dùng tiếng Anh.
- UI, thông báo cho người dùng và mô tả nghiệp vụ dùng tiếng Việt.
- Comment trong code được phép dùng tiếng Việt để nhóm phát triển đọc nhanh.
- Tên kỹ thuật không dịch sang tiếng Việt trong code.

## 3. Naming convention

| Thành phần      | Convention                        | Ví dụ                |
| --------------- | --------------------------------- | -------------------- |
| Biến            | `camelCase`                       | `containerVisit`     |
| Hàm/method      | `camelCase`, bắt đầu bằng động từ | `findContainerById`  |
| Boolean         | `is/has/can/should`               | `hasOperationalHold` |
| Class           | `PascalCase`                      | `GateInService`      |
| Type/Interface  | `PascalCase`                      | `HandoverSummary`    |
| Enum type       | `PascalCase`                      | `HandoverStatus`     |
| Enum value      | `UPPER_SNAKE_CASE`                | `IN_TRANSIT`         |
| Constant        | `UPPER_SNAKE_CASE`                | `DEFAULT_PAGE_SIZE`  |
| File            | `kebab-case`                      | `gate-in.service.ts` |
| Folder          | `kebab-case`                      | `partner-handover`   |
| DB table/column | `snake_case`                      | `container_visit_id` |
| API JSON field  | `camelCase`                       | `containerCode`      |
| API path        | `kebab-case`                      | `/partner-api-logs`  |

## 4. Quy tắc động từ cho hàm

- `find...`: tìm dữ liệu, có thể trả `null`.
- `get...OrThrow`: bắt buộc tồn tại, không có thì throw.
- `findMany...`: lấy danh sách.
- `create...`: tạo mới.
- `update...`: cập nhật dữ liệu thông thường.
- `delete...`: xóa vật lý, chỉ dùng khi thật sự xóa.
- `cancel...`: hủy nghiệp vụ.
- `deactivate...`: vô hiệu hóa.
- `revoke...`: thu hồi credential/quyền.
- `check...`: kiểm tra và trả kết quả, không throw vì business condition.
- `assert...`: kiểm tra điều kiện; sai thì throw business exception.
- Action nghiệp vụ phải dùng động từ cụ thể: `issueGatePass`, `assignYardSlot`, `confirmWarehouseReceived`.

Không dùng các tên mơ hồ như `process`, `handleData`, `doAction`, `manage`, `runLogic` cho public business method.

## 5. Quy tắc kiến trúc

- Chia code theo feature/module nghiệp vụ.
- Controller mỏng.
- Service giữ application/business logic.
- Policy giữ state transition/business condition có thể tái sử dụng.
- DTO chỉ validate hình dạng input.
- Mapper chuyển dữ liệu persistence/domain sang response.
- Guard xử lý authentication/authorization.
- Client chỉ gọi hệ thống ngoài.
- Job chỉ điều phối công việc nền.
- Không để Web/Mobile quyết định business rule cuối cùng.
- Backend là nơi re-check mọi action quan trọng.

## 6. Module ownership

Module nào sở hữu nghiệp vụ thì module đó chịu trách nhiệm thay đổi trạng thái chính.

Ví dụ:

- `containers`: vòng đời Container Visit.
- `yard`: vị trí, movement, inspection, booking.
- `billing`: service order, invoice, payment.
- `gate-pass`: readiness và Gate Pass.
- `partner-handover`: vòng đời bàn giao đối tác.

Module khác không tự ý update state thuộc ownership của module này bằng Prisma trực tiếp.

## 7. Transaction

Một thao tác nghiệp vụ phải theo pattern:

`load → assert state → validate business → transaction → update data → event/audit → commit → side effects ngoài hệ thống`

- Không gọi EDI/Email/Partner/ML bên trong transaction core nếu lỗi của chúng không được phép rollback core.
- Helper chạy trong transaction phải nhận `Prisma.TransactionClient`.
- Không dùng `this.prisma` bên trong helper đang được gọi trong transaction nếu điều đó làm thoát transaction.

## 8. State transition

- Không tạo public method kiểu `updateStatus(status)`.
- Mỗi transition phải có action rõ nghĩa.
- Transition phải qua policy/assertion.
- Backend re-check state ngay trước khi commit.
- UI state chỉ là dữ liệu tham khảo.

## 9. Query và Command

Query:

- `find`, `get`, `search`, `list`, `check`, `calculate`.
- Không thay đổi DB.

Command:

- `create`, `update`, `confirm`, `cancel`, `issue`, `assign`, `complete`, `release`, `revoke`.
- Có thể thay đổi DB.
- Phải audit nếu là action nghiệp vụ quan trọng.

## 10. Error convention

Business error code dùng `UPPER_SNAKE_CASE`.

Ví dụ:

- `CONTAINER_NOT_FOUND`
- `INVALID_CONTAINER_STATE`
- `MOVEMENT_ORDER_NOT_AUTHORIZED`
- `OPERATIONAL_HOLD_ACTIVE`
- `GATE_PASS_EXPIRED`
- `HANDOVER_STATE_CONFLICT`
- `IDEMPOTENCY_KEY_REUSED`

Không throw `Error` chung cho lỗi nghiệp vụ.

## 11. Response convention

Single resource:

```json
{
  "data": {}
}
```

List:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Thông báo tiếng Việt"
  },
  "requestId": "..."
}
```

## 12. Pagination/filter/sort

Danh sách chuẩn:

- `page`
- `pageSize`
- `sortBy`
- `sortOrder`
- filter dùng `camelCase`.

Không module này dùng `limit/offset`, module khác dùng `page/perPage`.

## 13. Date/time

- Timestamp kết thúc bằng `At`: `createdAt`, `gateInAt`.
- Date-only kết thúc bằng `Date`: `invoiceDate`, `dueDate`.
- DB lưu UTC.
- UI chịu trách nhiệm format theo timezone hiển thị.

## 14. ID và Code

- `...Id`: technical identifier.
- `...Code`: mã nghiệp vụ.
- Không dùng `containerId` để chứa `MSCU1234567`; phải dùng `containerCode`.

## 15. Collections

- Một object: singular.
- Array/list: plural.
- Map: `xxxById`, `xxxByCode`.
- Set: `xxxIds`, `activeVisitIds`.

## 16. Comment

Comment phải giải thích **vì sao**, không mô tả lại dòng code hiển nhiên.

## 17. File size và trách nhiệm

- Một file không ôm nhiều nghiệp vụ không liên quan.
- Service quá lớn phải tách theo sub-domain/action.
- Không tạo `common.service.ts`, `helper.service.ts`, `utils.ts` để gom business logic.

## 18. Formatting/lint

Khi bắt đầu code thật:

- TypeScript strict mode.
- ESLint.
- typescript-eslint.
- Prettier.
- Import sorting thống nhất.
- Không merge code nếu lint/type-check fail.

## 19. Nguyên tắc skeleton hiện tại

Các file `.ts`, `.tsx`, `.py`, `.prisma`, `.yml` trong skeleton này **chỉ chứa ghi chú**.
Không coi chúng là code chạy được.
Khi bắt đầu triển khai một module, phải đọc `RULES.md` gần nhất trước.
