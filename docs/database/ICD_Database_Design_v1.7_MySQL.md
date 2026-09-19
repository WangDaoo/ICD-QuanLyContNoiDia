# Đặc tả Cơ sở dữ liệu — ICD Management System

**Phiên bản:** 1.7 — Business-focused / Partner Handover  
**Mục tiêu:** Thiết kế CSDL phục vụ đồ án tốt nghiệp, ưu tiên quan hệ nghiệp vụ, vòng đời dữ liệu và quy tắc toàn vẹn.  
**DBMS định hướng:** MySQL 8.x (InnoDB) + Prisma ORM.

---

## Quy ước ngôn ngữ và thuật ngữ

Tài liệu sử dụng **tiếng Việt cho tên nghiệp vụ, tên màn hình, nhãn hiển thị và thao tác của người dùng trong nước**. Ở lần xuất hiện đầu tiên, một số thuật ngữ logistics quốc tế được ghi kèm tên tiếng Anh để thuận tiện đối chiếu.

Các thành phần kỹ thuật giữ nguyên tiếng Anh để đồng nhất khi phát triển và tích hợp:

- tên bảng/cột CSDL: `container_visit`, `transport_handover`, `partner_api_client`;
- enum/trạng thái kỹ thuật: `IN_YARD`, `READY_FOR_HANDOVER`, `PARTNER_CONFIRMED`;
- API route: `/api/v1/external/handovers`;
- permission, class/function, request/response field;
- chuẩn quốc tế: EDI, CODECO, MBL, HBL, ISO 6346.

| Tên hiển thị nghiệp vụ | Thuật ngữ kỹ thuật   |
| ---------------------- | -------------------- |
| Tiếp nhận vào cổng     | Gate-in              |
| Xác nhận ra cổng       | Gate-out             |
| Phiếu ra cổng          | Gate Pass            |
| Chuyến xe ra/vào       | Truck Visit          |
| Vị trí bãi             | Yard Slot            |
| Dịch vụ & Thanh toán   | Billing              |
| Bàn giao vận chuyển    | Transport Handover   |
| Xác nhận của đối tác   | Partner Confirmation |
| Nhật ký API đối tác    | Partner API Log      |

---

## Quy ước triển khai MySQL

Bản thiết kế này sử dụng **MySQL 8.x với storage engine InnoDB**. Các quy ước triển khai chính:

- Primary key logic tiếp tục dùng UUID v4, nhưng lưu vật lý dưới dạng `CHAR(36)`.
- Các foreign key trỏ tới UUID cũng dùng `CHAR(36)`.
- Dữ liệu cấu trúc linh hoạt dùng kiểu `JSON`; MySQL không có kiểu `JSONB` như PostgreSQL.
- Thời gian nghiệp vụ dùng `DATETIME(3)` và lưu theo **UTC**; Backend chịu trách nhiệm chuyển múi giờ khi hiển thị.
- Charset mặc định: `utf8mb4`.
- Collation khuyến nghị: `utf8mb4_unicode_ci` hoặc collation `utf8mb4` tương thích phiên bản MySQL đang triển khai.
- Business transaction dùng InnoDB transaction.
- MySQL không hỗ trợ partial unique index theo cú pháp PostgreSQL. Các ràng buộc "chỉ một bản ghi active" được kiểm tra bằng Backend transaction + row locking (`SELECT ... FOR UPDATE`) và index hỗ trợ truy vấn; với trường hợp cần thiết có thể dùng generated column + UNIQUE index.
- Prisma là lớp ORM/migration; business rule quan trọng vẫn nằm ở NestJS service và được re-check trong transaction.

Ví dụ Prisma datasource:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

Ví dụ connection string:

```env
DATABASE_URL="mysql://user:password@localhost:3306/icd_management"
```

---

## 1. Nguyên tắc thiết kế

