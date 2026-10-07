# Tong hop cau truc Backend, CSDL, Frontend mock va JSON

Ngay lap: 2026-09-23  
Pham vi kiem tra:

- Backend: `D:/Project/Do An 4 +Mobile/icd-management/apps/api`
- Prisma schema: `D:/Project/Do An 4 +Mobile/icd-management/apps/api/prisma/schema.prisma`
- Frontend mock: `D:/Project/Do An 4 +Mobile/ICD_Web_Frontend_v1.7_updated`

Ghi chu: frontend hien tai la mock UI, du lieu nam trong TypeScript object `INITIAL_*`, khong phai file `.json` rieng va chua goi backend API that.

## 1. Tong quan so lieu hien tai

| Hang muc | So luong | Cach tinh |
|---|---:|---|
| File controller backend | 41 | Dem file `*.controller.ts` trong `apps/api/src/modules` |
| Controller co route decorator | 38 | Dem `@Controller(...)` |
| API method backend | 204 | Dem `@Get`, `@Post`, `@Patch`, `@Put`, `@Delete` |
| Prisma model / bang logic | 53 | Dem `model` trong `schema.prisma` |
| Frontend screen component | 20 | Dem component trong `src/components` |
| Frontend type/interface | 54 | Dem export `type` va `interface` trong `src/types.ts` |
| Frontend mock seed group | 30 | Dem `INITIAL_*` va `PERMISSIONS_CATALOG` trong `src/data/mockData.ts` |

## 2. API backend theo module

| Module | API method |
|---|---:|
| `audit` | 3 |
| `auth` | 4 |
| `billing` | 23 |
| `containers` | 6 |
| `edi` | 14 |
| `gate-in` | 3 |
| `gate-out` | 1 |
| `gate-pass` | 6 |
| `health` | 3 |
| `manifests` | 14 |
| `master-data` | 27 |
| `movement-orders` | 6 |
| `notifications` | 5 |
| `operational-holds` | 4 |
| `partner-handover` | 25 |
| `reports` | 8 |
| `roles/permissions` | 6 |
| `settings` | 2 |
| `truck-visits` | 5 |
| `users` | 8 |
| `work-queue` | 2 |
| `yard` | 29 |

Controller placeholder/legacy co 0 API method:

- `bills-of-lading.controller.ts`
- `manifests.controller.ts` legacy
- `master-data.controller.ts` legacy
- `partner-handovers.controller.ts` legacy/external

## 3. Danh sach 53 bang/model CSDL

| Nhom | Bang/model |
|---|---|
| Site & auth | `IcdSite`, `User`, `AuthSession`, `Role`, `Permission`, `UserRole`, `RolePermission`, `IcdSetting` |
| Master data | `ShippingLine`, `Consignee`, `ClearingAgent`, `Transporter` |
| Manifest & B/L | `Manifest`, `MasterBl`, `HouseBl` |
| Container core | `Container`, `ContainerVisit`, `ContainerEvent`, `OperationalHold` |
| Gate-in | `MovementOrder`, `TruckVisit`, `TruckVisitContainer`, `ContainerReception` |
| Yard | `YardBlock`, `YardSlot`, `ContainerLocationLog`, `YardMovement`, `ContainerInspection`, `InYardBooking` |
| Billing | `ServiceType`, `Tariff`, `TariffRule`, `ServiceOrder`, `ServiceOrderItem`, `Invoice`, `Payment`, `PaymentAllocation` |
| Gate-out | `GatePass` |
| Audit | `AuditLog` |
| EDI | `EdiRoute`, `EdiOutboxMessage`, `EdiAcknowledgement`, `EdiAlert` |
| Yard ML | `YardRecommendation`, `YardRecommendationCandidate` |
| Partner handover | `PartnerApiClient`, `CustomerWarehouse`, `TransportHandover`, `TransportConfirmation`, `PartnerApiLog` |
| Notifications | `Notification`, `NotificationDevice`, `NotificationDelivery` |

