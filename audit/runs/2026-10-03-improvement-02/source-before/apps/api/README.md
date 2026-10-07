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

### 2.1 Snapshot backend hien tai

Lan kiem tra gan nhat: `2026-10-01 08:29 Asia/Saigon`.

Nguon doi chieu:

- API runtime: `GET http://localhost:3000/api/docs-json`
- API file snapshot: `swagger.json`
- Schema: `apps/api/prisma/schema.prisma`
- README nay: `apps/api/README.md`

Ket qua doc tu backend hien tai:

| Hang muc | Gia tri |
| -------- | ------- |
| API method runtime | `204` |
| Prisma model | `53` |
| SQL table dang map bang `@@map` | `53` |
| Enum Prisma | `41` |
| API prefix | `/api` |
| Swagger UI | `/api/docs` |
| Swagger JSON | `/api/docs-json` |
| Liveness | `GET /api/health/live` tra `200` |
| Readiness | `GET /api/health/ready` tra `503` neu Prisma khong query duoc MySQL |

Trang thai may luc kiem tra:

- Nest API da bat duoc va dang chiem `0.0.0.0:3000`.
- `GET /api/docs-json` tra `200`.
- `GET /api/health/live` tra `200`.
- `GET /api/health/ready` tra `503` voi body bao `database: down`.
- `docker compose ps` khong ket noi duoc Docker daemon tren Windows pipe.
- `127.0.0.1:3306` co mo port, nhung Prisma bi MySQL tu choi credential: `Access denied for user 'icd_user'@'localhost'`.

Neu can API ready 100%, can dam bao MySQL dung DB/user/password trong `.env`:

```bash
docker compose up -d mysql
pnpm --filter @icd/api prisma:migrate
pnpm --filter @icd/api prisma:seed
pnpm dev:api
```

### 2.2 API count theo module

Lay truc tiep tu Swagger runtime `GET /api/docs-json`.

| Module/Tag | So API |
| ---------- | ------ |
| Audit | 3 |
| Auth | 4 |
| Billing | 7 |
| BillingReadiness | 1 |
| ClearingAgents | 6 |
| Consignees | 6 |
| ContainerHandoverSummary | 1 |
| Containers | 6 |
| CustomerWarehouse | 4 |
| Edi | 14 |
| ExternalHandovers | 7 |
| GateIn | 3 |
| GateOut | 1 |
| GatePass | 6 |
| Health | 3 |
| HouseBls | 4 |
| Invoices | 3 |
| Manifests | 6 |
| MasterBls | 4 |
| MasterData | 3 |
| MovementOrders | 6 |
| Notifications | 5 |
| OperationalHolds | 4 |
| PartnerApiLog | 2 |
| PartnerClient | 5 |
| Payments | 3 |
| Permissions | 1 |
| Reports | 8 |
| Roles | 5 |
| Settings | 2 |
| ShippingLines | 6 |
| Tariff | 9 |
| Transporters | 6 |
| TransportHandover | 6 |
| TruckVisits | 5 |
| Users | 8 |
| WorkQueue | 2 |
| Yard | 29 |
| **Tong** | **204** |

### 2.3 SQL / CSDL hien tai

Database source of truth la Prisma schema, MySQL table duoc map bang `@@map`.

Quy uoc CSDL:

- Engine: MySQL 8.x, InnoDB.
- Charset/collation Docker: `utf8mb4`, `utf8mb4_unicode_ci`.
- Ten bang/cot SQL: `snake_case`.
- Ten model/field Prisma: `PascalCase` model, `camelCase` field.
- ID chinh: UUID luu dang `CHAR(36)`.
- Timestamp: `DATETIME(3)`, UTC.
- Relation quan trong dung foreign key ro rang, khong dung key text thay the cho quan he nghiep vu.

SQL bootstrap toi thieu:

```sql
CREATE DATABASE IF NOT EXISTS icd_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS icd_management_shadow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'icd_user'@'%' IDENTIFIED BY 'icd_password';
GRANT ALL PRIVILEGES ON icd_management.* TO 'icd_user'@'%';
GRANT ALL PRIVILEGES ON icd_management_shadow.* TO 'icd_user'@'%';
FLUSH PRIVILEGES;
```