1. `container` đại diện **container vật lý** và được nhận diện bởi `container_number`.
2. `container_visit` đại diện **một lần container đi qua ICD**. Một container vật lý có thể có nhiều visit theo thời gian nhưng chỉ có tối đa một visit đang active.
3. Manifest/MBL/HBL mô tả hồ sơ vận chuyển; nghiệp vụ Gate/Yard/Billing/Gate Pass bám theo `container_visit`.
4. Không ghi đè lịch sử quan trọng: vị trí Yard, Hold, Payment, Audit, Integration Sync đều có bảng log/lifecycle riêng.
5. Business rule quan trọng được kiểm tra ở Backend; CSDL MySQL/InnoDB dùng PK/FK/UNIQUE/CHECK/index và transaction để hỗ trợ chống dữ liệu sai.
6. Module 13 lưu **Bàn giao vận chuyển và Partner confirmation** liên kết trực tiếp `container_visit`. Không tạo `partner_container` trùng với physical container của ICD; Partner API chỉ thay đổi nhóm bảng Handover.
7. API key của đối tác không lưu plaintext. CSDL chỉ lưu `secret_ref` hoặc ciphertext được mã hóa tại rest.

---

## 2. ERD mức nghiệp vụ

```mermaid
erDiagram
    ICD_SITE ||--o{ USER : has
    USER }o--o{ ROLE : assigned
    ROLE }o--o{ PERMISSION : grants

    MANIFEST ||--o{ MASTER_BL : contains
    MASTER_BL ||--o{ HOUSE_BL : contains
    HOUSE_BL ||--o{ CONTAINER_VISIT : documents
    CONTAINER ||--o{ CONTAINER_VISIT : has

    CONTAINER_VISIT ||--o{ MOVEMENT_ORDER : authorizes
    TRUCK_VISIT ||--o{ TRUCK_VISIT_CONTAINER : carries
    CONTAINER_VISIT ||--o{ TRUCK_VISIT_CONTAINER : joins
    CONTAINER_VISIT ||--o| CONTAINER_RECEPTION : gate_in

    CONTAINER_VISIT ||--o{ CONTAINER_LOCATION_LOG : location_history
    YARD_SLOT ||--o{ CONTAINER_LOCATION_LOG : occupied_at
    CONTAINER_VISIT ||--o{ YARD_MOVEMENT : movements
    CONTAINER_VISIT ||--o{ CONTAINER_INSPECTION : inspections
    CONTAINER_VISIT ||--o{ IN_YARD_BOOKING : bookings
    CONTAINER_VISIT ||--o{ OPERATIONAL_HOLD : holds

    CONTAINER_VISIT ||--o{ SERVICE_ORDER : billing
    SERVICE_ORDER ||--o{ SERVICE_ORDER_ITEM : contains
    SERVICE_ORDER ||--o| INVOICE : invoices
    INVOICE ||--o{ PAYMENT_ALLOCATION : allocated
    PAYMENT ||--o{ PAYMENT_ALLOCATION : distributes

    CONTAINER_VISIT ||--o{ GATE_PASS : gate_passes
    CONTAINER_VISIT ||--o{ CONTAINER_EVENT : timeline

    SHIPPING_LINE ||--o{ EDI_ROUTE : route
    EDI_ROUTE ||--o{ EDI_OUTBOX_MESSAGE : dispatches
    CONTAINER_VISIT ||--o{ EDI_OUTBOX_MESSAGE : emits
    EDI_OUTBOX_MESSAGE ||--o{ EDI_ACKNOWLEDGEMENT : receives

    PARTNER_API_CLIENT ||--o{ TRANSPORT_HANDOVER : assigned_to
    CUSTOMER_WAREHOUSE ||--o{ TRANSPORT_HANDOVER : destination
    CONTAINER_VISIT ||--o{ TRANSPORT_HANDOVER : handed_over
    TRANSPORT_HANDOVER ||--o{ TRANSPORT_CONFIRMATION : confirmations
    PARTNER_API_CLIENT ||--o{ PARTNER_API_LOG : calls
    TRANSPORT_HANDOVER ||--o{ PARTNER_API_LOG : traced_by

    USER ||--o{ AUDIT_LOG : acts
```