## 4. Khung nghiep vu frontend hien co

| Khung UI | Component | Du lieu/action mock dang dung |
|---|---|---|
| Dashboard | `DashboardView.tsx` | KPI container, yard, billing, truck visit, EDI, handover |
| Work Queue | `WorkQueueView.tsx` | `workQueue`, filter role/urgency/taskType |
| Manifest | `ManifestsView.tsx` | `manifests`, create/submit/cancel, add MBL/HBL, import Excel gia lap |
| Container | `ContainersView.tsx` | `containerVisits`, holds, invoices, gate passes, readiness, handover |
| Movement Order | `MovementOrdersView.tsx` | create/authorize/cancel movement order |
| Truck Visit | `TruckVisitsView.tsx` | create truck visit, update status |
| Gate-in | `GateInView.tsx` | gate-in container, seal, truck, driver, condition |
| Yard | `YardView.tsx` | map/list/assign/ops, slot, movement, booking |
| Billing | `BillingView.tsx` | invoice, service order, tariff, payment |
| Gate Pass/Gate-out | `GatePassView.tsx` | readiness, issue pass, scan QR/token, gate-out |
| EDI | `EDIView.tsx` | outbox, routes, alerts |
| Partner Handover | `HandoversView.tsx` | create, publish, partner accept, in-transit, POD, ICD confirm, dispute |
| Partner Client/Log | `PartnerManagementView.tsx` | create partner, rotate key, view API log |
| Master Data | `MasterDataView.tsx` | shipping lines, consignees, clearing agents, transporters |
| Users/Roles | `UsersRolesView.tsx` | user, role, permission |
| Reports/Admin | `ReportsView.tsx` | KPI report mock |
| Audit | `AuditsView.tsx` | audit log |
| Mobile field simulator | `MobileTerminalView.tsx` | gate-in, yard assign, gate-out, lookup, work queue |

## 5. Frontend mock seed groups

| Seed | Kieu du lieu | So object mau |
|---|---|---:|
| `INITIAL_USERS` | `User[]` | 7 |
| `INITIAL_WAREHOUSES` | `CustomerWarehouse[]` | 3 |
| `INITIAL_PARTNER_CLIENTS` | `PartnerApiClient[]` | 3 |
| `INITIAL_MANIFESTS` | `Manifest[]` | 7 |
| `INITIAL_CONTAINER_VISITS` | `ContainerVisit[]` | 6 |
| `INITIAL_HOLDS` | `OperationalHold[]` | 1 |
| `INITIAL_TRUCK_VISITS` | `TruckVisit[]` | 2 |
| `INITIAL_YARD_BLOCKS` | `YardBlock[]` | 4 |
| `INITIAL_YARD_SLOTS` | `YardSlot[]` | 8 |
| `INITIAL_TARIFF_RULES` | `TariffRule[]` | 6 |
| `INITIAL_SERVICE_ORDERS` | `ServiceOrder[]` | 9 |
| `INITIAL_INVOICES` | `Invoice[]` | 2 |
| `INITIAL_GATE_PASSES` | `GatePass[]` | 1 |
| `INITIAL_WORK_QUEUE` | `WorkQueueTask[]` | 4 |
| `INITIAL_EDI_MESSAGES` | `EdiOutboxMessage[]` | 2 |
| `INITIAL_HANDOVERS` | `TransportHandover[]` | 8 |
| `INITIAL_PARTNER_API_LOGS` | `PartnerApiLog[]` | 3 |
| `INITIAL_AUDIT_LOGS` | `AuditLog[]` | 3 |
| `INITIAL_SHIPPING_LINES` | `ShippingLine[]` | 4 |
| `INITIAL_CONSIGNEES` | `Consignee[]` | 4 |
| `INITIAL_CLEARING_AGENTS` | `ClearingAgent[]` | 2 |
| `INITIAL_TRANSPORTERS` | `Transporter[]` | 2 |
| `INITIAL_MOVEMENT_ORDERS` | `MovementOrder[]` | 2 |
| `PERMISSIONS_CATALOG` | `Permission[]` | 14 |
| `INITIAL_ROLES` | `Role[]` | 7 |
| `INITIAL_MANAGED_USERS` | `ManagedUser[]` | 5 |
| `INITIAL_TARIFFS` | `Tariff[]` | 1 |
| `INITIAL_EDI_ROUTES` | `EdiRoute[]` | 3 |
| `INITIAL_EDI_ALERTS` | `EdiAlert[]` | 1 |
| `INITIAL_NOTIFICATIONS` | `AppNotification[]` | 2 |

