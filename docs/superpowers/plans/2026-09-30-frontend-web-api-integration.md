# Frontend Web API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đấu `apps/web` vào backend ICD hiện tại, giữ UI/UX từ mockup v1.7, bỏ thao tác mock gây hiểu nhầm.

**Architecture:** `AppContext` giữ vai trò orchestration: auth, bootstrap dữ liệu, command action, refresh state. `services/api/*` là lớp gọi backend. `services/mappers/*` chuyển JSON backend `{ data, meta }`, nested Prisma DTO, enum và nullable field sang view model trong `types.ts`.

**Tech Stack:** React 19, Vite 6, TypeScript 5.9, lucide-react, NestJS backend `http://localhost:3000/api`, Prisma/MySQL source of truth.

---

## 1. Phạm Vi Đã Đọc

### Nguồn UI/UX mockup
- `D:\Project\Đồ Án 4 +Mobile\ICD_Frontend_v1.7_Web_Mobile_updated\src\App.tsx`
- `D:\Project\Đồ Án 4 +Mobile\ICD_Frontend_v1.7_Web_Mobile_updated\src\types.ts`
- `D:\Project\Đồ Án 4 +Mobile\ICD_Frontend_v1.7_Web_Mobile_updated\src\context\AppContext.tsx`
- `D:\Project\Đồ Án 4 +Mobile\ICD_Frontend_v1.7_Web_Mobile_updated\src\data\mockData.ts`
- `D:\Project\Đồ Án 4 +Mobile\ICD_Frontend_v1.7_Web_Mobile_updated\src\components\*.tsx`

### App web thật cần đấu API
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\App.tsx`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\types.ts`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\context\AppContext.tsx`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\data\mockData.ts`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\components\*.tsx`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\*.ts`
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\mappers\*.ts`

### Backend đối chiếu
- `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\api\src\modules\**\*.controller.ts`
- API base: `http://localhost:3000/api`

---

## 2. Kết Luận Hiện Trạng

- UI web hiện tại trong `apps/web/src/components` đã có đủ file, không còn 0 byte.
- UI đang dùng `useApp()` rất rộng: phần lớn màn lấy state/action từ `AppContext`.
- `AppContext.tsx` vẫn đang chứa nhiều state mock và command local.
- API layer đã có một phần: auth, master data, containers, gate-in, yard, billing, gate-pass, partner handover, EDI.
- Mapper đã có một phần: envelope, pagination, container, yard, readiness, gate pass, handover.
- Thiếu service/mappers cho nhiều module UI: manifests, truck visits, movement orders, work queue, reports, audit, users/roles/permissions, notifications, operational holds, invoices/payments đầy đủ, tariff CRUD đầy đủ.
- Backend hiện có route cho các module thiếu trên, nên hướng chính là thêm frontend service/mapper, không sửa DB trước.

---

## 3. Bản Đồ Module UI Sang API