---

## 3. Nhóm Identity, RBAC và cấu hình

### 3.1 `icd_site`

| Field                      | Ý nghĩa              |
| -------------------------- | -------------------- |
| `id` PK                    | ICD/site             |
| `code` UNIQUE              | Mã ICD               |
| `name`                     | Tên ICD              |
| `active`                   | Trạng thái hoạt động |
| `created_at`, `updated_at` | Audit time           |

### 3.2 `user`

| Field                      | Ý nghĩa                     |
| -------------------------- | --------------------------- |
| `id` PK                    | User                        |
| `icd_id` FK                | ICD đang thuộc              |
| `name`, `email`            | Thông tin tài khoản         |
| `password_hash`            | Mật khẩu đã hash            |
| `active`                   | Có được đăng nhập hay không |
| `created_at`, `updated_at` | Audit time                  |

### 3.3 `role`, `permission`, `user_role`, `role_permission`

RBAC được chuẩn hóa M:N để một user có thể có nhiều role và mỗi role có nhiều permission.

Ví dụ permission nghiệp vụ:

```text
manifest.read / manifest.create / manifest.submit
container.read
gate_in.create
yard.read / yard.update / yard.move / yard.inspect
billing.manage
gate_pass.create / gate_pass.use
reports.read
handover.create / handover.read / handover.confirm / handover.dispute
partner_client.manage
partner_api_log.read
```

### 3.4 `icd_setting`

```text
id, icd_id, key, value, value_type, description, updated_by, updated_at
```

Dùng cho các cấu hình runtime như Gate Pass TTL, SLA, free-day defaults, feature flags.

---

## 4. Dữ liệu danh mục

### `shipping_line`

`id, code, name, active, created_at, updated_at`

### `consignee`

`id, code, name, tax_code, phone, email, address, active`

### `clearing_agent`

`id, code, name, license_number, active`

### `transporter`

`id, code, name, tax_code, phone, active`

> Các danh mục này ưu tiên soft-deactivate thay vì hard delete để không phá lịch sử.

---

## 5. Manifest, B/L và Container

### 5.1 `manifest`

```text
id PK
icd_id FK -> icd_site
manifest_no UNIQUE trong phạm vi phù hợp
shipping_line_id FK -> shipping_line
vessel_name
voyage_no
eta
port_of_loading
port_of_discharge
status: DRAFT | SUBMITTED | CANCELLED
created_by FK -> user
created_at / updated_at
```

### 5.2 `master_bl`

```text
id PK
manifest_id FK -> manifest
mbl_number
shipping_line_id FK -> shipping_line
created_at / updated_at
UNIQUE(manifest_id, mbl_number)
```

### 5.3 `house_bl`

```text
id PK
master_bl_id FK -> master_bl
hbl_number
consignee_id FK -> consignee
clearing_agent_id FK -> clearing_agent
cargo_description
gross_weight
package_count
created_at / updated_at
UNIQUE(master_bl_id, hbl_number)
```

### 5.4 `container`

Đại diện container vật lý.

```text
id PK
container_number UNIQUE
container_type
iso_type_code nullable
created_at / updated_at
```

### 5.5 `container_visit`

Đây là **entity trung tâm của nghiệp vụ vận hành**.

```text
id PK
icd_id FK -> icd_site
container_id FK -> container
manifest_id FK -> manifest nullable
master_bl_id FK -> master_bl nullable
house_bl_id FK -> house_bl nullable
consignee_id FK -> consignee nullable
state: PENDING | AUTHORIZED | IN_YARD | GATE_PASS_ISSUED | EXITED | CANCELLED
full_empty_status: FULL | EMPTY | UNKNOWN
gross_weight nullable
seal_no nullable
gate_in_at nullable
gate_out_at nullable
created_at / updated_at
```