## 6. JSON response chuan backend nen map tren frontend

### 6.1 Response thanh cong: object

```json
{
  "data": {
    "id": "uuid-or-id",
    "field": "value"
  }
}
```

### 6.2 Response thanh cong: danh sach phan trang

```json
{
  "data": [
    {
      "id": "uuid-or-id"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 6.3 Response loi

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "requestId": "req_xxx"
}
```

## 7. JSON cau truc theo nghiep vu frontend

### 7.1 Auth/User

```json
{
  "user": {
    "id": "usr-1",
    "name": "Admin",
    "email": "admin@icd.local",
    "role": "ADMIN",
    "active": true,
    "consigneeId": null
  },
  "session": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

### 7.2 Manifest / Master BL / House BL

```json
{
  "id": "mnf-1",
  "manifestNo": "MF-2026-0922-MSC",
  "vesselName": "WAN HAI 502",
  "voyageNo": "V.245N",
  "shippingLine": "MSC",
  "eta": "2026-09-22T08:00:00Z",
  "portOfLoading": "Singapore",
  "portOfDischarge": "Cat Lai",
  "status": "DRAFT",
  "masterBills": [
    {
      "id": "mbl-1",
      "manifestId": "mnf-1",
      "mblNumber": "MBL20260920001",
      "shippingLine": "MSC",
      "houseBills": [
        {
          "id": "hbl-1",
          "masterBlId": "mbl-1",
          "hblNumber": "HBL20260920001",
          "consigneeName": "Cong ty TNHH XNK An Binh",
          "clearingAgentName": "Dai ly hai quan A",
          "cargoDescription": "Hang tieu dung",
          "grossWeightKg": 18500,
          "packageCount": 1200,
          "containersCount": 1
        }
      ]
    }
  ],
  "createdAt": "2026-09-22T08:00:00Z"
}
```

### 7.3 Container Visit

```json
{
  "id": "visit-1",
  "containerId": "cont-1",
  "containerNumber": "MSCU6639870",
  "containerType": "40GP",
  "state": "IN_YARD",
  "consigneeId": "csg-1",
  "consigneeName": "Cong ty TNHH XNK An Binh",
  "shippingLine": "MSC",
  "manifestNo": "MF-2026-0922-MSC",
  "mblNumber": "MBL20260920001",
  "hblNumber": "HBL20260920001",
  "manifestSeal": "COSS90123",
  "actualSeal": "COSS90123",
  "grossWeightKg": 18500,
  "currentLocation": "A-01-02-1",
  "gateInAt": "2026-09-22T09:00:00Z",
  "gateOutAt": null,
  "freeDays": 5,
  "notes": "Container vao bai hop le"
}
```

Trang thai `ContainerVisit.state` frontend dang dung:

```json
[
  "PENDING",
  "AUTHORIZED",
  "IN_YARD",
  "IN_STRIPPING",
  "STRIPPED",
  "UNDER_INSPECTION",
  "GATE_PASS_ISSUED",
  "EXITED",
  "CANCELLED"
]
```

### 7.4 Movement Order

```json
{
  "id": "mo-1",
  "orderCode": "MO-2026-001",
  "containerVisitId": "visit-1",
  "containerNumber": "MSCU6639870",
  "status": "AUTHORIZED",
  "createdAt": "2026-09-22T07:00:00Z",
  "authorizedAt": "2026-09-22T07:10:00Z",
  "authorizedBy": "usr-3",
  "expiresAt": "2026-09-23T07:10:00Z",
  "cancelledAt": null,
  "cancelReason": null
}
```

### 7.5 Truck Visit

```json
{
  "id": "tv-1",
  "visitCode": "TV-2026-001",
  "visitType": "GATE_IN",
  "status": "ARRIVED",
  "vehiclePlate": "51A-12345",
  "driverName": "Nguyen Van A",
  "driverPhone": "0900000001",
  "transporterName": "ABC Logistics",
  "appointmentAt": "2026-09-22T08:30:00Z",
  "arrivedAt": "2026-09-22T08:45:00Z",
  "completedAt": null,
  "containerNumbers": ["MSCU6639870"],
  "gateLane": "LANE-01"
}
```

### 7.6 Gate-in request

```json
{
  "visitId": "visit-1",
  "truckVisitId": "tv-1",
  "actualSeal": "COSS90123",
  "actualWeightKg": 18500,
  "vehiclePlate": "51A-12345",
  "driverName": "Nguyen Van A",
  "driverPhone": "0900000001",
  "transporterName": "ABC Logistics",
  "conditionNotes": "Vo container binh thuong",
  "photoUrl": "https://example.com/photo.jpg"
}
```

### 7.7 Yard Slot / Yard Assign

```json
{
  "slot": {
    "id": "slot-1",
    "blockCode": "A",
    "rowNo": 1,
    "bayNo": 2,
    "tierNo": 1,
    "slotCode": "A-01-02-1",
    "supportedType": "ALL",
    "reeferPower": false,
    "maxWeightKg": 30000,
    "operational": true,
    "occupiedByContainerId": null,
    "occupiedByContainerNumber": null,
    "occupiedContainerType": null
  },
  "assignRequest": {
    "visitId": "visit-1",
    "slotCode": "A-01-02-1"
  }
}
```

### 7.8 Yard Recommendation

```json
{
  "slot": {
    "id": "slot-1",
    "slotCode": "A-01-02-1"
  },
  "ruleScore": 92,
  "mlProbability": 0.87,
  "reasons": [
    "Slot trong",
    "Phu hop tai trong",
    "Gan cong"
  ]
}
```

### 7.9 Operational Hold

```json
{
  "id": "hold-1",
  "containerVisitId": "visit-1",
  "holdType": "CUSTOMS",
  "status": "ACTIVE",
  "reason": "Can kiem tra hai quan",
  "placedBy": "usr-3",
  "placedAt": "2026-09-22T10:00:00Z",
  "releasedBy": null,
  "releasedAt": null,
  "releaseReason": null
}
```

### 7.10 Billing / Service Order / Invoice / Payment

```json
{
  "serviceOrder": {
    "id": "so-1",
    "orderCode": "SO-2026-001",
    "containerVisitId": "visit-1",
    "containerNumber": "MSCU6639870",
    "consigneeName": "Cong ty TNHH XNK An Binh",
    "items": [
      {
        "id": "soi-1",
        "serviceType": "STORAGE",
        "serviceName": "Luu bai",
        "quantity": 3,
        "unit": "ngay",
        "unitPriceVnd": 150000,
        "amountVnd": 450000
      }
    ],
    "totalAmountVnd": 450000,
    "status": "CONFIRMED",
    "createdAt": "2026-09-22T10:00:00Z"
  },
  "invoice": {
    "id": "inv-1",
    "invoiceNo": "INV-2026-001",
    "serviceOrderId": "so-1",
    "containerVisitId": "visit-1",
    "containerNumber": "MSCU6639870",
    "consigneeName": "Cong ty TNHH XNK An Binh",
    "issuedAt": "2026-09-22T11:00:00Z",
    "dueAt": "2026-09-29T11:00:00Z",
    "totalAmountVnd": 450000,
    "paidAmountVnd": 450000,
    "status": "PAID"
  },
  "payment": {
    "id": "pay-1",
    "paymentRef": "PAY-2026-001",
    "invoiceId": "inv-1",
    "amountVnd": 450000,
    "method": "CHUYEN_KHOAN",
    "paidAt": "2026-09-22T12:00:00Z",
    "recordedBy": "usr-3",
    "notes": "Da thanh toan"
  }
}
```

### 7.11 Gate Pass / Gate-out

```json
{
  "gatePass": {
    "id": "gp-1",
    "code": "GP-2026-001",
    "containerVisitId": "visit-1",
    "containerNumber": "MSCU6639870",
    "consigneeName": "Cong ty TNHH XNK An Binh",
    "issuedAt": "2026-09-22T13:00:00Z",
    "expiresAt": "2026-09-23T13:00:00Z",
    "status": "ACTIVE",
    "vehiclePlate": "51A-12345",
    "receiverName": "Tran Van B",
    "receiverIdNumber": "012345678901",
    "qrToken": "ICD_QR_MSCU6639870_GP-2026-001",
    "usedAt": null
  },
  "gateOutRequest": {
    "visitId": "visit-1",
    "qrToken": "ICD_QR_MSCU6639870_GP-2026-001",
    "vehiclePlate": "51A-12345",
    "driverName": "Nguyen Van A",
    "gateLane": "LANE-02"
  }
}
```

### 7.12 Readiness check truoc Gate Pass/Gate-out

```json
{
  "isContainerInYard": true,
  "hasYardPosition": true,
  "isBillingCompleted": true,
  "hasNoUnbilledServices": true,
  "hasNoActiveYardOps": true,
  "hasNoInspectionHold": true,
  "hasNoOperationalHold": true,
  "blockers": []
}
```

### 7.13 Work Queue Task

```json
{
  "id": "task-1",
  "taskType": "GATE_IN",
  "urgency": "HIGH",
  "title": "Tiep nhan vao cong MSCU6639870",
  "subtitle": "Xe da den cong, can xac nhan gate-in",
  "containerNumber": "MSCU6639870",
  "containerVisitId": "visit-1",
  "assignedRoles": ["GATE_STAFF", "OPERATOR"],
  "deadline": "2026-09-22T10:00:00Z",
  "timeRemainingText": "Con 30 phut"
}
```

### 7.14 EDI Outbox / Route / Alert

```json
{
  "outboxMessage": {
    "id": "edi-1",
    "messageType": "CODECO_GATE_IN",
    "containerNumber": "MSCU6639870",
    "shippingLine": "MSC",
    "status": "PENDING",
    "idempotencyKey": "IDEM_CODECO_IN_MSCU6639870_20260922",
    "retryCount": 0,
    "lastError": null,
    "createdAt": "2026-09-22T09:00:00Z",
    "sentAt": null,
    "ackStatus": "PENDING",
    "ackReference": null
  },
  "route": {
    "shippingLineId": "sl-1",
    "shippingLineName": "MSC",
    "enabled": true,
    "transport": "SFTP",
    "outboundFormat": "CODECO_CANONICAL_JSON_V1",
    "partnerTarget": "sftp://edi.msc.example/outbox",
    "credentialRef": "EDI_MSC_SFTP_SECRET",
    "timeoutMs": 30000,
    "updatedAt": "2026-09-22T00:00:00Z"
  },
  "alert": {
    "id": "alrt-1",
    "outboxMessageId": "edi-1",
    "containerNumber": "MSCU6639870",
    "shippingLine": "MSC",
    "message": "Gui EDI that bai",
    "status": "OPEN",
    "createdAt": "2026-09-22T10:00:00Z",
    "acknowledgedAt": null,
    "resolvedAt": null,
    "resolutionNote": null
  }
}
```

### 7.15 Partner API Client

```json
{
  "id": "ptn-1",
  "partnerCode": "ABC_LOGISTICS",
  "partnerName": "Cong ty Co phan Van tai ABC",
  "apiKeyHash": "$2b$10$hash...",
  "keyLast4": "9A4F",
  "status": "ACTIVE",
  "scopes": [
    "handover.read",
    "handover.accept",
    "handover.transit",
    "handover.confirm_warehouse"
  ],
  "createdAt": "2026-09-01T08:00:00Z",
  "lastRequestAt": "2026-09-19T06:15:22Z",
  "rotatedAt": null,
  "revokedAt": null
}
```

### 7.16 Transport Handover

```json
{
  "id": "ho-1",
  "transportCode": "VC-2026-001",
  "containerVisitId": "visit-1",
  "containerNumber": "MSCU6639870",
  "containerType": "40GP",
  "partnerClientId": "ptn-1",
  "partnerName": "Cong ty Co phan Van tai ABC",
  "warehouseId": "wh-1",
  "warehouseName": "Kho Ngoai quan Long Binh",
  "warehouseAddress": "KCN Long Binh, Dong Nai",
  "status": "PARTNER_CONFIRMED",
  "expectedDeliveryAt": "2026-09-23T18:00:00Z",
  "readyAt": "2026-09-23T09:00:00Z",
  "partnerAcceptedAt": "2026-09-23T09:05:00Z",
  "departedAt": "2026-09-23T09:25:00Z",
  "partnerConfirmedAt": "2026-09-23T15:30:00Z",
  "icdConfirmedAt": null,
  "completedAt": null,
  "notes": "Ban giao chuyen kho",
  "confirmations": [
    {
      "id": "conf-1",
      "handoverId": "ho-1",
      "confirmationType": "PARTNER_ACCEPTED",
      "confirmedAt": "2026-09-23T09:05:00Z",
      "partnerReference": "ABC-REF-2026-891",
      "actor": "API (ABC_LOGISTICS)",
      "note": "Da nhan lenh van chuyen"
    },
    {
      "id": "conf-2",
      "handoverId": "ho-1",
      "confirmationType": "IN_TRANSIT",
      "confirmedAt": "2026-09-23T09:25:00Z",
      "driverName": "Nguyen Van Tuan",
      "driverPhone": "0938123456",
      "vehiclePlate": "60C-987.65",
      "partnerTripCode": "TRIP-ABC-0918",
      "actor": "API (ABC_LOGISTICS)"
    },
    {
      "id": "conf-3",
      "handoverId": "ho-1",
      "confirmationType": "WAREHOUSE_RECEIVED",
      "confirmedAt": "2026-09-23T15:30:00Z",
      "receiverName": "Ly Quoc Bao",
      "receiverPhone": "0918889999",
      "condition": "GOOD",
      "note": "Container nguyen seal",
      "latitude": 10.92348,
      "longitude": 106.88762,
      "accuracyM": 8.5,
      "proofImageUrl": "https://example.com/pod.jpg",
      "signatureUrl": "https://example.com/signature.svg",
      "actor": "API (ABC_LOGISTICS)"
    }
  ],
  "disputeReason": null,
  "disputeNote": null
}
```

Trang thai `TransportHandover.status` frontend dang dung:

```json
[
  "DRAFT",
  "READY_FOR_HANDOVER",
  "PARTNER_ACCEPTED",
  "IN_TRANSIT",
  "PARTNER_CONFIRMED",
  "ICD_CONFIRMED",
  "COMPLETED",
  "PARTNER_REJECTED",
  "DELIVERY_FAILED",
  "DISPUTED",
  "CANCELLED"
]
```

### 7.17 Partner API Log

```json
{
  "id": "log-1",
  "partnerClientId": "ptn-1",
  "partnerName": "Cong ty Co phan Van tai ABC",
  "handoverId": "ho-1",
  "transportCode": "VC-2026-001",
  "containerNumber": "MSCU6639870",
  "endpoint": "/api/v1/external/handovers/ho-1/warehouse-received",
  "method": "POST",
  "idempotencyKey": "idem-warehouse-received-001",
  "requestBodyRedacted": "{\"receiverName\":\"***\"}",
  "responseBodyRedacted": "{\"status\":\"PARTNER_CONFIRMED\"}",
  "httpStatus": 200,
  "businessStatus": "SUCCESS",
  "errorCode": null,
  "requestId": "req-abc-001",
  "latencyMs": 124,
  "createdAt": "2026-09-23T15:30:00Z"
}
```

### 7.18 Audit Log

```json
{
  "id": "aud-1",
  "actor": "operator@icd.local",
  "action": "GATE_IN_CONFIRMED",
  "entityType": "ContainerVisit",
  "entityId": "visit-1",
  "details": "Xac nhan gate-in container MSCU6639870",
  "requestId": "req-001",
  "timestamp": "2026-09-23T09:00:00Z"
}
```

### 7.19 Master Data

```json
{
  "shippingLine": {
    "id": "sl-1",
    "name": "MSC",
    "scacCode": "MSCU",
    "active": true,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "consignee": {
    "id": "csg-1",
    "name": "Cong ty TNHH XNK An Binh",
    "taxCode": "0312345678",
    "phone": "0900000001",
    "email": "ops@anbinh.vn",
    "address": "TP.HCM",
    "active": true,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "clearingAgent": {
    "id": "ca-1",
    "name": "Dai ly Hai quan A",
    "taxCode": "0300000001",
    "phone": "0900000002",
    "address": "TP.HCM",
    "active": true,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "transporter": {
    "id": "trp-1",
    "name": "ABC Logistics",
    "taxCode": "0300000002",
    "phone": "0900000003",
    "address": "Dong Nai",
    "active": true,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### 7.20 Role / Permission / Managed User

```json
{
  "permission": {
    "code": "gate_in.execute",
    "description": "Thuc hien Gate-in"
  },
  "role": {
    "id": "role-gate",
    "code": "GATE_STAFF",
    "name": "Nhan vien cong",
    "permissionCodes": ["gate_in.execute", "gate_out.execute", "container.read"],
    "isSystem": true
  },
  "managedUser": {
    "id": "usr-4",
    "name": "Le Van Cong",
    "email": "gate@icd.local",
    "roleCodes": ["GATE_STAFF"],
    "active": true,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

## 8. Doi chieu nhanh frontend mock voi backend that

| Hang muc | Tinh trang |
|---|---|
| Frontend co khung UI nghiep vu | Co, gan du cac module chinh |
| Frontend co API client that | Chua |
| Frontend co goi backend `fetch/axios` | Chua |
| Frontend co auth JWT that | Chua |
| Frontend co static health UI | Co, `API Gateway 200 OK`, `MySQL Online` dang la text tinh |
| Backend co API theo module | Co, 204 method |
| Backend co CSDL day du theo Prisma | Co, 53 model |
| Can lam tiep de dau frontend | Tao API client, map DTO, thay `INITIAL_*`, them loading/error/pagination/auth |

## 9. Thu tu dau noi de it loi

1. `auth`: login, refresh, me, logout.
2. Base API client: `baseUrl`, JWT, response envelope `{ data, meta }`, error handler.
3. Read-only list/detail truoc: containers, manifests, yard slots, invoices, handovers.
4. Command API sau: gate-in, yard assign, billing confirm, gate pass, gate-out, handover publish/confirm.
5. Replace mock state theo module, khong xoa toan bo mock mot lan.
6. Them pagination/filter server-side cho danh sach lon.
7. Test smoke UI + API theo luong end-to-end.