| UI file | State/action đang dùng | API cần đấu | Service hiện trạng |
|---|---|---|---|
| `DashboardView.tsx` | `containerVisits`, `truckVisits`, `yardSlots`, `serviceOrders`, `invoices`, `handovers`, `workQueue` | `GET /reports/summary`, `GET /containers/work-queue/stats`, list read-only fallback | Thiếu `reports.service.ts`, `work-queue.service.ts` |
| `WorkQueueView.tsx` | `workQueue`, `currentUser` | `GET /containers/work-queue`, `GET /containers/work-queue/stats` | Thiếu |
| `ManifestsView.tsx` | `manifests`, `addManifest`, `addMasterBl`, `addHouseBl`, `submitManifest`, `cancelManifest` | `GET/POST/PATCH /manifests`, `POST /manifests/:id/submit`, `POST /manifests/:id/cancel`, MBL/HBL CRUD | Thiếu |
| `ContainersView.tsx` | `containerVisits`, `holds`, container CRUD, hold create/release | `/containers`, `/containers/:id/events`, `/containers/:id/holds`, `/containers/:id/billing` | Có containers, thiếu holds/billing-readiness mapper |
| `MovementOrdersView.tsx` | `movementOrders`, `createMovementOrder`, `authorizeMovementOrder`, `cancelMovementOrder` | `/movement-orders`, `/containers/:visitId/movement-orders`, authorize/cancel | Thiếu |
| `TruckVisitsView.tsx` | `truckVisits`, `createTruckVisit`, `updateTruckVisitStatus` | `/gate/truck-visits`, arrive/cancel | Thiếu |
| `GateInView.tsx` | `containerVisits`, `truckVisits`, `gateInContainer` | `/containers/:visitId/gate-in-context`, `/containers/:visitId/gate-in`, `/containers/:visitId/reception` | Có |
| `YardView.tsx` | yard blocks/slots, recommendations, assign, movements, inspections, bookings | `/yard/*`, `/containers/:id/yard/*`, inspections/bookings commands | Có một phần, thiếu create/update block/slot và inspection/booking command đầy đủ |
| `BillingView.tsx` | tariffs, service orders, invoices, payments, create/confirm/cancel | `/admin/tariffs`, `/service-orders/*`, `/invoices/*`, `/payments/*` | Có một phần, thiếu invoices/payments/tariff CRUD mapper |
| `GatePassView.tsx` | readiness, gate pass issue/scan/cancel/gate-out | `/containers/:id/gate-pass/readiness`, `/containers/:id/gate-pass`, `/gate-pass/scan`, `/gate-out` | Có |
| `HandoversView.tsx` | handovers, warehouses, create/publish/confirm/dispute | `/handovers`, `/customer-warehouses`, `/containers/:id/handover-summary` | Có một phần |
| `PartnerManagementView.tsx` | partner clients/logs, create/rotate/revoke | `/admin/partner-clients`, `/admin/partner-api-logs` | Có list/create/rotate; cần revoke + mapper |
| `MasterDataView.tsx` | shipping lines, consignees, agents, transporters | `/admin/master-data/*` | Có list, thiếu create/update/activate/deactivate |
| `UsersRolesView.tsx` | managed users, roles, permissions | `/admin/users`, `/admin/roles`, `/admin/permissions` | Thiếu |
| `EDIView.tsx` | routes, outbox, alerts, retry/dispatch/ack/resolve | `/integrations/edi/*` | Có một phần, thiếu outbox retry/alert acknowledge/upsert route nếu UI cần |
| `ReportsView.tsx` | local aggregate | `/reports/*` | Thiếu |
| `AuditsView.tsx` | `auditLogs` | `/audit-logs`, `/audit-logs/request/:requestId`, `/audit-logs/entity/:type/:id` | Thiếu |
| `Header.tsx` | user, device mode, notifications | `/auth/me`, `/notifications/history`, read/read-all | Thiếu notifications |
| `MobileTerminalView.tsx` | gate-in, yard assign, gate-out, survey/inspection | tái dùng gate-in, yard, gate-pass, inspection APIs | Cần nối qua same actions trong `AppContext` |

---

## 4. JSON Mapping Rules

- Luôn đọc response qua `unwrapData`, `unwrapList`, `unwrapPage`.
- Backend envelope hợp lệ:
  - `{ data: T }`
  - `{ data: T[], meta: { total, page, limit } }`
  - raw DTO khi controller trả trực tiếp.
- Không đổi backend key chỉ để vừa UI. Mapper chịu trách nhiệm.
- Field tổng hợp tạo ở mapper:
  - `containerNumber` từ `dto.container.containerNumber` hoặc `dto.containerNumber`.
  - `shippingLine` từ `dto.houseBl.masterBl.manifest.shippingLine.name`.
  - `manifestNo`, `mblNumber`, `hblNumber` từ nested manifest/BL.
  - `yardLocation` từ `dto.currentSlot` hoặc `dto.yardLocation`.
  - `statusLabel` từ enum backend.
- Nullable MySQL phải có fallback:
  - string: `''` hoặc `undefined` theo type UI.
  - number: `0` khi dùng tính toán.
  - date: giữ ISO string, nếu null thì `undefined`.
  - array: `[]`.