**Business rule:** một `container_id` không được có nhiều visit active đồng thời. Với MySQL, Backend phải kiểm tra trong transaction, lock các visit liên quan (`SELECT ... FOR UPDATE`) trước khi tạo/activate visit mới. Tạo index `(container_id, state)` để hỗ trợ kiểm tra nhanh. Nếu cần enforce mạnh hơn ở DB, có thể dùng generated column biểu diễn trạng thái active và UNIQUE index phù hợp.

---

## 6. Tiếp nhận vào cổng và Chuyến xe ra/vào

### 6.1 `movement_order`

```text
id PK
container_visit_id FK -> container_visit
status: DRAFT | AUTHORIZED | EXPIRED | CANCELLED
authorized_by FK -> user nullable
authorized_at nullable
expires_at nullable
created_by FK -> user
created_at / updated_at
```

### 6.2 `truck_visit`

```text
id PK
icd_id FK -> icd_site
visit_code UNIQUE
visit_type: GATE_IN | GATE_OUT
status: SCHEDULED | ARRIVED | IN_PROGRESS | COMPLETED | CANCELLED
appointment_at nullable
arrived_at nullable
completed_at nullable
vehicle_plate
trailer_plate nullable
driver_name
driver_phone nullable
transporter_id FK -> transporter nullable
gate_lane nullable
created_at / updated_at
```

### 6.3 `truck_visit_container`

Junction M:N giữa chuyến xe và container visit.

```text
id PK
truck_visit_id FK -> truck_visit
container_visit_id FK -> container_visit
sequence_no nullable
UNIQUE(truck_visit_id, container_visit_id)
```

### 6.4 `container_reception`

```text
id PK
container_visit_id FK -> container_visit UNIQUE
truck_visit_id FK -> truck_visit nullable
actual_seal
actual_weight nullable
condition_code nullable
condition_notes nullable
photo_ref nullable
received_by FK -> user
received_at
created_at
```

Khi Gate-in thành công: tạo reception, cập nhật `container_visit.state = IN_YARD`, ghi event và phát sinh EDI CODECO Gate-in nếu route phù hợp.

---

## 7. Tác nghiệp bãi container

### 7.1 `yard_block`

```text
id PK
icd_id FK
block_code
name
operational
UNIQUE(icd_id, block_code)
```

### 7.2 `yard_slot`

```text
id PK
yard_block_id FK -> yard_block
row_no
bay_no
tier_no
slot_code
supported_container_type nullable
reefer_power boolean
max_weight nullable
operational boolean
UNIQUE(yard_block_id, row_no, bay_no, tier_no)
```

### 7.3 `container_location_log`

```text
id PK
container_visit_id FK -> container_visit
yard_slot_id FK -> yard_slot
started_at
ended_at nullable
assigned_by FK -> user
source: MANUAL | RULE | ML | MOVEMENT
recommendation_id nullable
```

`ended_at IS NULL` đại diện vị trí hiện tại. Chỉ được có tối đa một location active trên một container visit.

### 7.4 `yard_movement`

```text
id PK
container_visit_id FK
from_slot_id FK -> yard_slot
to_slot_id FK -> yard_slot
status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
reason nullable
started_at nullable
completed_at nullable
created_by / completed_by FK -> user
```

### 7.5 `container_inspection`

```text
id PK
container_visit_id FK
inspection_type
status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
result: PASS | FAIL | HOLD nullable
notes nullable
started_at / completed_at nullable
created_by / completed_by FK -> user
```

### 7.6 `in_yard_booking`

```text
id PK
container_visit_id FK
booking_type: STRIPPING | STUFFING | INSPECTION
status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
scheduled_at
started_at nullable
completed_at nullable
actual_package_count nullable
actual_weight nullable
condition_notes nullable
```

---

## 8. Lệnh giữ nghiệp vụ (Lệnh giữ nghiệp vụ)

### `operational_hold`

```text
id PK
container_visit_id FK -> container_visit
hold_type: CUSTOMS | SHIPPING_LINE | DAMAGE | SECURITY | DOCUMENT | OTHER
status: ACTIVE | RELEASED
reason
placed_by FK -> user
placed_at
released_by FK -> user nullable
released_at nullable
release_reason nullable
```

