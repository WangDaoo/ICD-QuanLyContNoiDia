# Backend README — ICD Management API

Backend la source of truth cho nghiep vu ICD. Web, Mobile va Partner System chi goi API; moi dieu kien quan trong nhu state transition, readiness, billing, gate-out, handover, idempotency va audit deu duoc backend kiem tra lai truoc khi commit.

## 1. Tong quan

- Framework: NestJS 12 + TypeScript.
- ORM: Prisma 7 + MySQL 8.x/InnoDB.
- Auth noi bo: JWT access token + refresh token theo session trong DB.
- Auth Partner: `X-API-Key` cho External Partner API.
- API prefix: `/api`.
- Swagger UI: `/api/docs` khi `SWAGGER_ENABLED=true`.
- Module chinh: `auth`, `users`, `roles`, `master-data`, `manifests`, `containers`, `movement-orders`, `truck-visits`, `gate-in`, `yard`, `billing`, `gate-pass`, `gate-out`, `edi`, `work-queue`, `reports`, `partner-handover`, `notifications`, `audit`.

## 2. Chay local

Yeu cau:

- Node.js `>=22.22.3`
- pnpm `10.5.2`
- MySQL 8.x

Lenh hay dung:

```bash
pnpm install
docker compose up -d mysql
pnpm --filter @icd/api prisma:generate
pnpm --filter @icd/api prisma:migrate
pnpm --filter @icd/api prisma:seed
pnpm dev:api
```

Bien moi truong quan trong lay tu `.env.example`:

```env
API_HOST=0.0.0.0
API_PORT=3000
DATABASE_URL="mysql://icd_user:icd_password@localhost:3306/icd_management"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800
ML_SERVICE_URL=http://localhost:8000
```

Base URL local mac dinh:

```text
http://localhost:3000/api
```

## 3. Quy uoc HTTP va JSON

Tat ca JSON field dung `camelCase`, tru External Partner API dang dung contract `snake_case` cho payload partner-facing.

Single resource:

```json
{
  "data": {
    "id": "uuid"
  }
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

Error noi bo:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Du lieu dau vao khong hop le.",
    "details": {
      "fields": []
    }
  },
  "requestId": "req_xxx"
}
```

ValidationPipe dang bat:

- `whitelist=true`: strip field khong khai bao.
- `forbidNonWhitelisted=true`: reject field la.
- `transform=true`: tu ep kieu query/body theo DTO.

Header chung:

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
X-Request-Id: <optional-client-request-id>
```

Header Partner API:

```http
X-API-Key: <partner-api-key>
Idempotency-Key: <partner-generated-key>
```

`Idempotency-Key` bat buoc voi Partner endpoint co thay doi state.

## 4. Kien truc module

Pattern chuan:

```text
Controller -> Service -> Policy/Validator -> Prisma/External Client
```

Quy tac:

- Controller mong: nhan request, param, auth context, goi service.
- Service giu orchestration va transaction.
- Policy giu state transition va dieu kien nghiep vu tai su dung.
- DTO chi validate shape input.
- Mapper doi persistence/domain sang response.
- Backend khong expose endpoint generic `updateStatus`.
- Action nghiep vu phai la command ro nghia: `authorize`, `arrive`, `assign`, `confirm`, `issue`, `cancel`, `publish`, `dispute`.

Ownership:

| Module             | So huu                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `containers`       | Physical container, Container Visit, timeline, lifecycle chinh     |
| `movement-orders`  | Lenh van chuyen va authorization                                   |
| `truck-visits`     | Chuyen xe vat ly tai cong                                          |
| `gate-in`          | Orchestration tiep nhan vao cong                                   |
| `yard`             | Yard slot, location, movement, inspection, booking, recommendation |
| `billing`          | Service order, invoice, payment, billing readiness                 |
| `gate-pass`        | Readiness va Gate Pass lifecycle                                   |
| `gate-out`         | Xac nhan container roi ICD, re-check readiness                     |
| `partner-handover` | Transport Handover, Partner API Client, Partner API Log            |
| `edi`              | EDI outbox, dispatch, ACK, alert                                   |
| `audit`            | Nhat ky kiem toan                                                  |

## 5. State machine chinh

Container Visit status trong Prisma:

```text
PENDING
AUTHORIZED
IN_YARD
IN_TRANSIT
ARRIVED
INSPECTED
GATE_IN_REQUESTED
GATE_IN_CONFIRMED
STACKED
UNDER_CUSTOMS_HOLD
CUSTOMS_CLEARED
GATE_PASS_ISSUED
GATE_OUT_CONFIRMED
EXITED
CANCELLED
```

Luồng nghiep vu core dung cho demo:

```text
Manifest
  -> Master BL
  -> House BL
  -> Container Visit PENDING
  -> Movement Order AUTHORIZED
  -> Truck Visit ARRIVED
  -> Gate-in
  -> Container Visit IN_YARD
  -> Yard assign/movement/inspection/booking
  -> Billing service order/invoice/payment
  -> Gate Pass ACTIVE
  -> Gate-out
  -> Gate Pass USED
  -> Container Visit EXITED
  -> EDI CODECO gate-out outbox
```

Transport Handover status:

```text
DRAFT
  -> READY_FOR_HANDOVER
  -> PARTNER_ACCEPTED
  -> IN_TRANSIT
  -> PARTNER_CONFIRMED
  -> ICD_CONFIRMED
  -> COMPLETED
