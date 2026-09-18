# Đặc tả Module 13 — Tích hợp bàn giao đối tác API
# ICD Management System

**Phiên bản:** 1.7 — Detailed Business/API Spec
**Vai trò:** ICD = API Provider; Logistics/Transport Partner = API Client

> Tài liệu tập trung vào nghiệp vụ, state transition, validation, security, idempotency và cách đối soát. Partner API chỉ mở rộng quá trình bàn giao sau/ngoài core ICD; không có quyền sửa core Container Visit.

---

## Quy ước ngôn ngữ và thuật ngữ

Tài liệu sử dụng **tiếng Việt cho tên nghiệp vụ, tên màn hình, nhãn hiển thị và thao tác của người dùng trong nước**. Ở lần xuất hiện đầu tiên, một số thuật ngữ logistics quốc tế được ghi kèm tên tiếng Anh để thuận tiện đối chiếu.

Các thành phần kỹ thuật giữ nguyên tiếng Anh để đồng nhất khi phát triển và tích hợp:

- tên bảng/cột CSDL: `container_visit`, `transport_handover`, `partner_api_client`;
- enum/trạng thái kỹ thuật: `IN_YARD`, `READY_FOR_HANDOVER`, `PARTNER_CONFIRMED`;
- API route: `/api/v1/external/handovers`;
- permission, class/function, request/response field;
- chuẩn quốc tế: EDI, CODECO, MBL, HBL, ISO 6346.

| Tên hiển thị nghiệp vụ | Thuật ngữ kỹ thuật |
|---|---|
| Tiếp nhận vào cổng | Gate-in |
| Xác nhận ra cổng | Gate-out |
| Phiếu ra cổng | Gate Pass |
| Chuyến xe ra/vào | Truck Visit |
| Vị trí bãi | Yard Slot |
| Dịch vụ & Thanh toán | Billing |
| Bàn giao vận chuyển | Transport Handover |
| Xác nhận của đối tác | Partner Confirmation |
| Nhật ký API đối tác | Partner API Log |

---

## 1. Bối cảnh và ranh giới

ICD quản lý độc lập:

```text
Manifest → Tiếp nhận vào cổng → Yard → Billing → Phiếu ra cổng → Xác nhận ra cổng → EXITED
```

Sau đó, khi cần bàn giao container cho một đơn vị vận chuyển/kho ngoài hệ thống, ICD tạo `Transport Handover`.

```text
ICD Core
  ↓
Bàn giao vận chuyển
  ↓ External API
Partner
  ↓
Transport / Warehouse
  ↓ confirmation
ICD Review
```

Partner không quản lý thay ICD.

---

## 2. Tác nhân

| Actor | Trách nhiệm |
|---|---|
| ICD ADMIN | Tạo/rotate/revoke Đối tác tích hợp API, scopes, xem log |
| ICD MANAGER | Giám sát Handover, review confirmation, dispute |
| ICD OPERATOR | Tạo/publish Handover, review theo quyền |
| PARTNER_SYSTEM | Gọi External API bằng API Key |
| PARTNER_OPERATOR/DRIVER | Người dùng thuộc hệ thống Partner; không phải account ICD |

---

## 3. Thực thể và quan hệ

```text
container
   1
   └── N container_visit
             1
             └── N transport_handover
                       ├── 1 partner_api_client
                       ├── 1 customer_warehouse
                       ├── N transport_confirmation
                       └── N partner_api_log
```

Không tạo `partner_container` trùng identity container của ICD.

---

## 4. Vòng đời Bàn giao vận chuyển

```text
DRAFT
  │ ICD publish
  ▼
READY_FOR_HANDOVER
  │ Partner accept
  ▼
PARTNER_ACCEPTED
  │ Partner start/mark transit
  ▼
IN_TRANSIT
  │ Partner warehouse received
  ▼
PARTNER_CONFIRMED
  │ ICD review + accept
  ▼
ICD_CONFIRMED
  │ finalize
  ▼
COMPLETED
```

Ngoại lệ:

```text
READY_FOR_HANDOVER → PARTNER_REJECTED
IN_TRANSIT         → DELIVERY_FAILED
PARTNER_CONFIRMED  → DISPUTED
DRAFT/READY        → CANCELLED (theo policy)
```

### 4.1 Quy tắc chuyển trạng thái

- Chỉ ICD chuyển `DRAFT → READY_FOR_HANDOVER`.
- Chỉ Partner của Handover chuyển `READY → ACCEPTED`, `ACCEPTED → IN_TRANSIT`, `IN_TRANSIT → PARTNER_CONFIRMED`.
- Partner không được tạo `ICD_CONFIRMED`.
- `COMPLETED` chỉ sau ICD review.
- Không update state bằng endpoint generic `PATCH status`; phải dùng command endpoint để enforce rule.