**Business rule:** Hold `ACTIVE` không đổi lifecycle container nhưng là blocker của Gate Pass readiness và Gate-out.

---

## 9. Dịch vụ, Hóa đơn và Thanh toán

### 9.1 `service_type`

`id, code UNIQUE, name, unit, active`

Các code chính: `RECEPTION`, `STORAGE`, `STRIPPING`, `INSPECTION`, `MOVEMENT`.

### 9.2 `tariff`

```text
id PK
icd_id FK
name
status: DRAFT | ACTIVE | RETIRED
effective_from
effective_to nullable
created_by
```

### 9.3 `tariff_rule`

```text
id PK
tariff_id FK
service_type_id FK
container_type nullable
unit_price
free_days nullable
min_quantity nullable
max_quantity nullable
```

### 9.4 `service_order`

```text
id PK
container_visit_id FK
consignee_id FK
status: DRAFT | CONFIRMED | INVOICED | CANCELLED
total_amount
created_by
created_at / confirmed_at nullable
```

### 9.5 `service_order_item`

```text
id PK
service_order_id FK
service_type_id FK
source_entity_type nullable
source_entity_id nullable
quantity
unit_price
amount
```

`source_entity_type/id` giúp truy ngược item phí về reception/inspection/movement/booking/storage period và chống bill trùng.

### 9.6 `invoice`

```text
id PK
service_order_id FK UNIQUE
invoice_no UNIQUE
issued_at
due_at
total_amount
paid_amount
status: UNPAID | PARTIALLY_PAID | PAID | VOID
```

### 9.7 `payment`

```text
id PK
consignee_id FK
payment_ref UNIQUE
amount
method
paid_at
recorded_by FK -> user
```

### 9.8 `payment_allocation`

```text
id PK
payment_id FK -> payment
invoice_id FK -> invoice
amount
created_at
UNIQUE(payment_id, invoice_id)
```

Một payment có thể phân bổ cho nhiều invoice; revenue report dựa trên allocation thực tế.

---

## 10. Phiếu ra cổng và Xác nhận ra cổng

### `gate_pass`

```text
id PK
container_visit_id FK
code UNIQUE
qr_token_hash UNIQUE
status: ACTIVE | EXPIRED | USED | CANCELLED
issued_by FK -> user
issued_at
expires_at
used_at nullable
vehicle_plate nullable
receiver_name nullable
receiver_id_number nullable
```

**Readiness trước khi tạo Gate Pass** kiểm tra tối thiểu:

```text
container IN_YARD
có Yard position
billing hoàn tất
không còn unbilled service
không có active Yard operation
không có Inspection HOLD
không có Lệnh giữ nghiệp vụ ACTIVE
```

Gate-out thành công cập nhật `gate_pass = USED`, `container_visit = EXITED`, đóng location hiện tại và ghi timeline event.

---

## 11. Dòng thời gian và Nhật ký kiểm toán

### 11.1 `container_event`

```text
id PK
container_visit_id FK
event_type
event_time
actor_user_id nullable
reference_type nullable
reference_id nullable
metadata_json nullable
```

Dùng dựng Timeline ở Web/Mobile.

### 11.2 `audit_log`

```text
id PK
icd_id FK
actor_user_id nullable
action
entity_type
entity_id
old_data_json nullable
new_data_json nullable
reason nullable
request_id
created_at
```

Sensitive fields phải redact trước khi lưu hoặc khi trả ra UI.

---

## 12. Tích hợp EDI / Hãng tàu

Phần này giữ ở mức nghiệp vụ để phục vụ đồ án.

### 12.1 `edi_route`

```text
id PK
icd_id FK
shipping_line_id FK
enabled
transport: MOCK | HTTPS | SFTP
outbound_format
partner_target
credential_ref nullable
created_at / updated_at
UNIQUE(icd_id, shipping_line_id)
```

### 12.2 `edi_outbox_message`