```

Nhanh ngoai le:

```text
READY_FOR_HANDOVER -> PARTNER_REJECTED
IN_TRANSIT         -> DELIVERY_FAILED
PARTNER_CONFIRMED  -> DISPUTED
DRAFT/READY        -> CANCELLED
```

Boundary quan trong: Partner API chi thay doi `transport_handover`, `transport_confirmation`, `partner_api_log`. Partner khong duoc sua `container_visit.state`, Yard, Billing, Operational Hold, Gate Pass hoac lich su Gate-out.

## 6. Luong nghiep vu chi tiet

### 6.1 Auth/RBAC

1. User goi `POST /api/auth/login`.
2. Backend check email, password, user active, ICD site active.
3. Backend tao `auth_session`, hash refresh token, tra access token va refresh token.
4. Protected request goi bang `Authorization: Bearer`.
5. `JwtAuthGuard` load lai role/permission tu DB, khong tin role trong JWT.
6. `POST /api/auth/refresh` rotate refresh token atomic. Reuse token cu se revoke session.
7. `POST /api/auth/logout` revoke session hien tai.

Login request:

```json
{
  "email": "admin@icd.local",
  "password": "StrongPassword123!"
}
```

Login response:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshExpiresIn": 604800,
  "user": {
    "id": "uuid",
    "icdId": "uuid",
    "sessionId": "uuid",
    "name": "System Administrator",
    "email": "admin@icd.local",
    "roleCodes": ["ADMIN"],
    "permissionCodes": ["manifest.read", "gate_pass.create"]
  }
}
```

### 6.2 Master data

Master data cung cap catalog dung chung: Shipping Line, Consignee, Clearing Agent, Transporter.

Luồng:

1. ADMIN tao danh muc.
2. Manifest/HBL/Truck Visit tham chieu danh muc.
3. Danh muc khong nen hard delete; backend dung `active` de khoa su dung moi nhung giu lich su.

Consignee request:

```json
{
  "name": "ABC Trading Co.",
  "taxCode": "0312345678",
  "phone": "0900000000",
  "email": "ops@abc.example",
  "address": "Ha Noi"
}
```

### 6.3 Manifest, MBL, HBL

Manifest la dau vao ho so hang hoa, lam co so tao Container Visit.

Luồng:

1. Tao Manifest `DRAFT`.
2. Them Master BL vao Manifest.
3. Them House BL vao Master BL.
4. Lien ket Consignee/Clearing Agent va thong tin hang.
5. Tao Container Visit tu HBL.
6. Submit Manifest de khoa hoac han che sua theo policy.

Create Manifest:

```json
{
  "shippingLineId": "uuid",
  "vesselName": "WAN HAI 288",
  "voyageNo": "WH288E",
  "eta": "2026-09-20T08:00:00.000Z",
  "portOfLoading": "CNSHA",
  "portOfDischarge": "VNHPH"
}
```

Create Master BL:

```json
{
  "mblNumber": "MBL20260920001",
  "shippingLineId": "uuid"
}
```

Create House BL:

```json
{
  "hblNumber": "HBL20260920001",
  "consigneeId": "uuid",
  "clearingAgentId": "uuid",
  "cargoDescription": "Electronic components",
  "grossWeight": 18500.25,
  "packageCount": 120
}
```

### 6.4 Container Visit

Container physical duoc dinh danh boi `containerNumber`. `container_visit` dai dien mot lan container di qua ICD.

Luồng:

1. Tao visit tu manifest/HBL hoac nhap thu cong.
2. Backend validate ISO 6346 format `^[A-Z]{4}\d{7}$`.
3. Backend check khong co active visit xung dot.
4. Visit bat dau o `PENDING`.
5. Movement Order authorize xong thi visit du dieu kien vao cong.

Create Container Visit:

```json
{
  "containerNumber": "MSCU1234567",
  "isoCode": "40HC",
  "size": "SIZE_40",
  "type": "DRY",
  "height": 9.6,
  "tareWeight": 3700,
  "maxPayload": 28500,
  "houseBlId": "uuid",
  "sealNumber": "SL123456",
  "cargoDescription": "Electronic components",
  "grossWeight": 18200.5,
  "category": "IMPORT"
}
```

Update Container Visit:

```json
{
  "houseBlId": "uuid",
  "sealNumber": "SL654321",
  "cargoDescription": "Updated cargo note",
  "grossWeight": 18300,
  "category": "IMPORT",
  "holdStatus": "NONE",
  "currentLocation": "A/R01/B02/T1",
  "note": "Kiem tra seal tai cong"
}
```

Cancel Container Visit:

```json
{
  "reason": "Nhap sai container, huy de tao lai"
}
```

### 6.5 Movement Order va Truck Visit

Movement Order la lenh cho phep container di chuyen ve ICD. Truck Visit la chuyen xe vat ly tai cong.

Luồng:

1. Tao Movement Order cho `containerVisitId`.
2. Authorize Movement Order.
3. Tao Truck Visit kem danh sach `containerVisitIds`.
4. Gate staff danh dau Truck Visit `ARRIVED`.
5. Gate-in chi thanh cong khi order/visit/truck hop le theo policy.

Create Movement Order:

```json
{
  "expiresAt": "2026-09-21T08:00:00.000Z"
}
```

Authorize Movement Order:

```json
{
  "expiresAt": "2026-09-21T08:00:00.000Z"
}
```

Create Truck Visit:

```json
{
  "visitType": "GATE_IN",
  "vehiclePlate": "51A-12345",
  "trailerPlate": "51R-99999",
  "driverName": "Nguyen Van A",
  "driverPhone": "0900000001",
  "transporterId": "uuid",
  "appointmentAt": "2026-09-20T09:00:00.000Z",
  "gateLane": "LANE-1",
  "containerVisitIds": ["uuid"]
}
```

Arrive Truck Visit:

```json
{
  "gateLane": "LANE-1",
  "arrivedAt": "2026-09-20T09:10:00.000Z"
}
```

### 6.6 Gate-in

Gate-in la diem container chinh thuc vao ICD.

Luồng transaction:

```text
validate Movement Order / Truck Visit
-> create container_reception
-> update Container Visit = IN_YARD
-> write container_event
-> enqueue EDI CODECO_GATE_IN
-> commit
```

Gate-in request:

```json
{
  "truckVisitId": "uuid",
  "actualSeal": "SL123456",
  "actualWeight": 18250.75,
  "conditionCode": "NORMAL",
  "conditionNotes": "Container nguyen trang",
  "photoRef": "https://storage.example/seal-photo.jpg"
}
```

### 6.7 Yard

Yard quan ly block, slot, location hien tai, movement, inspection, booking va recommendation.

Luồng assign:

1. Gate-in xong, container `IN_YARD` nhung co the chua co slot.
2. Backend tra recommendation theo hard rules va ML rerank neu co.
3. Yard staff chon slot.
4. Backend check slot con trong, operational, phu hop type/weight/reefer.
5. Backend dong location active cu, tao location active moi.

Create Yard Block:

```json
{
  "blockCode": "A",
  "name": "Block A"
}
```

Create Yard Slot:

```json
{
  "rowNo": "R01",
  "bayNo": "B02",
  "tierNo": "T1",
  "supportedContainerType": "DRY",
  "reeferPower": false,
  "maxWeight": 30000
}
```

Assign Yard Slot:

```json
{
  "yardSlotId": "uuid",
  "source": "ML",
  "recommendationId": "uuid",
  "contextToken": "recommendation-context-token"
}
```

Request Yard Movement:

```json
{
  "toSlotId": "uuid",
  "reason": "Toi uu vi tri lay hang"
}
```

Complete Yard Movement:

```json
{
  "reason": "Da di chuyen xong"
}
```

Request Inspection:

```json
{
  "inspectionType": "CUSTOMS",
  "notes": "Kiem hoa theo yeu cau hai quan"
}
```

Complete Inspection:

```json
{
  "result": "PASS",
  "notes": "Dat yeu cau"
}
```

Create Yard Booking:

```json
{
  "bookingType": "STRIPPING",
  "scheduledAt": "2026-09-20T13:00:00.000Z",
  "conditionNotes": "Rut hang trong ca chieu"
}
```

Complete Yard Booking:

```json
{
  "actualPackageCount": 120,
  "actualWeight": 18000,
  "conditionNotes": "Hang nguyen trang"
}
```

### 6.8 Operational Hold

Hold khong doi Container Visit state nhung chan Gate Pass/Gate-out readiness.

Hold type:

```text
CUSTOMS, SHIPPING_LINE, DAMAGE, SECURITY, DOCUMENT, OTHER
```

Create Hold:

```json
{
  "holdType": "CUSTOMS",
  "reason": "Cho bo sung ho so thong quan"
}
```

Release Hold:

```json
{
  "releaseReason": "Da bo sung ho so"
}
```

### 6.9 Billing

Billing tinh phi theo tariff, tao service order, issue invoice, record payment va allocation.

Luồng:

1. `preview` tinh thu phi tai thoi diem `asOfDate`.
2. Tao Service Order `DRAFT`.
3. Confirm Service Order.
4. Issue Invoice.
5. Ghi Payment va allocate vao invoice.
6. Billing readiness pass khi invoice duoc thanh toan va khong con unbilled service.

Preview Billing:

```json
{
  "containerVisitId": "uuid",
  "asOfDate": "2026-09-20",
  "tariffId": "uuid"
}
```

Create Service Order:

```json
{
  "containerVisitId": "uuid",
  "asOfDate": "2026-09-20",
  "tariffId": "uuid",
  "notes": "Tinh phi luu bai va nang ha"
}
```

Issue Invoice:

```json
{
  "dueAt": "2026-09-27T00:00:00.000Z"
}
```

Create Payment:

```json
{
  "consigneeId": "uuid",
  "amount": 3500000,
  "method": "BANK_TRANSFER",
  "paidAt": "2026-09-20T10:30:00.000Z",
  "allocations": [
    {
      "invoiceId": "uuid",
      "amount": 3500000
    }
  ]
}
```

Tariff:

```json
{
  "name": "Tariff Q4 2026",
  "effectiveFrom": "2026-10-01",
  "effectiveTo": "2026-12-31"
}
```

Tariff Rule:

```json
{
  "serviceTypeId": "uuid",
  "containerSize": "SIZE_40",
  "containerType": "DRY",
  "unitPrice": 500000,
  "currency": "VND"
}
```

### 6.10 Gate Pass

Gate Pass chi duoc phat hanh khi readiness pass.

Readiness toi thieu:

```text
container IN_YARD
co yard position
billing hoan tat
khong con unbilled service
khong co active Yard operation
khong co Inspection HOLD
khong co Operational Hold ACTIVE
```

Issue Gate Pass:

```json
{
  "ttlHours": 24,
  "vehiclePlate": "51B-54321",
  "receiverName": "Le Thi C",
  "receiverIdNumber": "0123456789",
  "note": "Lay hang trong ngay"
}
```

Scan Gate Pass:

```json
{
  "qrToken": "qr-token-from-gate-pass"
}
```

Cancel Gate Pass:

```json
{
  "cancelReason": "Khach doi lich lay hang"
}
```

### 6.11 Gate-out

Gate-out la thao tac container roi ICD. Backend luon re-check readiness ngay truoc commit.

Luồng transaction:

```text
validate QR token + Gate Pass ACTIVE
-> re-check readiness
-> Gate Pass = USED
-> Container Visit = EXITED
-> close Yard location
-> write container_event
-> enqueue EDI CODECO_GATE_OUT
-> commit
```

Confirm Gate-out:

```json
{
  "visitId": "uuid",
  "qrToken": "qr-token-from-gate-pass"
}
```

### 6.12 EDI

EDI khong rollback core Gate-in/Gate-out neu delivery/ACK loi.

Luồng:

```text
Gate-in/Gate-out commit
-> tao edi_outbox_message
-> dispatcher gui qua MOCK/HTTPS/SFTP
-> SENT hoac FAILED/DEAD
-> ingest ACK neu co
-> tao alert neu delivery/ACK loi
```

Update EDI Route:

```json
{
  "enabled": true,
  "transport": "SFTP",
  "outboundFormat": "CODECO_CANONICAL_JSON_V1",
  "partnerTarget": "sftp://edi.example/outbox",
  "credentialRef": "EDI_SFTP_SECRET",
  "hostKeySha256": "sha256-fingerprint",
  "timeoutMs": 30000
}
```

Ingest ACK:

```json
{
  "shippingLineId": "uuid",
  "ackType": "APERAK",
  "status": "ACCEPTED",
  "outboxMessageId": "uuid",
  "externalReference": "ACK-001",
  "idempotencyKey": "ack-dedupe-key",
  "rawPayload": "raw ack payload",
  "parsedPayload": {
    "message": "accepted"
  },
  "dedupeKey": "line-ack-001"
}
```

Resolve Alert:

```json
{
  "resolutionNote": "Da gui lai thanh cong"
}
```

### 6.13 Partner Handover

Internal Web dung JWT de quan ly Partner Client, Customer Warehouse va Transport Handover. Partner System dung `X-API-Key` de doc va cap nhat state duoc phep.

Luồng internal:

1. ADMIN tao Partner Client, scopes, API key hien thi mot lan.
2. ADMIN/OPERATOR tao Customer Warehouse.
3. OPERATOR tao Transport Handover `DRAFT`.
4. OPERATOR publish sang `READY_FOR_HANDOVER`.
5. Partner thay Handover qua External API.
6. Partner accept, mark in-transit, warehouse-received.
7. ICD user review, `icd-confirm` hoac `dispute`.

Create Partner Client:

```json
{
  "partnerCode": "ABC_LOGISTICS",
  "partnerName": "ABC Logistics",
  "scopes": [
    "handover.read",
    "handover.accept",
    "handover.transit",
    "handover.confirm_warehouse",
    "handover.failure"
  ]
}
```

Create Customer Warehouse:

```json
{
  "code": "WH-ABC",
  "name": "Kho ABC",
  "consigneeId": "uuid",
  "address": "KCN ABC, Ha Noi",
  "latitude": 20.123456,
  "longitude": 105.123456,
  "contactName": "Nguyen Van B",
  "contactPhone": "0900000002"
}
```

Create Transport Handover:

```json
{
  "containerVisitId": "uuid",
  "partnerApiClientId": "uuid",
  "warehouseId": "uuid",
  "transportCode": "VC-2026-001",
  "expectedDeliveryAt": "2026-09-20T15:00:00.000Z"
}
```

ICD Confirm:

```json
{
  "note": "Da doi chieu POD va transport code"
}
```

Dispute:

```json
{
  "reasonCode": "PROOF_MISMATCH",
  "note": "Anh POD khong khop container",
  "attachmentUrl": "https://storage.example/disputes/ho-001.jpg"
}
```

External list query:

```text
GET /api/v1/external/handovers?status=READY_FOR_HANDOVER&container_code=MSCU1234567&transport_code=VC-2026-001&page=1&limit=20
```

External Accept:

```json
{
  "accepted_at": "2026-09-20T09:05:00+07:00",
  "partner_reference": "P-REF-001",
  "note": "Accepted for delivery"
}
```

External In Transit:

```json
{
  "departed_at": "2026-09-20T09:20:00+07:00",
  "vehicle_plate": "29H-12345",
  "driver_name": "Nguyen Van A",
  "driver_phone": "0900000003",
  "partner_trip_code": "TRIP-001"
}
```

External Warehouse Received:

```json
{
  "received_at": "2026-09-20T15:30:00+07:00",
  "receiver_name": "Nguyen Van B",
  "receiver_phone": "0900000004",
  "warehouse_code": "WH-ABC",
  "condition": "GOOD",
  "note": "Container received",
  "location": {
    "latitude": 20.123456,
    "longitude": 105.123456,
    "accuracy_m": 12
  },
  "proof": {
    "image_url": "https://storage.example/proof/ho-001.jpg",
    "signature_url": "https://storage.example/proof/ho-001-signature.png"
  }
}
```

External Reject:

```json
{
  "reason": "Khong nhan duoc lenh dieu xe",
  "note": "Partner tu choi nhan ban giao"
}
```

External Delivery Failed:

```json
{
  "reason_code": "WAREHOUSE_CLOSED",
  "reason_description": "Kho dong cua truoc gio xe den",
  "failed_at": "2026-09-20T14:50:00+07:00",
  "location": {
    "latitude": 20.123456,
    "longitude": 105.123456,
    "accuracy_m": 20
  }
}
```

### 6.14 Work Queue

Work Queue la projection/aggregation, khong thay the state cua module nguon.

Query:

```text
GET /api/work-queue?type=GATE_IN&urgency=HIGH&page=1&limit=20
GET /api/work-queue/stats
```

Task type tu docs:

```text
GATE_IN, YARD_ASSIGN, YARD_OPERATIONS, BILLING, GATE_OUT, HANDOVER_REVIEW
```

### 6.15 Reports

Reports la read-only:

- dashboard summary
- gate activity
- container turnover
- current yard inventory
- EOD yard inventory
- revenue
- outstanding debt
- Excel export

Date query:

```text
fromDate=2026-09-01&toDate=2026-09-30&timeZone=Asia/Ho_Chi_Minh
```

## 7. API catalog

### Auth

| Method | Path                | Muc dich                |
| ------ | ------------------- | ----------------------- |
| POST   | `/api/auth/login`   | Dang nhap               |
| POST   | `/api/auth/refresh` | Rotate refresh token    |
| GET    | `/api/auth/me`      | Lay user hien tai       |
| POST   | `/api/auth/logout`  | Logout session hien tai |

### Health

| Method | Path                | Muc dich                       |
| ------ | ------------------- | ------------------------------ |
| GET    | `/api/health`       | Health + database connectivity |
| GET    | `/api/health/live`  | Liveness probe                 |
| GET    | `/api/health/ready` | Readiness probe                |

### Users, Roles, Permissions

| Method | Path                              | Muc dich             |
| ------ | --------------------------------- | -------------------- |
| GET    | `/api/users`                      | Danh sach user       |
| POST   | `/api/users`                      | Tao user             |
| GET    | `/api/users/{userId}`             | Chi tiet user        |
| PATCH  | `/api/users/{userId}`             | Cap nhat user        |
| PATCH  | `/api/users/{userId}/status`      | Bat/tat active       |
| PUT    | `/api/users/{userId}/roles`       | Thay role user       |
| PUT    | `/api/users/{userId}/password`    | Reset password       |
| GET    | `/api/roles`                      | Danh sach role       |
| POST   | `/api/roles`                      | Tao role             |
| GET    | `/api/roles/{roleId}`             | Chi tiet role        |
| PATCH  | `/api/roles/{roleId}`             | Cap nhat role        |
| PUT    | `/api/roles/{roleId}/permissions` | Thay permission role |
| GET    | `/api/permissions`                | Danh sach permission |

### Master Data

| Method | Path                                                 | Muc dich                  |
| ------ | ---------------------------------------------------- | ------------------------- |
| GET    | `/api/admin/master-data/shipping-lines`              | Danh sach shipping line   |
| POST   | `/api/admin/master-data/shipping-lines`              | Tao shipping line         |
| GET    | `/api/admin/master-data/shipping-lines/{id}`         | Chi tiet shipping line    |
| PATCH  | `/api/admin/master-data/shipping-lines/{id}`         | Cap nhat shipping line    |
| PATCH  | `/api/admin/master-data/shipping-lines/{id}/status`  | Doi active shipping line  |
| GET    | `/api/admin/master-data/consignees`                  | Danh sach consignee       |
| POST   | `/api/admin/master-data/consignees`                  | Tao consignee             |
| GET    | `/api/admin/master-data/consignees/{id}`             | Chi tiet consignee        |
| PATCH  | `/api/admin/master-data/consignees/{id}`             | Cap nhat consignee        |
| PATCH  | `/api/admin/master-data/consignees/{id}/status`      | Doi active consignee      |
| GET    | `/api/admin/master-data/clearing-agents`             | Danh sach clearing agent  |
| POST   | `/api/admin/master-data/clearing-agents`             | Tao clearing agent        |
| GET    | `/api/admin/master-data/clearing-agents/{id}`        | Chi tiet clearing agent   |
| PATCH  | `/api/admin/master-data/clearing-agents/{id}`        | Cap nhat clearing agent   |
| PATCH  | `/api/admin/master-data/clearing-agents/{id}/status` | Doi active clearing agent |
| GET    | `/api/admin/master-data/transporters`                | Danh sach transporter     |
| POST   | `/api/admin/master-data/transporters`                | Tao transporter           |
| GET    | `/api/admin/master-data/transporters/{id}`           | Chi tiet transporter      |
| PATCH  | `/api/admin/master-data/transporters/{id}`           | Cap nhat transporter      |
| PATCH  | `/api/admin/master-data/transporters/{id}/status`    | Doi active transporter    |

### Manifest, MBL, HBL

| Method | Path                                                               | Muc dich                    |
| ------ | ------------------------------------------------------------------ | --------------------------- |
| GET    | `/api/manifests`                                                   | Danh sach manifest          |
| POST   | `/api/manifests`                                                   | Tao manifest                |
| GET    | `/api/manifests/{manifestId}`                                      | Chi tiet manifest           |
| PATCH  | `/api/manifests/{manifestId}`                                      | Cap nhat manifest           |
| POST   | `/api/manifests/{manifestId}/submit`                               | Submit manifest             |
| POST   | `/api/manifests/{manifestId}/cancel`                               | Cancel manifest             |
| GET    | `/api/manifests/{manifestId}/master-bls`                           | Danh sach MBL               |
| POST   | `/api/manifests/{manifestId}/master-bls`                           | Tao MBL                     |
| PATCH  | `/api/manifests/{manifestId}/master-bls/{mblId}`                   | Cap nhat MBL                |
| DELETE | `/api/manifests/{manifestId}/master-bls/{mblId}`                   | Xoa MBL neu policy cho phep |
| GET    | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls`         | Danh sach HBL               |
| POST   | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls`         | Tao HBL                     |
| PATCH  | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls/{hblId}` | Cap nhat HBL                |
| DELETE | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls/{hblId}` | Xoa HBL neu policy cho phep |

### Containers