---

## 5. Xác thực — API Key

Header:

```http
X-API-Key: <secret-key>
```

Quy tắc:

1. Mỗi Partner có `partner_api_client`.
2. API Key được ICD ADMIN tạo.
3. Plaintext hiển thị một lần ở Web Admin.
4. DB lưu hash + last4, không lưu plaintext.
5. Không nhận key qua query string.
6. Key `REVOKED` → 401.
7. Mọi request gắn `partner_api_client_id` sau authentication.
8. Có thể hỗ trợ nhiều key/rotation grace period ở roadmap; MVP có thể chỉ giữ một active key/client.

### 5.1 Phạm vi quyền API

Đề xuất:

```text
handover.read
handover.accept
handover.transit
handover.confirm_warehouse
handover.failure
```

Thiếu scope → `403 FORBIDDEN_SCOPE`.

---

## 6. Chống xử lý trùng (Idempotency)

State-changing endpoints bắt buộc:

```http
Idempotency-Key: <partner-generated-key>
```

Uniqueness:

```text
(partner_api_client_id, endpoint, idempotency_key)
```

Rules:

- cùng key + cùng request hash → trả response gốc; không chạy business logic lại;
- cùng key + khác payload → `409 IDEMPOTENCY_KEY_REUSED`;
- request fail trước commit có thể retry cùng key theo policy;
- idempotency record lưu tối thiểu theo retention config;
- key không chứa secret/business PII không cần thiết.

---

## 7. API — Danh sách bàn giao

```http
GET /api/v1/external/handovers
```

Query:

```text
status
container_code
transport_code
ready_from / ready_to
cursor / page
limit
```

Authorization:
- chỉ trả Handover `partner_api_client_id = caller`;
- DRAFT không trả;
- CANCELLED có thể ẩn mặc định.

Response:

```json
{
  "items": [
    {
      "handover_id": "HO-001",
      "transport_code": "VC-2026-001",
      "container_code": "MSCU1234567",
      "container_type": "40HC",
      "status": "READY_FOR_HANDOVER",
      "ready_at": "2026-09-18T09:00:00+07:00",
      "warehouse": {
        "code": "WH-ABC",
        "name": "Kho ABC",
        "address": "..."
      }
    }
  ]
}
```

---

## 8. API — Chi tiết bàn giao

```http
GET /api/v1/external/handovers/:handoverId
```

### Dữ liệu có thể trả

- handover id/transport code/status;
- container number/type;
- seal/gross weight nếu contract cho phép;
- Gate-out time;
- destination warehouse;
- consignee contact subset;
- cargo/items snapshot cần cho giao nhận;
- current Partner confirmation summary.

### Không trả mặc định

- invoice/payment chi tiết;
- internal Hold history;
- user/audit sensitive data;
- data của Partner khác;
- API key/hash.

Nếu Handover không thuộc caller → trả 404 để tránh enumeration.

---

## 9. API — Đối tác tiếp nhận bàn giao

```http
POST /api/v1/external/handovers/:handoverId/accept
X-API-Key: ...
Idempotency-Key: ...
```

Request:

```json
{
  "accepted_at": "2026-09-18T09:05:00+07:00",
  "partner_reference": "P-REF-001",
  "note": "Accepted for delivery"
}
```

Validation:
- caller owns Handover;
- state = READY_FOR_HANDOVER;
- `accepted_at` hợp lệ;
- partner_reference length/format;
- idempotency valid.

Transaction:

```text
READY_FOR_HANDOVER
→ PARTNER_ACCEPTED
→ set partner_accepted_at
→ create event/confirmation snapshot
→ api log
→ commit
```

Response: 200. Replay: 200 same response.

---

## 10. API — Xác nhận đang vận chuyển

```http
POST /api/v1/external/handovers/:handoverId/in-transit
```

Request:

```json
{
  "departed_at": "2026-09-18T09:20:00+07:00",
  "vehicle_plate": "29H-12345",
  "driver_name": "Nguyen Van A",
  "driver_phone": "09xxxxxxxx",
  "partner_trip_code": "TRIP-001"
}
```

Precondition: `PARTNER_ACCEPTED`.

Dữ liệu vehicle/driver là **snapshot của chuyến Partner**, không sửa `truck_visit` của ICD.

Result:

```text
PARTNER_ACCEPTED → IN_TRANSIT
```

---

## 11. API — Xác nhận kho đã nhận