```text
id PK
container_visit_id FK nullable
shipping_line_id FK
message_type: CODECO_GATE_IN | CODECO_GATE_OUT | COREOR
status: PENDING | PROCESSING | SENT | FAILED | DEAD
idempotency_key UNIQUE
payload_snapshot
routing_snapshot
retry_count
next_retry_at nullable
external_reference nullable
last_error nullable
created_at / sent_at nullable
```

### 12.3 `edi_acknowledgement`

```text
id PK
outbox_message_id FK nullable
shipping_line_id FK
ack_type: CONTRL | APERAK
status: ACCEPTED | REJECTED | ERROR | UNMATCHED
external_reference nullable
raw_payload nullable
parsed_payload nullable
received_at
```

**Luồng nghiệp vụ:** Gate-in/Gate-out → tạo Outbox → Dispatcher gửi → lưu delivery result → nếu có ACK thì đối soát application result → lỗi có thể retry/đưa incident.

---

## 13. Mô đun 13 — Tích hợp bàn giao đối tác

Module này phục vụ ICD công bố Handover cho Partner và nhận confirmation ngược lại. Core Container Visit vẫn là source-of-truth của nghiệp vụ ICD.

### 13.1 `partner_api_client`

```text
id CHAR(36) PK
partner_code VARCHAR UNIQUE NOT NULL
partner_name VARCHAR NOT NULL
api_key_hash VARCHAR NOT NULL
key_last4 VARCHAR(8)
status ENUM(ACTIVE, REVOKED)
scopes JSON / relation
last_request_at DATETIME(3) nullable
created_by CHAR(36) FK user
created_at DATETIME(3)
rotated_at DATETIME(3) nullable
revoked_at DATETIME(3) nullable
```

**Rule:** plaintext API Key không lưu DB.

### 13.2 `customer_warehouse`

```text
id CHAR(36) PK
consignee_id CHAR(36) nullable FK consignee
code VARCHAR NOT NULL
name VARCHAR NOT NULL
address TEXT
latitude DECIMAL nullable
longitude DECIMAL nullable
contact_name VARCHAR nullable
contact_phone VARCHAR nullable
active BOOLEAN default true
created_at / updated_at
UNIQUE(icd_site_id, code)  -- nếu multi-site
```

### 13.3 `transport_handover`

```text
id CHAR(36) PK
container_visit_id CHAR(36) FK container_visit NOT NULL
partner_api_client_id CHAR(36) FK partner_api_client NOT NULL
warehouse_id CHAR(36) FK customer_warehouse NOT NULL
transport_code VARCHAR NOT NULL
status ENUM(
  DRAFT, READY_FOR_HANDOVER, PARTNER_ACCEPTED, IN_TRANSIT,
  PARTNER_CONFIRMED, ICD_CONFIRMED, COMPLETED,
  PARTNER_REJECTED, DELIVERY_FAILED, DISPUTED, CANCELLED
)
expected_delivery_at DATETIME(3) nullable
ready_at DATETIME(3) nullable
partner_accepted_at DATETIME(3) nullable
departed_at DATETIME(3) nullable
partner_confirmed_at DATETIME(3) nullable
icd_confirmed_at DATETIME(3) nullable
completed_at DATETIME(3) nullable
icd_confirmed_by CHAR(36) nullable FK user
created_by CHAR(36) FK user
version INT default 1
created_at / updated_at
```

**Constraint đề xuất:** một Container Visit không có nhiều Handover active xung đột. Với MySQL, kiểm tra trong Backend transaction và lock các Handover hiện có của `container_visit_id` trước khi tạo/chuyển trạng thái. Tạo index `(container_visit_id, status)` để hỗ trợ validation; có thể bổ sung generated column + UNIQUE index nếu muốn enforce trực tiếp ở DB.

### 13.4 `transport_confirmation`