| Method | Path                               | Muc dich                          |
| ------ | ---------------------------------- | --------------------------------- |
| GET    | `/api/containers`                  | Danh sach Container Visit         |
| POST   | `/api/containers`                  | Tao Container Visit               |
| GET    | `/api/containers/{visitId}`        | Chi tiet Container Visit          |
| PATCH  | `/api/containers/{visitId}`        | Cap nhat Container Visit metadata |
| GET    | `/api/containers/{visitId}/events` | Timeline event                    |
| POST   | `/api/containers/{visitId}/cancel` | Cancel visit                      |

### Movement Orders va Truck Visits

| Method | Path                                        | Muc dich                     |
| ------ | ------------------------------------------- | ---------------------------- |
| GET    | `/api/movement-orders`                      | Danh sach Movement Order     |
| GET    | `/api/movement-orders/{orderId}`            | Chi tiet Movement Order      |
| PATCH  | `/api/movement-orders/{orderId}`            | Cap nhat Movement Order      |
| POST   | `/api/movement-orders/containers/{visitId}` | Tao Movement Order cho visit |
| POST   | `/api/movement-orders/{orderId}/authorize`  | Authorize Movement Order     |
| POST   | `/api/movement-orders/{orderId}/cancel`     | Cancel Movement Order        |
| GET    | `/api/truck-visits`                         | Danh sach Truck Visit        |
| POST   | `/api/truck-visits`                         | Tao Truck Visit              |
| GET    | `/api/truck-visits/{visitId}`               | Chi tiet Truck Visit         |
| POST   | `/api/truck-visits/{visitId}/arrive`        | Truck den cong               |
| POST   | `/api/truck-visits/{visitId}/cancel`        | Cancel Truck Visit           |

### Gate-in

| Method | Path                                        | Muc dich                         |
| ------ | ------------------------------------------- | -------------------------------- |
| GET    | `/api/containers/{visitId}/gate-in-context` | Du lieu can cho man hinh gate-in |
| POST   | `/api/containers/{visitId}/gate-in`         | Xac nhan gate-in                 |
| GET    | `/api/containers/{visitId}/reception`       | Chi tiet reception               |

### Yard

| Method | Path                                                       | Muc dich                            |
| ------ | ---------------------------------------------------------- | ----------------------------------- |
| GET    | `/api/yard/blocks`                                         | Danh sach block                     |
| POST   | `/api/yard/blocks`                                         | Tao block                           |
| PATCH  | `/api/yard/blocks/{blockId}`                               | Cap nhat block                      |
| GET    | `/api/yard/slots`                                          | Danh sach slot                      |
| POST   | `/api/yard/blocks/{blockId}/slots`                         | Tao slot trong block                |
| PATCH  | `/api/yard/slots/{slotId}`                                 | Cap nhat slot                       |
| GET    | `/api/containers/{visitId}/yard/recommendations`           | Goi y slot                          |
| POST   | `/api/containers/{visitId}/yard/check`                     | Check slot hop le                   |
| POST   | `/api/containers/{visitId}/yard/assign`                    | Assign slot                         |
| GET    | `/api/containers/{visitId}/yard/location`                  | Vi tri hien tai                     |
| GET    | `/api/yard/movements`                                      | Danh sach movement                  |
| GET    | `/api/yard/movements/{id}`                                 | Chi tiet movement                   |
| POST   | `/api/containers/{visitId}/yard/movements`                 | Tao movement                        |
| POST   | `/api/yard/movements/{id}/start`                           | Bat dau movement                    |
| POST   | `/api/yard/movements/{id}/complete`                        | Hoan tat movement                   |
| POST   | `/api/yard/movements/{id}/cancel`                          | Huy movement                        |
| GET    | `/api/yard/inspections`                                    | Danh sach inspection                |
| GET    | `/api/yard/inspections/{id}`                               | Chi tiet inspection                 |
| POST   | `/api/containers/{visitId}/yard/inspections`               | Tao inspection                      |
| POST   | `/api/yard/inspections/{id}/start`                         | Bat dau inspection                  |
| POST   | `/api/yard/inspections/{id}/complete`                      | Hoan tat inspection                 |
| POST   | `/api/yard/inspections/{id}/cancel`                        | Huy inspection                      |
| GET    | `/api/yard/bookings`                                       | Danh sach booking                   |
| GET    | `/api/yard/bookings/{id}`                                  | Chi tiet booking                    |
| POST   | `/api/containers/{visitId}/yard/bookings`                  | Tao booking                         |
| POST   | `/api/yard/bookings/{id}/start`                            | Bat dau booking                     |
| POST   | `/api/yard/bookings/{id}/complete`                         | Hoan tat booking                    |
| POST   | `/api/yard/bookings/{id}/cancel`                           | Huy booking                         |
| GET    | `/api/containers/{visitId}/yard/operations/active-summary` | Tong hop yard operation dang active |

### Billing