```http
POST /api/v1/external/handovers/:handoverId/warehouse-received
```

Request:

```json
{
  "received_at": "2026-09-18T15:30:00+07:00",
  "receiver_name": "Nguyen Van B",
  "receiver_phone": "09xxxxxxxx",
  "warehouse_code": "WH-ABC",
  "condition": "GOOD",
  "note": "Container received",
  "location": {
    "latitude": 20.123456,
    "longitude": 105.123456,
    "accuracy_m": 12
  },
  "proof": {
    "image_url": "https://...",
    "signature_url": "https://..."
  }
}
```

### Kiểm tra hợp lệ

- Handover = IN_TRANSIT;
- warehouse_code phải khớp kho đích hoặc theo rule cho phép;
- received_at không trước departed_at;
- receiver_name bắt buộc;
- lat/long đúng range nếu có;
- proof URL đúng scheme/domain policy nếu dùng URL;
- payload size giới hạn.

### Xử lý

```text
Validate
→ create transport_confirmation(type=WAREHOUSE_RECEIVED)
→ store payload snapshot/proof refs
→ Handover = PARTNER_CONFIRMED
→ set partner_confirmed_at
→ create HANDOVER_REVIEW task (optional)
→ log/audit
→ commit
```

Quan trọng: **không tự COMPLETED**.

---

## 12. ICD kiểm tra / xác nhận — API nội bộ

Partner không gọi endpoint này.

```http
POST /api/handovers/:id/icd-confirm
Authorization: JWT user ICD
```

Precondition:
- state = PARTNER_CONFIRMED;
- user có `handover.confirm`;
- latest confirmation hợp lệ.

Request:

```json
{
  "note": "Đã đối chiếu POD và transport code"
}
```

Result:

```text
PARTNER_CONFIRMED
→ ICD_CONFIRMED
→ COMPLETED
```

Phải ghi `icd_confirmed_by`, `icd_confirmed_at`.

---

## 13. ICD tạo đối soát / tranh chấp — API nội bộ

```http
POST /api/handovers/:id/dispute
```

Request:

```json
{
  "reason_code": "PROOF_MISMATCH",
  "note": "Ảnh POD không khớp container",
  "attachment_url": null
}
```

Result:

```text
PARTNER_CONFIRMED → DISPUTED
```

Không sửa/xóa confirmation gốc. Dispute là event mới để giữ audit trail.

---

## 14. Đối tác từ chối

Optional API:

```http
POST /api/v1/external/handovers/:id/reject
```

Chỉ hợp lệ khi `READY_FOR_HANDOVER`.

Request bắt buộc reason.

Result: `PARTNER_REJECTED`.

ICD có thể tạo Handover mới cho Partner khác sau khi xử lý; không đổi Container Visit state.

---

## 15. Giao vận thất bại

```http
POST /api/v1/external/handovers/:id/delivery-failed
```

Precondition thường: `IN_TRANSIT`.

Request:

```json
{
  "reason_code": "WAREHOUSE_CLOSED",
  "occurred_at": "2026-09-18T14:50:00+07:00",
  "note": "Kho đóng cửa",
  "location": null
}
```

Result: `DELIVERY_FAILED`.

Sau đó reschedule/replacement là nghiệp vụ ICD riêng.

---

## 16. Mô hình lỗi

```json
{
  "request_id": "req_20260918_0001",
  "error_code": "INVALID_HANDOVER_STATE",
  "message": "Handover must be IN_TRANSIT before warehouse confirmation.",
  "details": null
}
```

| HTTP | Error class |
|---|---|
| 400 | Payload/format invalid |
| 401 | Missing/invalid/revoked API Key |
| 403 | Scope denied |
| 404 | Handover not visible to caller |
| 409 | Invalid state / idempotency conflict |
| 422 | Business validation failed |
| 429 | Rate limited |
| 500 | Unexpected server error |

Business error codes đề xuất:

```text
INVALID_HANDOVER_STATE
IDEMPOTENCY_KEY_REUSED
PARTNER_SCOPE_DENIED
HANDOVER_NOT_FOUND
WAREHOUSE_MISMATCH
INVALID_RECEIVED_TIME
PROOF_REQUIRED
PARTNER_CLIENT_REVOKED
```

---

## 17. Giao dịch & Tính nhất quán

State-changing request:

```text
Authenticate API Key
→ authorize scope
→ check Idempotency-Key
→ load handover FOR UPDATE / optimistic version
→ verify Partner ownership
→ validate current state
→ validate payload
→ write confirmation/event
→ update handover state/timestamps
→ write API log/audit metadata
→ commit
→ cache idempotent response
```