```text
id CHAR(36) PK
transport_handover_id CHAR(36) FK transport_handover NOT NULL
confirmation_type ENUM(PARTNER_ACCEPTED, IN_TRANSIT, WAREHOUSE_RECEIVED, DELIVERY_FAILED, ICD_CONFIRMED, DISPUTE)
partner_request_id VARCHAR nullable
confirmed_at DATETIME(3) NOT NULL
receiver_name VARCHAR nullable
receiver_phone VARCHAR nullable
condition VARCHAR nullable
note TEXT nullable
latitude DECIMAL nullable
longitude DECIMAL nullable
accuracy_m DECIMAL nullable
proof_image_url TEXT nullable
signature_url TEXT nullable
payload_snapshot JSON
created_by_user_id CHAR(36) nullable FK user
created_by_partner_client_id CHAR(36) nullable FK partner_api_client
created_at DATETIME(3)
```

Rule: machine confirmation và internal user confirmation phân biệt actor; không sửa record cũ để “chữa lịch sử”.

### 13.5 `partner_api_log`

```text
id CHAR(36) PK
partner_api_client_id CHAR(36) FK partner_api_client NOT NULL
transport_handover_id CHAR(36) nullable FK transport_handover
endpoint VARCHAR NOT NULL
method VARCHAR NOT NULL
idempotency_key VARCHAR nullable
request_hash VARCHAR nullable
request_body_redacted JSON nullable
response_body_redacted JSON nullable
http_status INT
business_status VARCHAR
error_code VARCHAR nullable
request_id VARCHAR
latency_ms INT nullable
created_at DATETIME(3)
completed_at DATETIME(3) nullable
UNIQUE(partner_api_client_id, endpoint, idempotency_key)
```

**Lưu ý MySQL:** UNIQUE composite trên `(partner_api_client_id, endpoint, idempotency_key)` cho phép nhiều dòng có `idempotency_key = NULL`. Các request state-changing bắt buộc có `Idempotency-Key`; request read-only có thể để `NULL`.

### 13.6 Luồng quan hệ

```text
container_visit
   ↓ 1:N
transport_handover
   ├── partner_api_client
   ├── customer_warehouse
   ├── N transport_confirmation
   └── N partner_api_log
```

### 13.7 Rule dữ liệu

- Đối tác tích hợp API không FK sang user nội bộ.
- Partner chỉ nhìn Handover có `partner_api_client_id` của chính mình.
- `transport_handover` không chứa API Key.
- `transport_confirmation.payload_snapshot` phục vụ audit, không phải source để sửa core Container Visit.
- `partner_api_log` redact secret/PII theo policy.
- Handover state transition phải validate trong transaction.

### 13.8 Định vị GPS / Bằng chứng giao nhận (POD)

GPS là optional checkpoint, không phải real-time tracking. Nếu warehouse có lat/long, backend có thể tính khoảng cách để warning. Không hard-block nếu product chưa xác định độ chính xác GPS và bán kính phù hợp.

## 14. Gợi ý vị trí bãi bằng ML

Ở mức CSDL nghiệp vụ chỉ cần lưu recommendation snapshot và feedback.

### `yard_recommendation`

```text
id PK
container_visit_id FK
algorithm: RULE_BASED_V1 | ML_RERANK
model_version nullable
created_at
```

### `yard_recommendation_candidate`

```text
id PK
recommendation_id FK
yard_slot_id FK
rule_score
ml_probability nullable
rule_rank
ml_rank nullable
selected boolean default false
```

Dữ liệu này phục vụ training/evaluation nhưng hard safety rules vẫn được kiểm tra trước khi candidate được tạo.

---

## 15. Index và constraint quan trọng