| Method | Path                                           | Muc dich                |
| ------ | ---------------------------------------------- | ----------------------- |
| GET    | `/api/billing/service-types`                   | Danh sach service type  |
| POST   | `/api/billing/tariffs`                         | Tao tariff              |
| GET    | `/api/billing/tariffs`                         | Danh sach tariff        |
| GET    | `/api/billing/tariffs/{id}`                    | Chi tiet tariff         |
| PATCH  | `/api/billing/tariffs/{id}`                    | Cap nhat tariff         |
| POST   | `/api/billing/tariffs/{id}/rules`              | Them tariff rule        |
| DELETE | `/api/billing/tariffs/{id}/rules/{ruleId}`     | Xoa tariff rule         |
| POST   | `/api/billing/tariffs/{id}/activate`           | Activate tariff         |
| POST   | `/api/billing/tariffs/{id}/retire`             | Retire tariff           |
| POST   | `/api/billing/service-orders/preview`          | Preview phi             |
| POST   | `/api/billing/service-orders`                  | Tao service order       |
| GET    | `/api/billing/service-orders`                  | Danh sach service order |
| GET    | `/api/billing/service-orders/{id}`             | Chi tiet service order  |
| POST   | `/api/billing/service-orders/{id}/recalculate` | Tinh lai service order  |
| POST   | `/api/billing/service-orders/{id}/confirm`     | Confirm service order   |
| POST   | `/api/billing/service-orders/{id}/cancel`      | Cancel service order    |
| POST   | `/api/billing/invoices/{serviceOrderId}/issue` | Issue invoice           |
| GET    | `/api/billing/invoices`                        | Danh sach invoice       |
| GET    | `/api/billing/invoices/{id}`                   | Chi tiet invoice        |
| POST   | `/api/billing/payments`                        | Tao payment             |
| GET    | `/api/billing/payments`                        | Danh sach payment       |
| GET    | `/api/billing/payments/{id}`                   | Chi tiet payment        |
| GET    | `/api/billing/readiness/{containerVisitId}`    | Billing readiness       |

### Operational Holds, Gate Pass, Gate-out

| Method | Path                                            | Muc dich                 |
| ------ | ----------------------------------------------- | ------------------------ |
| GET    | `/api/containers/{visitId}/operational-holds`   | Danh sach hold cua visit |
| POST   | `/api/containers/{visitId}/operational-holds`   | Tao hold                 |
| GET    | `/api/operational-holds/{holdId}`               | Chi tiet hold            |
| POST   | `/api/operational-holds/{holdId}/release`       | Release hold             |
| GET    | `/api/containers/{visitId}/gate-pass/readiness` | Gate Pass readiness      |
| GET    | `/api/containers/{visitId}/gate-pass`           | Gate Pass hien tai       |
| POST   | `/api/containers/{visitId}/gate-pass`           | Issue Gate Pass          |
| GET    | `/api/containers/{visitId}/gate-passes`         | Lich su Gate Pass        |
| POST   | `/api/gate-passes/{gatePassId}/cancel`          | Cancel Gate Pass         |
| POST   | `/api/gate-pass/scan`                           | Scan QR token            |
| POST   | `/api/gate-out`                                 | Confirm gate-out         |

### EDI

| Method | Path                               | Muc dich                    |
| ------ | ---------------------------------- | --------------------------- |
| GET    | `/api/edi/routes`                  | Danh sach route             |
| PUT    | `/api/edi/routes/{shippingLineId}` | Upsert route                |
| GET    | `/api/edi/outbox`                  | Danh sach outbox            |
| GET    | `/api/edi/outbox/{id}`             | Chi tiet outbox             |
| POST   | `/api/edi/outbox/{id}/retry`       | Retry message               |
| POST   | `/api/edi/dispatch`                | Chay dispatcher             |
| POST   | `/api/edi/acks/ingest`             | Ingest ACK                  |
| GET    | `/api/edi/acks`                    | Danh sach ACK               |
| GET    | `/api/edi/acks/{id}`               | Chi tiet ACK                |
| GET    | `/api/edi/alerts`                  | Danh sach alert             |
| GET    | `/api/edi/alerts/{id}`             | Chi tiet alert              |
| POST   | `/api/edi/alerts/{id}/acknowledge` | Acknowledge alert           |
| POST   | `/api/edi/alerts/{id}/resolve`     | Resolve alert               |
| POST   | `/api/edi/alerts/sync`             | Dong bo alert tu outbox/ack |

### Work Queue, Reports, Audit, Notifications

| Method | Path                                             | Muc dich               |
| ------ | ------------------------------------------------ | ---------------------- |
| GET    | `/api/work-queue`                                | Danh sach viec can lam |
| GET    | `/api/work-queue/stats`                          | Thong ke work queue    |
| GET    | `/api/reports/dashboard/summary`                 | Dashboard summary      |
| GET    | `/api/reports/gate-activity`                     | Bao cao gate activity  |
| GET    | `/api/reports/container-turnover`                | Bao cao turnover       |
| GET    | `/api/reports/yard-inventory/current`            | Ton bai hien tai       |
| GET    | `/api/reports/yard-inventory/eod`                | Ton bai cuoi ngay      |
| GET    | `/api/reports/revenue`                           | Bao cao doanh thu      |
| GET    | `/api/reports/outstanding-debt`                  | Bao cao cong no        |
| GET    | `/api/reports/export/excel`                      | Export Excel           |
| GET    | `/api/audit-logs`                                | Danh sach audit log    |
| GET    | `/api/audit-logs/request/{requestId}`            | Audit theo request     |
| GET    | `/api/audit-logs/entity/{entityType}/{entityId}` | Audit theo entity      |
| POST   | `/api/notifications/register-device`             | Dang ky push device    |
| DELETE | `/api/notifications/unregister-device`           | Huy push device        |
| GET    | `/api/notifications/history`                     | Lich su notification   |
| PATCH  | `/api/notifications/{id}/read`                   | Mark notification read |
| POST   | `/api/notifications/read-all`                    | Mark all read          |

### Partner Handover internal