Không được:
- commit state nhưng mất confirmation;
- update core Container Visit state;
- tạo duplicate event khi Partner retry.

---

## 18. Quản trị đối tác tích hợp API

Web route:

```text
/admin/partner-clients
/admin/partner-clients/:id
```

Chức năng:
- Create client.
- Chọn scopes.
- Generate key.
- Plaintext one-time reveal.
- Rotate.
- Revoke.
- Xem last request.
- Link API Logs.

Mọi thao tác ghi Audit Log.

---

## 19. Nhật ký API đối tác

Bảng `partner_api_log` tối thiểu:

```text
id
partner_api_client_id
transport_handover_id nullable
endpoint
method
idempotency_key nullable
request_hash
request_body_redacted
response_body_redacted
http_status
business_status
error_code
request_id
latency_ms
created_at
completed_at
```

Không log plaintext API Key, password/token, signature secret.

---

## 20. Các thực thể CSDL

### 20.1 partner_api_client

```text
id PK
partner_code UNIQUE
partner_name
api_key_hash
key_last4
status ACTIVE/REVOKED
scopes
created_by
created_at
rotated_at
revoked_at
```

### 20.2 customer_warehouse

```text
id PK
consignee_id nullable FK
code
name
address
latitude/longitude nullable
contact_name/contact_phone
active
```

### 20.3 transport_handover

```text
id PK
container_visit_id FK
partner_api_client_id FK
warehouse_id FK
transport_code
status
expected_delivery_at
ready_at
partner_accepted_at
departed_at
partner_confirmed_at
icd_confirmed_at
completed_at
version
created_by
created_at/updated_at
```

### 20.4 transport_confirmation

```text
id PK
transport_handover_id FK
confirmation_type
partner_request_id nullable
confirmed_at
receiver_name/phone
condition
note
latitude/longitude/accuracy_m nullable
proof_image_url/signature_url nullable
payload_snapshot
created_at
```

---

## 21. Bảo mật & Quyền riêng tư

- HTTPS production.
- API key hash-at-rest.
- Rate limit theo client.
- Optional IP allowlist.
- Request/correlation ID.
- Body size limit.
- Redaction log.
- Principle of least privilege scopes.
- Proof URL cần kiểm soát ACL/expiry nếu chứa dữ liệu nhạy cảm.
- Roadmap: HMAC request signature hoặc mTLS.

---

## 22. Nhật ký kiểm toán

Audit user nội bộ:
- Publish Handover.
- ICD Confirm.
- Dispute.
- Create/Rotate/Revoke Partner Client.

Partner machine action được nhận diện bởi `partner_api_client_id` + request ID và lưu Nhật ký API đối tác.

---

## 23. Chiến lược kiểm thử

### Xác thực
- thiếu key;
- key sai;
- key revoked;
- scope thiếu.

### Cách ly dữ liệu
- Partner A không đọc Handover Partner B;
- Partner A không state transition Handover B;
- DRAFT không xuất hiện external list.

### Idempotency
- replay cùng payload;
- conflict khác payload;
- retry sau network uncertainty;
- không duplicate confirmation.

### Máy trạng thái
- accept chỉ từ READY;
- in-transit chỉ từ ACCEPTED;
- warehouse-received chỉ từ IN_TRANSIT;
- Partner không thể ICD_CONFIRM;
- duplicate transition bị chặn/idempotent.

### Kiểm tra hợp lệ
- warehouse mismatch;
- received_at < departed_at;
- invalid GPS;
- proof required theo policy;
- transport code/container consistency.

### Cách ly nghiệp vụ lõi
- Partner request không thay `container_visit.state`;
- Delivery Failed không rollback EXITED;
- Partner API error không ảnh hưởng Billing/Gate Pass history.

---

## 24. Demo đồ án đề xuất

```text
1. ICD Xác nhận ra cổng container → EXITED.
2. Operator tạo Handover và Publish → READY_FOR_HANDOVER.
3. Admin đã cấp API Key cho Partner.
4. Partner GET Handover.
5. Partner POST accept → PARTNER_ACCEPTED.
6. Partner POST in-transit → IN_TRANSIT.
7. Partner POST warehouse-received kèm GPS/POD → PARTNER_CONFIRMED.
8. Web ICD hiện task chờ review.
9. Operator xem proof → ICD Confirm.
10. Handover → COMPLETED; Container Visit vẫn EXITED.
```

Kịch bản này thể hiện rõ core ICD độc lập và tích hợp hai hệ thống có xác thực, idempotency, audit và double confirmation.