1. `container(container_number)` UNIQUE.
2. Index `(container_id, state)` + Backend transaction/row lock để bảo đảm một physical container chỉ có một active `container_visit`; MySQL không dùng partial unique index.
3. Một container visit chỉ có một `container_reception`.
4. Một container visit chỉ có một `container_location_log` active (`ended_at IS NULL`).
5. Yard slot không được có hai location active cùng lúc.
6. `truck_visit_container(truck_visit_id, container_visit_id)` UNIQUE.
7. `payment_allocation.amount > 0` và tổng allocation không vượt payment/invoice balance (backend transaction check).
8. `gate_pass.code`, `qr_token_hash`, `invoice_no`, `payment_ref`, `edi_outbox_message.idempotency_key` UNIQUE.
9. Module 13: UNIQUE `(partner_api_client_id, endpoint, idempotency_key)` cho request có idempotency key; `transport_code` unique theo scope nghiệp vụ; dùng transaction validation + row lock (hoặc generated column + UNIQUE index) để ngăn nhiều Handover active xung đột.
10. Index search chính: `container_number`, `container_visit.state`, `gate_in_at`, `gate_out_at`, `yard_slot`, `invoice.status`, `operational_hold.status`, `integration status`, `created_at`.

---

## 16. Ranh giới giao dịch quan trọng

### Tiếp nhận vào cổng

```text
validate Movement Order / Truck Visit
→ create reception
→ update Container Visit = IN_YARD
→ write event
→ enqueue CODECO Tiếp nhận vào cổng
→ commit
```

### Hoàn tất di chuyển nội bộ

```text
validate target slot
→ close current location
→ open new location
→ complete movement
→ write event/feedback
→ commit
```

### Thanh toán

```text
create payment
→ allocate invoice(s)
→ recalculate paid_amount/status
→ commit
```

### Phát hành Phiếu ra cổng

```text
recalculate readiness
→ nếu không blocker: create ACTIVE Phiếu ra cổng
→ Container Visit = GATE_PASS_ISSUED
→ event
→ commit
```

### Xác nhận ra cổng

```text
validate Phiếu ra cổng + re-check readiness
→ Phiếu ra cổng = USED
→ Container Visit = EXITED
→ close Yard location
→ event
→ enqueue CODECO Xác nhận ra cổng
→ commit
```

### Bàn giao vận chuyển — request thay đổi trạng thái từ đối tác

```text
authenticate API Key
→ authorize scope
→ check idempotency
→ lock/version-check transport_handover
→ validate owner + current state
→ insert transport_confirmation/event
→ update handover state/timestamp
→ write partner_api_log
→ commit
```

Không sửa `container_visit.state` trong transaction này.

### ICD xác nhận bàn giao

```text
load Handover PARTNER_CONFIRMED
→ validate permission/current version
→ insert ICD confirmation event
→ update ICD_CONFIRMED + COMPLETED
→ audit log
→ commit
```

## 17. Phân biệt nguồn dữ liệu

| Dữ liệu                                  | Source of truth                                              |
| ---------------------------------------- | ------------------------------------------------------------ |
| Container physical + ICD lifecycle       | ICD `container` / `container_visit`                          |
| Gate/Yard/Billing/Gate Pass              | ICD                                                          |
| Shipping Line EDI delivery state         | ICD Outbox/ACK store                                         |
| Bàn giao vận chuyển lifecycle            | ICD `transport_handover`                                     |
| Partner warehouse/transport confirmation | ICD `transport_confirmation` (snapshot/event do Partner gửi) |
| External request/idempotency             | ICD `partner_api_log`                                        |
| Điều phối route/driver nội bộ Partner    | Hệ thống Partner, ICD chỉ lưu snapshot được gửi              |

Đây là ranh giới quan trọng để tránh hai hệ thống cùng ghi đè state của nhau.

---

## 18. Bảng ưu tiên khi demo đồ án

Nếu cần trình bày ERD ngắn trước hội đồng, ưu tiên các bảng:

```text
manifest → master_bl → house_bl
container → container_visit
movement_order / truck_visit / container_reception
yard_slot / container_location_log / operational_hold
service_order → invoice → payment
gate_pass
container_event / audit_log
edi_outbox_message
partner_api_client → transport_handover → transport_confirmation / partner_api_log
```

Nhóm này đủ thể hiện toàn bộ luồng **Manifest → Gate-in → Yard → Billing → Gate Pass → Gate-out → Integration**.