`DATABASE_URL` dung trong backend:

```env
DATABASE_URL="mysql://icd_user:icd_password@localhost:3306/icd_management"
SHADOW_DATABASE_URL="mysql://icd_user:icd_password@localhost:3306/icd_management_shadow"
```

Lenh schema:

```bash
pnpm --filter @icd/api prisma:generate
pnpm --filter @icd/api prisma:migrate
pnpm --filter @icd/api prisma:seed
```

Luong CSDL tong quat:

```text
icd_site
  -> user/auth_session/user_role/role_permission/permission
  -> master data: shipping_line, consignee, clearing_agent, transporter
  -> manifest -> master_bl -> house_bl -> container_visit -> container/container_event
  -> movement_order -> truck_visit/truck_visit_container -> container_reception
  -> yard_block/yard_slot -> container_location_log/yard_movement/container_inspection/in_yard_booking
  -> service_type/tariff/tariff_rule -> service_order/service_order_item -> invoice/payment/payment_allocation
  -> operational_hold -> gate_pass -> gate_out via container_visit EXITED
  -> edi_route/edi_outbox_message/edi_acknowledgement/edi_alert
  -> partner_api_client/customer_warehouse/transport_handover/transport_confirmation/partner_api_log
  -> notification/notification_device/notification_delivery
  -> audit_log
```

Danh sach 53 table hien tai:

| Prisma model | SQL table | Vai tro nghiep vu |
| ------------ | --------- | ----------------- |
| `IcdSite` | `icd_site` | Don vi ICD/site van hanh, root tenant. |
| `User` | `user` | Tai khoan noi bo web/mobile. |
| `AuthSession` | `auth_session` | Refresh token/session, revoke va rotate token. |
| `Role` | `role` | Vai tro RBAC. |
| `Permission` | `permission` | Quyen chi tiet theo module/action. |
| `UserRole` | `user_role` | Gan user vao role. |
| `RolePermission` | `role_permission` | Gan permission vao role. |
| `IcdSetting` | `icd_setting` | Cau hinh he thong. |
| `ShippingLine` | `shipping_line` | Hang tau/master data. |
| `Consignee` | `consignee` | Chu hang/nguoi nhan. |
| `ClearingAgent` | `clearing_agent` | Dai ly khai thue hai quan. |
| `Transporter` | `transporter` | Don vi van tai. |
| `Manifest` | `manifest` | Manifest tau/chuyen hang. |
| `MasterBl` | `master_bl` | Master Bill of Lading. |
| `HouseBl` | `house_bl` | House Bill of Lading. |
| `Container` | `container` | Thong tin vat ly container dung chung. |
| `ContainerVisit` | `container_visit` | Luot container vao ICD, state lifecycle chinh. |
| `ContainerEvent` | `container_event` | Timeline su kien container. |
| `MovementOrder` | `movement_order` | Lenh van chuyen/gate-in/gate-out duoc authorize. |
| `TruckVisit` | `truck_visit` | Luot xe vao/ra cong. |
| `TruckVisitContainer` | `truck_visit_container` | Bang noi truck visit voi container visit. |
| `ContainerReception` | `container_reception` | Bien ban tiep nhan gate-in. |
| `YardBlock` | `yard_block` | Block/bai. |
| `YardSlot` | `yard_slot` | Slot bay-row-tier. |
| `ContainerLocationLog` | `container_location_log` | Lich su vi tri container trong bai. |
| `YardMovement` | `yard_movement` | Lenh dao chuyen noi bai. |
| `ContainerInspection` | `container_inspection` | Kiem tra container trong bai. |
| `InYardBooking` | `in_yard_booking` | Booking thao tac stripping/stuffing/inspection. |
| `ServiceType` | `service_type` | Loai dich vu tinh phi. |
| `Tariff` | `tariff` | Bieu gia. |
| `TariffRule` | `tariff_rule` | Rule tinh gia theo tariff. |
| `ServiceOrder` | `service_order` | Phieu dich vu/draft tinh phi. |
| `ServiceOrderItem` | `service_order_item` | Dong phi chi tiet. |
| `Invoice` | `invoice` | Hoa don. |
| `Payment` | `payment` | Thanh toan. |
| `PaymentAllocation` | `payment_allocation` | Phan bo payment vao invoice. |
| `OperationalHold` | `operational_hold` | Lenh hold/release nghiep vu. |
| `GatePass` | `gate_pass` | Phieu ra cong/QR. |
| `AuditLog` | `audit_log` | Audit trail cho API/action. |
| `EdiRoute` | `edi_route` | Cau hinh tuyen EDI theo hang tau. |
| `EdiOutboxMessage` | `edi_outbox_message` | EDI outbox CODECO/COREOR. |
| `EdiAcknowledgement` | `edi_acknowledgement` | ACK CONTRL/APERAK. |
| `EdiAlert` | `edi_alert` | Canh bao EDI. |
| `YardRecommendation` | `yard_recommendation` | Ket qua goi y slot. |
| `YardRecommendationCandidate` | `yard_recommendation_candidate` | Ung vien slot cho recommendation. |
| `PartnerApiClient` | `partner_api_client` | Client/API key cho doi tac. |
| `CustomerWarehouse` | `customer_warehouse` | Kho khach hang nhan container. |
| `TransportHandover` | `transport_handover` | Ban giao van chuyen cho partner. |
| `TransportConfirmation` | `transport_confirmation` | Xac nhan trang thai giao nhan tu partner/ICD. |
| `PartnerApiLog` | `partner_api_log` | Log request/response Partner API. |
| `Notification` | `notification` | Noi dung thong bao. |
| `NotificationDevice` | `notification_device` | Thiet bi mobile nhan push. |
| `NotificationDelivery` | `notification_delivery` | Trang thai gui notification. |