| Method | Path                                        | Muc dich                      |
| ------ | ------------------------------------------- | ----------------------------- |
| POST   | `/api/partner-clients`                      | Tao Partner API Client va key |
| GET    | `/api/partner-clients`                      | Danh sach Partner Client      |
| GET    | `/api/partner-clients/{id}`                 | Chi tiet Partner Client       |
| POST   | `/api/partner-clients/{id}/rotate-key`      | Rotate API key                |
| POST   | `/api/partner-clients/{id}/revoke`          | Revoke Partner Client         |
| POST   | `/api/customer-warehouses`                  | Tao kho nhan                  |
| GET    | `/api/customer-warehouses`                  | Danh sach kho nhan            |
| GET    | `/api/customer-warehouses/{id}`             | Chi tiet kho nhan             |
| PATCH  | `/api/customer-warehouses/{id}`             | Cap nhat kho nhan             |
| POST   | `/api/transport-handovers`                  | Tao Handover                  |
| GET    | `/api/transport-handovers`                  | Danh sach Handover            |
| GET    | `/api/transport-handovers/{id}`             | Chi tiet Handover             |
| POST   | `/api/transport-handovers/{id}/publish`     | Publish Handover              |
| POST   | `/api/transport-handovers/{id}/icd-confirm` | ICD confirm                   |
| POST   | `/api/transport-handovers/{id}/dispute`     | Tao dispute                   |

### Partner Handover external

| Method | Path                                                         | Muc dich                                |
| ------ | ------------------------------------------------------------ | --------------------------------------- |
| GET    | `/api/v1/external/handovers`                                 | Partner lay danh sach Handover cua minh |
| GET    | `/api/v1/external/handovers/{handoverId}`                    | Partner lay chi tiet Handover           |
| POST   | `/api/v1/external/handovers/{handoverId}/accept`             | Partner accept                          |
| POST   | `/api/v1/external/handovers/{handoverId}/reject`             | Partner reject                          |
| POST   | `/api/v1/external/handovers/{handoverId}/in-transit`         | Partner bao dang van chuyen             |
| POST   | `/api/v1/external/handovers/{handoverId}/delivery-failed`    | Partner bao giao that bai               |
| POST   | `/api/v1/external/handovers/{handoverId}/warehouse-received` | Partner xac nhan kho nhan               |

## 8. Enum chinh

```text
ManifestStatus: DRAFT, SUBMITTED, CANCELLED
ContainerType: DRY, REEFER, FLATRACK, OPENTOP, TANK
ContainerSize: SIZE_20, SIZE_40, SIZE_45
ContainerCategory: IMPORT, EXPORT, STORAGE
ContainerHoldStatus: NONE, CUSTOMS_HOLD, ICD_HOLD, PAYMENT_HOLD
MovementOrderStatus: DRAFT, AUTHORIZED, EXPIRED, CANCELLED
TruckVisitType: GATE_IN, GATE_OUT
TruckVisitStatus: SCHEDULED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED
YardLocationSource: MANUAL, RULE, ML, MOVEMENT
YardMovementStatus: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
ContainerInspectionStatus: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
ContainerInspectionResult: PASS, FAIL, HOLD
InYardBookingType: STRIPPING, STUFFING, INSPECTION
InYardBookingStatus: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
TariffStatus: DRAFT, ACTIVE, RETIRED
ServiceOrderStatus: DRAFT, CONFIRMED, INVOICED, CANCELLED
InvoiceStatus: UNPAID, PARTIALLY_PAID, PAID, VOID
PaymentMethod: CASH, BANK_TRANSFER
OperationalHoldType: CUSTOMS, SHIPPING_LINE, DAMAGE, SECURITY, DOCUMENT, OTHER
OperationalHoldStatus: ACTIVE, RELEASED
GatePassStatus: ACTIVE, EXPIRED, USED, CANCELLED
EdiTransport: MOCK, HTTPS, SFTP
EdiMessageType: CODECO_GATE_IN, CODECO_GATE_OUT, COREOR
EdiOutboxStatus: PENDING, PROCESSING, SENT, FAILED, DEAD
PartnerApiClientStatus: ACTIVE, REVOKED
TransportHandoverStatus: DRAFT, READY_FOR_HANDOVER, PARTNER_ACCEPTED, IN_TRANSIT, PARTNER_CONFIRMED, ICD_CONFIRMED, COMPLETED, PARTNER_REJECTED, DELIVERY_FAILED, DISPUTED, CANCELLED
TransportConfirmationType: PARTNER_ACCEPTED, IN_TRANSIT, WAREHOUSE_RECEIVED, DELIVERY_FAILED, ICD_CONFIRMED, DISPUTE
NotificationDevicePlatform: ANDROID, IOS
```

## 9. Checklist test nhanh theo luong demo

1. Login bang admin seeded.
2. Tao master data: shipping line, consignee, clearing agent, transporter.
3. Tao manifest, MBL, HBL.
4. Tao container visit.
5. Tao va authorize movement order.
6. Tao truck visit, mark arrived.
7. Gate-in container.
8. Tao yard block/slot, assign slot.
9. Tao service order, confirm, issue invoice, record payment.
10. Check gate-pass readiness, issue gate pass.
11. Scan gate pass, confirm gate-out.
12. Tao partner client, warehouse, transport handover.
13. Publish handover.
14. Goi External API bang `X-API-Key` va `Idempotency-Key`: accept, in-transit, warehouse-received.
15. ICD confirm handover.
16. Kiem tra Container Visit van `EXITED`, Handover `COMPLETED`, EDI outbox/audit/log duoc ghi.

## 10. Ghi chu khac biet so voi spec

Docs nghiep vu/web co nhac mot so route dang ky vong o nhom admin partner-clients hoac handovers. Code hien tai expose theo Swagger/code:

```text
/api/partner-clients
/api/customer-warehouses
/api/transport-handovers
/api/v1/external/handovers
```

README nay uu tien code hien tai trong `apps/api/src/modules` va `swagger.json`.