- Enum normalize bắt buộc:
  - container state backend sang `ContainerState`.
  - gate pass status sang `GatePass['status']`.
  - handover status sang `HandoverStatus`.
  - truck visit status sang `TruckVisitStatus`.
  - movement order status sang `MovementOrderStatus`.
  - tariff status sang `TariffStatus`.

---

## 5. File Sẽ Tạo / Sửa

### Tạo service còn thiếu
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\health.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\manifests.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\movement-orders.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\truck-visits.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\work-queue.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\reports.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\audit.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\admin.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\notifications.service.ts`
- Create: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\operational-holds.service.ts`

### Sửa service đã có
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\billing.service.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\yard.service.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\edi.service.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\partner-handover.service.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\master-data.service.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\api\index.ts`

### Tạo/sửa mapper
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\mappers\api-response.mapper.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\mappers\icd-view.mapper.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\mappers\index.ts`
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\services\mappers\mappers.smoke.test.ts`

### Sửa orchestration
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\context\AppContext.tsx`
- Modify nếu type thiếu: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\types.ts`

### Chỉ sửa component khi cần binding UI
- Modify: `D:\Project\Đồ Án 4 +Mobile\icd-management\apps\web\src\components\*.tsx`
- Nguyên tắc: giữ layout/text/flow, chỉ sửa props/action payload/key/type.

---

## 6. Thứ Tự Triển Khai

### Task 1: Baseline và khóa UI hiện trạng

- [ ] Chạy `git status --short`.
- [ ] Chạy `pnpm --filter @icd/web typecheck`.
- [ ] Chạy `pnpm --filter @icd/web build`.
- [ ] Ghi lỗi baseline vào `D:\Project\Đồ Án 4 +Mobile\icd-management\test-artifacts\frontend-api-integration\baseline.md`.
- [ ] Không sửa lỗi ngoài phạm vi frontend API binding.

### Task 2: Auth, health, session

- [ ] Sửa `AppContext.tsx`: bỏ `isAuthenticated = true` mặc định ở runtime thật.
- [ ] Dùng `authService.login`, `authService.me`, `authService.logout`.
- [ ] Tạo `health.service.ts`: `GET /health`, `/health/live`, `/health/ready`.
- [ ] Header chỉ hiển thị API/MySQL online sau khi health trả `2xx`.
- [ ] Dev fallback chỉ bật khi `import.meta.env.DEV` và API lỗi.

### Task 3: Bootstrap read-only data

- [ ] Tạo hàm `loadInitialData()` trong `AppContext.tsx`.
- [ ] Load song song:
  - containers
  - work queue
  - manifests
  - truck visits
  - movement orders
  - yard blocks/slots/movements/inspections/bookings
  - tariffs/service orders/invoices/payments
  - gate passes khi có selected container
  - handovers/warehouses/partner clients/logs
  - master data
  - users/roles/permissions
  - EDI routes/outbox/alerts
  - reports summary
  - audit logs
  - notifications
- [ ] Mỗi list phải qua mapper, không đẩy DTO thẳng vào UI state.
- [ ] Nếu một module lỗi, chỉ module đó fallback mock trong dev; app không crash.

### Task 4: Container + holds + billing readiness

- [ ] Dùng `containersService.findAll/findById/getEvents/createVisit/updateVisit/cancelVisit`.
- [ ] Tạo `operational-holds.service.ts`:
  - `GET /containers/:visitId/holds`
  - `POST /containers/:visitId/holds`
  - `POST /containers/:visitId/holds/:holdId/release`
- [ ] Bổ sung billing readiness:
  - `GET /containers/:containerVisitId/billing`
- [ ] Mapper phải bảo đảm UI không hiện `undefined/null/NaN`.
- [ ] Sau create/update/cancel/hold/release: refresh container detail + list + work queue.

### Task 5: Manifest lifecycle

- [ ] Tạo `manifests.service.ts`:
  - `GET /manifests`
  - `GET /manifests/:manifestId`
  - `POST /manifests`
  - `PATCH /manifests/:manifestId`
  - `POST /manifests/:manifestId/submit`
  - `POST /manifests/:manifestId/cancel`
  - `GET/POST/PATCH/DELETE /manifests/:manifestId/master-bls`
  - `GET/POST/PATCH/DELETE /manifests/:manifestId/master-bls/:mblId/house-bls`
- [ ] Map `Manifest`, `MasterBl`, `HouseBl`.
- [ ] Sau submit/cancel: refresh manifests + containers nếu backend sinh container visits.

### Task 6: Truck visits + gate-in

- [ ] Tạo `truck-visits.service.ts`:
  - `GET /gate/truck-visits`
  - `GET /gate/truck-visits/:visitId`
  - `POST /gate/truck-visits`
  - `POST /gate/truck-visits/:visitId/arrive`
  - `POST /gate/truck-visits/:visitId/cancel`
- [ ] Giữ `gateInService` hiện có.
- [ ] `gateInContainer()` gọi `GET /gate-in-context` trước command nếu UI chưa có context.
- [ ] Sau gate-in: refresh containers, truck visits, yard slots, work queue.

### Task 7: Movement orders

- [ ] Tạo `movement-orders.service.ts`:
  - `GET /movement-orders`
  - `GET /movement-orders/:orderId`
  - `POST /containers/:visitId/movement-orders`
  - `PATCH /movement-orders/:orderId`
  - `POST /movement-orders/:orderId/authorize`
  - `POST /movement-orders/:orderId/cancel`
- [ ] Map `MovementOrderStatus`.
- [ ] Command action không dùng update status generic nếu backend có route command riêng.
- [ ] Sau authorize/cancel: refresh movement orders + container detail.

### Task 8: Yard operations

- [ ] Bổ sung `yard.service.ts`:
  - block create/update
  - slot create/update
  - `POST /containers/:visitId/yard/check`
  - `GET /containers/:visitId/yard/location`
  - inspection create/start/complete/cancel
  - booking create/start/complete/cancel
  - active summary
- [ ] `assignYardSlot()` gọi check/recommendation khi cần, sau đó assign.
- [ ] `createInspection/completeInspection` dùng route thật, không chỉ push state.
- [ ] Sau yard command: refresh yard slots, movements, inspections, bookings, container detail.

### Task 9: Billing, invoices, payments

- [ ] Bổ sung `billing.service.ts`:
  - `GET /admin/service-types`
  - tariff create/update/rules/activate/retire
  - service order recalculate/cancel/detail
  - `POST /service-orders/:serviceOrderId/invoice`
  - `GET /invoices`, `GET /invoices/:id`
  - `POST /invoices/:invoiceId/payments`
  - `GET /payments`, `GET /payments/:id`
- [ ] Map `Tariff`, `TariffRule`, `ServiceOrder`, `Invoice`, `Payment`.
- [ ] Sau confirm/payment: refresh billing list + gate pass readiness.

### Task 10: Gate pass + gate-out

- [ ] Giữ `gatePassService` hiện có.
- [ ] Bổ sung `GET /containers/:visitId/gate-passes` nếu UI cần lịch sử.
- [ ] `checkReadiness()` refresh holds/billing/handover summary khi API báo chưa đạt.
- [ ] `createGatePass()` chỉ gọi issue nếu readiness pass.
- [ ] `scanAndGateOut()` gọi scan trước, gate-out sau, rồi refresh containers/gate passes/work queue.

### Task 11: Partner handover

- [ ] Bổ sung revoke client trong `partner-handover.service.ts`.
- [ ] Internal web chỉ dùng:
  - `/handovers`
  - `/customer-warehouses`
  - `/admin/partner-clients`
  - `/admin/partner-api-logs`
  - `/containers/:visitId/handover-summary`
- [ ] Không dùng `/api/v1/external/*` trong browser.
- [ ] `partnerAcceptHandover`, `partnerStartTransit`, `partnerWarehouseReceived` giữ mock/dev hoặc ẩn khỏi web nội bộ nếu chỉ thuộc partner server-to-server.

### Task 12: Admin, RBAC, master data

- [ ] Tạo `admin.service.ts`:
  - `/admin/users`
  - `/admin/users/:userId`
  - activate/deactivate
  - `/admin/roles`
  - `/admin/permissions`
  - `/admin/settings`
- [ ] Bổ sung `master-data.service.ts` create/update/activate/deactivate cho shipping lines, consignees, clearing agents, transporters.
- [ ] Map `ManagedUser`, `Role`, `Permission`.
- [ ] Sidebar/role gating dùng `currentUser.permissions`, không hardcode admin.

### Task 13: EDI, reports, audit, notifications

- [ ] Bổ sung `edi.service.ts`:
  - route create/update nếu backend có.
  - `POST /integrations/edi/outbox/:id/retry`
  - `POST /integrations/edi/alerts/:id/acknowledge`
- [ ] Tạo `reports.service.ts` cho `/reports/*`.
- [ ] Tạo `audit.service.ts` cho `/audit-logs`.
- [ ] Tạo `notifications.service.ts` cho `/notifications/history`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- [ ] ReportsView ưu tiên backend report; nếu thiếu chart detail, dùng derived local từ API lists.

### Task 14: Mobile terminal web simulator

- [ ] Không tách API riêng nếu đang là web simulator.
- [ ] `MobileTerminalView.tsx` dùng cùng action trong `AppContext`.
- [ ] Gate-in form gửi payload đúng backend: truck, driver, seal, weight, condition.
- [ ] Yard assign form gửi slot ID thật, không chỉ slot code nếu backend yêu cầu ID.
- [ ] Survey/inspection form dùng inspection API.
- [ ] Gate-out form dùng gate pass scan/gate-out API.

### Task 15: Kiểm thử JSON/API

- [ ] Chạy mapper smoke test.
- [ ] Chạy `pnpm --filter @icd/web typecheck`.
- [ ] Chạy `pnpm --filter @icd/web build`.
- [ ] Chạy web: `pnpm --filter @icd/web dev`.
- [ ] Test API backend đang chạy:
  - login `admin@icd.local`
  - dashboard load không crash
  - 18 tab render
  - mỗi GET chính trả 2xx hoặc lỗi nghiệp vụ rõ
  - command thay đổi state rồi reload thấy đúng
- [ ] Ghi report vào `D:\Project\Đồ Án 4 +Mobile\icd-management\test-artifacts\frontend-api-integration\report.md`.

---

## 7. Thứ Tự Ưu Tiên Khi Làm Thật

1. Auth/session/health.
2. Read-only bootstrap đủ 18 tab.
3. Containers, gate-in, yard, gate-pass vì là core vận hành.
4. Billing/payment vì ảnh hưởng gate-pass readiness.
5. Handover/partner vì có nhiều trạng thái.
6. Admin/RBAC/master data.
7. Reports/audit/EDI/notifications.
8. Mobile simulator khớp lại action thật.

---

## 8. Tiêu Chí Duyệt Hoàn Thành

- `pnpm --filter @icd/web typecheck` pass.
- `pnpm --filter @icd/web build` pass.
- Không còn `isAuthenticated = true` trong runtime production.
- Không còn text health tĩnh kiểu `API Gateway 200 OK`, `MySQL Online` nếu chưa gọi health.
- Dashboard và 18 tab không crash.
- UI không lộ `undefined`, `null`, `NaN`.
- Mỗi module có report API `PASS/FAIL/BLOCKED`.
- Không sửa Prisma/MySQL trong lượt frontend binding, trừ khi có bằng chứng backend thiếu key bắt buộc và user duyệt riêng.

---

## 9. Rủi Ro Cần Chốt Trước Khi Code

- DB test có thể đổi trạng thái khi test full command.
- Một số flow partner external là server-to-server, không nên đấu trực tiếp trong browser nội bộ.
- Nếu backend trả slot ID khác slot code, UI phải đổi form chọn slot theo ID.
- Nếu `AppContext.tsx` tiếp tục phình to, nên tách hooks theo module sau khi binding ổn: `useContainers`, `useYard`, `useBilling`, nhưng không làm refactor lớn trước khi API pass.