Quan he DB theo nghiep vu chinh:

- RBAC: `user` -> `user_role` -> `role` -> `role_permission` -> `permission`; `auth_session` nam duoi `user`.
- Hang tau/BL: `manifest` -> `master_bl` -> `house_bl`; container visit gan vao HBL va container vat ly.
- Gate-in: `movement_order` + `truck_visit` + `truck_visit_container` hop le thi tao `container_reception`, doi `container_visit.status` sang `IN_YARD`, ghi `container_event`.
- Yard: `yard_block` -> `yard_slot`; gan bai ghi `container_location_log`; dao chuyen ghi `yard_movement`; kiem tra/book thao tac ghi `container_inspection`/`in_yard_booking`.
- Billing: `service_type`/`tariff`/`tariff_rule` tinh phi; `service_order` sinh `service_order_item`; confirm tao `invoice`; thu tien ghi `payment` va `payment_allocation`.
- Hold/readiness: `operational_hold` active se chan billing/gate-pass/gate-out tuy dieu kien.
- Gate pass/out: `gate_pass` active cho phep scan va gate-out; gate-out doi visit sang `EXITED`, gate pass sang `USED`, ghi EDI outbox neu can.
- Partner handover: `transport_handover` nam tren `container_visit`, partner update qua confirmation/log, khong duoc sua truc tiep visit/yard/billing.
- Notification/audit: command quan trong ghi `audit_log`; thong bao di qua `notification`, `notification_device`, `notification_delivery`.

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
GATE_PASS_ISSUED
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
  "manifestId": "uuid",
  "masterBlId": "uuid",
  "houseBlId": "uuid",
  "consigneeId": "uuid",
  "fullEmptyStatus": "FULL",
  "sealNo": "SL123456",
  "cargoDescription": "Electronic components",
  "grossWeight": 18200.5,
  "category": "IMPORT"
}
```

Update Container Visit:

```json
{
  "houseBlId": "uuid",
  "manifestId": "uuid",
  "masterBlId": "uuid",
  "consigneeId": "uuid",
  "sealNo": "SL654321",
  "cargoDescription": "Updated cargo note",
  "grossWeight": 18300,
  "category": "IMPORT",
  "fullEmptyStatus": "FULL",
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
{}
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

Create Payment (`POST /api/payments`, generic allocation):

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
  ],
  "paymentRef": "BANK-REF-20260920-001"
}
```

Record Invoice Payment (`POST /api/invoices/{invoiceId}/payments`):

```json
{
  "amount": 3500000,
  "method": "BANK_TRANSFER",
  "paidAt": "2026-09-20T10:30:00.000Z",
  "referenceNo": "BANK-REF-20260920-001"
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
GET /api/v1/external/handovers?status=READY_FOR_HANDOVER&container_code=MSCU1234567&transport_code=VC-2026-001&page=1&pageSize=20
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
GET /api/containers/work-queue?type=GATE_IN&urgency=HIGH&page=1&pageSize=50
GET /api/containers/work-queue/stats
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

Source of truth: live Swagger `GET /api/docs-json`. Hien tai backend expose **204 API method**.

Ghi chu: cot `Handler` la `operationId` tren Swagger, dung de doi chieu truc tiep voi controller hien tai.

### Audit

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/audit-logs` | `AuditController_list` |
| GET | `/api/audit-logs/entity/{entityType}/{entityId}` | `AuditController_findByEntity` |
| GET | `/api/audit-logs/request/{requestId}` | `AuditController_findByRequestId` |

### Auth

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/auth/login` | `AuthController_login` |
| POST | `/api/auth/logout` | `AuthController_logout` |
| GET | `/api/auth/me` | `AuthController_me` |
| POST | `/api/auth/refresh` | `AuthController_refresh` |

### Billing

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/containers/{visitId}/service-orders` | `BillingController_createDraftOrder` |
| GET | `/api/service-orders` | `BillingController_findServiceOrders` |
| GET | `/api/service-orders/{id}` | `BillingController_findServiceOrderById` |
| POST | `/api/service-orders/{id}/cancel` | `BillingController_cancelOrder` |
| POST | `/api/service-orders/{id}/confirm` | `BillingController_confirmOrder` |
| POST | `/api/service-orders/{id}/recalculate` | `BillingController_recalculateDraftOrder` |
| POST | `/api/service-orders/preview` | `BillingController_previewBilling` |

### BillingReadiness

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers/{containerVisitId}/billing` | `BillingReadinessController_checkReadiness` |

### ClearingAgents

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/master-data/clearing-agents` | `ClearingAgentsController_findMany` |
| POST | `/api/admin/master-data/clearing-agents` | `ClearingAgentsController_create` |
| GET | `/api/admin/master-data/clearing-agents/{id}` | `ClearingAgentsController_findById` |
| PATCH | `/api/admin/master-data/clearing-agents/{id}` | `ClearingAgentsController_update` |
| POST | `/api/admin/master-data/clearing-agents/{id}/activate` | `ClearingAgentsController_activate` |
| POST | `/api/admin/master-data/clearing-agents/{id}/deactivate` | `ClearingAgentsController_deactivate` |

### Consignees

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/master-data/consignees` | `ConsigneesController_findMany` |
| POST | `/api/admin/master-data/consignees` | `ConsigneesController_create` |
| GET | `/api/admin/master-data/consignees/{id}` | `ConsigneesController_findById` |
| PATCH | `/api/admin/master-data/consignees/{id}` | `ConsigneesController_update` |
| POST | `/api/admin/master-data/consignees/{id}/activate` | `ConsigneesController_activate` |
| POST | `/api/admin/master-data/consignees/{id}/deactivate` | `ConsigneesController_deactivate` |

### ContainerHandoverSummary

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers/{visitId}/handover-summary` | `ContainerHandoverSummaryController_findSummary` |

### Containers

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers` | `ContainersController_findAll` |
| POST | `/api/containers` | `ContainersController_createVisit` |
| GET | `/api/containers/{visitId}` | `ContainersController_findById` |
| PATCH | `/api/containers/{visitId}` | `ContainersController_updateVisit` |
| POST | `/api/containers/{visitId}/cancel` | `ContainersController_cancelVisit` |
| GET | `/api/containers/{visitId}/events` | `ContainersController_getEvents` |

### CustomerWarehouse

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/customer-warehouses` | `CustomerWarehouseController_findMany` |
| POST | `/api/customer-warehouses` | `CustomerWarehouseController_create` |
| GET | `/api/customer-warehouses/{id}` | `CustomerWarehouseController_findById` |
| PATCH | `/api/customer-warehouses/{id}` | `CustomerWarehouseController_update` |

### Edi

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/integrations/edi/acks` | `EdiController_listAcks` |
| GET | `/api/integrations/edi/acks/{id}` | `EdiController_getAckById` |
| POST | `/api/integrations/edi/acks/ingest` | `EdiController_ingestAck` |
| GET | `/api/integrations/edi/alerts` | `EdiController_listAlerts` |
| GET | `/api/integrations/edi/alerts/{id}` | `EdiController_getAlertById` |
| POST | `/api/integrations/edi/alerts/{id}/acknowledge` | `EdiController_acknowledgeAlert` |
| POST | `/api/integrations/edi/alerts/{id}/resolve` | `EdiController_resolveAlert` |
| POST | `/api/integrations/edi/alerts/sync` | `EdiController_syncAlerts` |
| POST | `/api/integrations/edi/dispatch` | `EdiController_triggerDispatch` |
| GET | `/api/integrations/edi/outbox` | `EdiController_listOutbox` |
| GET | `/api/integrations/edi/outbox/{id}` | `EdiController_getOutboxById` |
| POST | `/api/integrations/edi/outbox/{id}/retry` | `EdiController_retryOutbox` |
| GET | `/api/integrations/edi/routes` | `EdiController_getRoutes` |
| PUT | `/api/integrations/edi/routes/{shippingLineId}` | `EdiController_updateRoute` |

### ExternalHandovers

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/v1/external/handovers` | `ExternalHandoversController_list` |
| GET | `/api/v1/external/handovers/{handoverId}` | `ExternalHandoversController_getDetail` |
| POST | `/api/v1/external/handovers/{handoverId}/accept` | `ExternalHandoversController_accept` |
| POST | `/api/v1/external/handovers/{handoverId}/delivery-failed` | `ExternalHandoversController_deliveryFailed` |
| POST | `/api/v1/external/handovers/{handoverId}/in-transit` | `ExternalHandoversController_markInTransit` |
| POST | `/api/v1/external/handovers/{handoverId}/reject` | `ExternalHandoversController_reject` |
| POST | `/api/v1/external/handovers/{handoverId}/warehouse-received` | `ExternalHandoversController_warehouseReceived` |

### GateIn

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/containers/{visitId}/gate-in` | `GateInController_gateIn` |
| GET | `/api/containers/{visitId}/gate-in-context` | `GateInController_getContext` |
| GET | `/api/containers/{visitId}/reception` | `GateInController_getReception` |

### GateOut

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/gate-out` | `GateOutController_confirmGateOut` |

### GatePass

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers/{visitId}/gate-pass` | `GatePassController_findActiveGatePass` |
| POST | `/api/containers/{visitId}/gate-pass` | `GatePassController_issue` |
| GET | `/api/containers/{visitId}/gate-pass/readiness` | `GatePassController_checkReadiness` |
| GET | `/api/containers/{visitId}/gate-passes` | `GatePassController_findManyForVisit` |
| POST | `/api/gate-pass/scan` | `GatePassController_scan` |
| POST | `/api/gate-passes/{gatePassId}/cancel` | `GatePassController_cancel` |

### Health

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/health` | `HealthController_check` |
| GET | `/api/health/live` | `HealthController_live` |
| GET | `/api/health/ready` | `HealthController_ready` |

### HouseBls

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls` | `HouseBlsController_list` |
| POST | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls` | `HouseBlsController_create` |
| DELETE | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls/{hblId}` | `HouseBlsController_remove` |
| PATCH | `/api/manifests/{manifestId}/master-bls/{mblId}/house-bls/{hblId}` | `HouseBlsController_update` |

### Invoices

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/invoices` | `InvoicesController_findMany` |
| GET | `/api/invoices/{id}` | `InvoicesController_findById` |
| POST | `/api/service-orders/{serviceOrderId}/invoice` | `InvoicesController_issueInvoice` |

### Manifests

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/manifests` | `ManifestsController_list` |
| POST | `/api/manifests` | `ManifestsController_create` |
| GET | `/api/manifests/{manifestId}` | `ManifestsController_getDetail` |
| PATCH | `/api/manifests/{manifestId}` | `ManifestsController_update` |
| POST | `/api/manifests/{manifestId}/cancel` | `ManifestsController_cancel` |
| POST | `/api/manifests/{manifestId}/submit` | `ManifestsController_submit` |

### MasterBls

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/manifests/{manifestId}/master-bls` | `MasterBlsController_list` |
| POST | `/api/manifests/{manifestId}/master-bls` | `MasterBlsController_create` |
| DELETE | `/api/manifests/{manifestId}/master-bls/{mblId}` | `MasterBlsController_remove` |
| PATCH | `/api/manifests/{manifestId}/master-bls/{mblId}` | `MasterBlsController_update` |

### MasterData

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/master-data` | `MasterDataController_findAll` |
| POST | `/api/admin/master-data/{type}` | `MasterDataController_create` |
| PATCH | `/api/admin/master-data/{type}/{id}` | `MasterDataController_update` |

### MovementOrders

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/containers/{visitId}/movement-orders` | `MovementOrdersController_createForContainer` |
| GET | `/api/movement-orders` | `MovementOrdersController_findAll` |
| GET | `/api/movement-orders/{orderId}` | `MovementOrdersController_findById` |
| PATCH | `/api/movement-orders/{orderId}` | `MovementOrdersController_update` |
| POST | `/api/movement-orders/{orderId}/authorize` | `MovementOrdersController_authorize` |
| POST | `/api/movement-orders/{orderId}/cancel` | `MovementOrdersController_cancel` |

### Notifications

| Method | Path | Handler |
| ------ | ---- | ------- |
| PATCH | `/api/notifications/{id}/read` | `NotificationsController_markAsRead` |
| GET | `/api/notifications/history` | `NotificationsController_getHistory` |
| POST | `/api/notifications/read-all` | `NotificationsController_markAllAsRead` |
| POST | `/api/notifications/register-device` | `NotificationsController_registerDevice` |
| DELETE | `/api/notifications/unregister-device` | `NotificationsController_unregisterDevice` |

### OperationalHolds

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers/{visitId}/holds` | `OperationalHoldsController_findManyForVisit` |
| POST | `/api/containers/{visitId}/holds` | `OperationalHoldsController_create` |
| POST | `/api/containers/{visitId}/holds/{holdId}/release` | `OperationalHoldsController_release` |
| GET | `/api/operational-holds/{holdId}` | `OperationalHoldsController_findById` |

### PartnerApiLog

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/partner-api-logs` | `PartnerApiLogController_findMany` |
| GET | `/api/admin/partner-api-logs/{id}` | `PartnerApiLogController_findById` |

### PartnerClient

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/partner-clients` | `PartnerClientController_findMany` |
| POST | `/api/admin/partner-clients` | `PartnerClientController_create` |
| GET | `/api/admin/partner-clients/{id}` | `PartnerClientController_findById` |
| POST | `/api/admin/partner-clients/{id}/revoke` | `PartnerClientController_revoke` |
| POST | `/api/admin/partner-clients/{id}/rotate` | `PartnerClientController_rotateKey` |

### Payments

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/invoices/{invoiceId}/payments` | `PaymentsController_create` |
| GET | `/api/payments` | `PaymentsController_findMany` |
| GET | `/api/payments/{id}` | `PaymentsController_findById` |

### Permissions

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/permissions` | `PermissionsController_findMany` |

### Reports

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/reports/container-turnover` | `ReportsController_getContainerTurnover` |
| GET | `/api/reports/export.xlsx` | `ReportsController_exportExcel` |
| GET | `/api/reports/gate-activity` | `ReportsController_getGateActivity` |
| GET | `/api/reports/outstanding-debt` | `ReportsController_getOutstandingDebt` |
| GET | `/api/reports/revenue` | `ReportsController_getRevenue` |
| GET | `/api/reports/summary` | `ReportsController_getDashboardSummary` |
| GET | `/api/reports/yard-inventory/current` | `ReportsController_getCurrentYardInventory` |
| GET | `/api/reports/yard-inventory/eod` | `ReportsController_getYardInventoryEod` |

### Roles

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/roles` | `RolesController_findMany` |
| POST | `/api/admin/roles` | `RolesController_create` |
| GET | `/api/admin/roles/{roleId}` | `RolesController_findById` |
| PATCH | `/api/admin/roles/{roleId}` | `RolesController_update` |
| PUT | `/api/admin/roles/{roleId}/permissions` | `RolesController_replacePermissions` |

### Settings

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/settings` | `SettingsController_findMany` |
| PATCH | `/api/admin/settings/{key}` | `SettingsController_update` |

### ShippingLines

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/master-data/shipping-lines` | `ShippingLinesController_findMany` |
| POST | `/api/admin/master-data/shipping-lines` | `ShippingLinesController_create` |
| GET | `/api/admin/master-data/shipping-lines/{id}` | `ShippingLinesController_findById` |
| PATCH | `/api/admin/master-data/shipping-lines/{id}` | `ShippingLinesController_update` |
| POST | `/api/admin/master-data/shipping-lines/{id}/activate` | `ShippingLinesController_activate` |
| POST | `/api/admin/master-data/shipping-lines/{id}/deactivate` | `ShippingLinesController_deactivate` |

### Tariff

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/service-types` | `TariffController_listServiceTypes` |
| GET | `/api/admin/tariffs` | `TariffController_findTariffs` |
| POST | `/api/admin/tariffs` | `TariffController_createTariff` |
| GET | `/api/admin/tariffs/{id}` | `TariffController_findTariffById` |
| PATCH | `/api/admin/tariffs/{id}` | `TariffController_updateTariff` |
| POST | `/api/admin/tariffs/{id}/activate` | `TariffController_activateTariff` |
| POST | `/api/admin/tariffs/{id}/retire` | `TariffController_retireTariff` |
| POST | `/api/admin/tariffs/{id}/rules` | `TariffController_addTariffRule` |
| DELETE | `/api/admin/tariffs/{id}/rules/{ruleId}` | `TariffController_removeTariffRule` |

### Transporters

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/master-data/transporters` | `TransportersController_findMany` |
| POST | `/api/admin/master-data/transporters` | `TransportersController_create` |
| GET | `/api/admin/master-data/transporters/{id}` | `TransportersController_findById` |
| PATCH | `/api/admin/master-data/transporters/{id}` | `TransportersController_update` |
| POST | `/api/admin/master-data/transporters/{id}/activate` | `TransportersController_activate` |
| POST | `/api/admin/master-data/transporters/{id}/deactivate` | `TransportersController_deactivate` |

### TransportHandover

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/handovers` | `TransportHandoverController_findMany` |
| POST | `/api/handovers` | `TransportHandoverController_create` |
| GET | `/api/handovers/{id}` | `TransportHandoverController_findById` |
| POST | `/api/handovers/{id}/dispute` | `TransportHandoverController_dispute` |
| POST | `/api/handovers/{id}/icd-confirm` | `TransportHandoverController_icdConfirm` |
| POST | `/api/handovers/{id}/publish` | `TransportHandoverController_publish` |

### TruckVisits

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/gate/truck-visits` | `TruckVisitsController_findAll` |
| POST | `/api/gate/truck-visits` | `TruckVisitsController_create` |
| GET | `/api/gate/truck-visits/{visitId}` | `TruckVisitsController_findById` |
| POST | `/api/gate/truck-visits/{visitId}/arrive` | `TruckVisitsController_arrive` |
| POST | `/api/gate/truck-visits/{visitId}/cancel` | `TruckVisitsController_cancel` |

### Users

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/admin/users` | `UsersController_findMany` |
| POST | `/api/admin/users` | `UsersController_create` |
| GET | `/api/admin/users/{userId}` | `UsersController_findById` |
| PATCH | `/api/admin/users/{userId}` | `UsersController_update` |
| POST | `/api/admin/users/{userId}/activate` | `UsersController_activate` |
| POST | `/api/admin/users/{userId}/deactivate` | `UsersController_deactivate` |
| PUT | `/api/admin/users/{userId}/password` | `UsersController_resetPassword` |
| PUT | `/api/admin/users/{userId}/roles` | `UsersController_replaceRoles` |

### WorkQueue

| Method | Path | Handler |
| ------ | ---- | ------- |
| GET | `/api/containers/work-queue` | `WorkQueueController_getWorkQueue` |
| GET | `/api/containers/work-queue/stats` | `WorkQueueController_getStats` |

### Yard

| Method | Path | Handler |
| ------ | ---- | ------- |
| POST | `/api/containers/{visitId}/inspections` | `YardController_requestInspection` |
| POST | `/api/containers/{visitId}/yard-bookings` | `YardController_createBooking` |
| POST | `/api/containers/{visitId}/yard/assign` | `YardController_assign` |
| POST | `/api/containers/{visitId}/yard/check` | `YardController_checkSlot` |
| GET | `/api/containers/{visitId}/yard/location` | `YardController_currentLocation` |
| POST | `/api/containers/{visitId}/yard/movements` | `YardController_requestMovement` |
| GET | `/api/containers/{visitId}/yard/operations/active-summary` | `YardController_getActiveSummary` |
| GET | `/api/containers/{visitId}/yard/recommendations` | `YardController_recommendations` |
| POST | `/api/inspections/{id}/cancel` | `YardController_cancelInspection` |
| POST | `/api/inspections/{id}/complete` | `YardController_completeInspection` |
| POST | `/api/inspections/{id}/start` | `YardController_startInspection` |
| GET | `/api/yard/blocks` | `YardController_findBlocks` |
| POST | `/api/yard/blocks` | `YardController_createBlock` |
| PATCH | `/api/yard/blocks/{blockId}` | `YardController_updateBlock` |
| POST | `/api/yard/blocks/{blockId}/slots` | `YardController_createSlot` |
| GET | `/api/yard/bookings` | `YardController_findBookings` |
| GET | `/api/yard/bookings/{id}` | `YardController_getBookingById` |
| POST | `/api/yard/bookings/{id}/cancel` | `YardController_cancelBooking` |
| POST | `/api/yard/bookings/{id}/complete` | `YardController_completeBooking` |
| POST | `/api/yard/bookings/{id}/start` | `YardController_startBooking` |
| GET | `/api/yard/inspections` | `YardController_findInspections` |
| GET | `/api/yard/inspections/{id}` | `YardController_getInspectionById` |
| GET | `/api/yard/movements` | `YardController_findMovements` |
| GET | `/api/yard/movements/{id}` | `YardController_getMovementById` |
| POST | `/api/yard/movements/{id}/cancel` | `YardController_cancelMovement` |
| POST | `/api/yard/movements/{id}/complete` | `YardController_completeMovement` |
| POST | `/api/yard/movements/{id}/start` | `YardController_startMovement` |
| GET | `/api/yard/slots` | `YardController_findSlots` |
| PATCH | `/api/yard/slots/{slotId}` | `YardController_updateSlot` |

## 8. Enum chinh

```text
ManifestStatus: DRAFT, SUBMITTED, CANCELLED
ContainerType: DRY, REEFER, FLATRACK, OPENTOP, TANK
ContainerSize: SIZE_20, SIZE_40, SIZE_45
ContainerCategory: IMPORT, EXPORT, STORAGE
ContainerVisitStatus: PENDING, AUTHORIZED, IN_YARD, GATE_PASS_ISSUED, EXITED, CANCELLED
FullEmptyStatus: FULL, EMPTY, UNKNOWN
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
/api/admin/partner-clients
/api/customer-warehouses
/api/handovers
/api/v1/external/handovers
```

README nay uu tien code hien tai trong `apps/api/src/modules` va `swagger.json`.
