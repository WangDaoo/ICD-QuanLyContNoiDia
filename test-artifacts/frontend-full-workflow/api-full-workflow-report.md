# ICD Frontend/API Full Workflow Report

Generated: 2026-09-23T08:47:06.558Z
Base URL: http://localhost:3000/api

API total: 82
API ok: 78
API failed: 4
Workflow PASS: 5
Workflow FAIL: 1
Workflow BLOCKED: 1

## Workflow Notes

| Module | Step | Status | Detail |
|---|---|---:|---|
| Auth | Login admin | PASS | {"status":200,"user":"admin@icd.local"} |
| Read-only | Main GET API smoke | PASS | {"total":33,"failed":[]} |
| Movement Order | Create movement order | BLOCKED | {"status":409,"response":{"error":{"code":"CONTAINER_VISIT_INVALID_STATE","message":"Chỉ Container Visit ở trạng thái PENDING mới được tạo Movement Order."},"requestId":"5a37e037-49e0-44ba-b9d3-27921a20048c"}} |
| Yard | Recommendation/check/assign slot | FAIL | {"visitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","slotId":"6b8862f0-d5ce-4c09-b16c-9692114a5852","location":{"id":"a6935e08-4793-4a04-a103-0e6967a651d5","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","started... |
| Billing | Preview/create/confirm/invoice/payment | PASS | {"visitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","orderId":"703e0575-8e6f-45dc-9131-2cf5e802a838","invoiceId":"7d8d5006-2a0d-413f-ab55-b12ca71da6ad","billingReadiness":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0... |
| Gate-out | Issue/scan/gate-out | PASS | {"visitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","gatePassId":"6c623a07-1873-466e-b87f-0d2bfb7a3bfb","status":201,"response":{"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","containerNumber":"VSCU6748... |
| Handover | Create/publish/external accept/transit/received/internal confirm | PASS | {"handoverId":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","partnerClientId":"d97a5658-003f-4bc6-be72-80aac53ae43f","confirmStatus":201,"response":{"data":{"id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","containerVisitId":"8b807f... |

## API Calls

| Module | Method | Path | Result | Status | Count | Detail |
|---|---|---|---:|---:|---:|---|
| Auth | POST | /auth/login | PASS | 200 | 1 | {"data":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMTg3NjQwOS1kNjIyLTQ3YWEtYjhkZS0zOTJmMDZiYzAxODkiLCJzaWQiOiI2MDZmMmQ0MS0zZGMwLTQ5ZTAtOTh... |
| Server | GET | /health/ready | PASS | 200 | 1 | {"data":{"status":"ok","service":"icd-api","database":"up","timestamp":"2026-09-23T08:47:01.870Z"}} |
| Auth | GET | /auth/me | PASS | 200 | 1 | {"data":{"id":"21876409-d622-47aa-b8de-392f06bc0189","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","sessionId":"606f2d41-3dc0-49e0-98d4-e67b5fab6c35","name":"S... |
| Container | GET | /containers?pageSize=100 | PASS | 200 | 10 | {"data":[{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744ab02-6930-4061-b5b0-c5c1fc16fe67","manif... |
| Master Data | GET | /admin/master-data/shipping-lines | PASS | 200 | 19 | {"data":[{"id":"27008df5-9993-4513-bd21-40769fce9061","name":"CMA CGM Group","scacCode":"CMDU","active":true,"createdAt":"2026-09-22T06:56:39.204Z","updatedAt":... |
| Master Data | GET | /admin/master-data/consignees | PASS | 200 | 11 | {"data":[{"id":"64cce54c-d619-445d-bae9-cd4ee45e3cb9","name":"Công ty Cổ phần Sản xuất & Kinh doanh VinFast","taxCode":"0801234567","phone":"02253999888","email... |
| Master Data | GET | /admin/master-data/clearing-agents | PASS | 200 | 5 | {"data":[{"id":"dcb87876-976b-4771-b7fa-db3fd7881ade","name":"Đại lý Hải quan Quốc tế Việt Thịnh","licenseNo":"0388776655","active":true,"createdAt":"2026-09-22... |
| Master Data | GET | /admin/master-data/transporters | PASS | 200 | 6 | {"data":[{"id":"2df7e7da-d9fe-4700-9d7f-daccd3cf50ad","name":"Công ty CP Dịch vụ Vận tải Container Hoàng Long","taxCode":"0355443322","active":true,"createdAt":... |
| Yard | GET | /yard/blocks | PASS | 200 | 4 | {"data":[{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","blockCode":"A","name":"Khu A — Hàng khô Dry Cargo","operat... |
| Yard | GET | /yard/slots?pageSize=200 | PASS | 200 | 48 | {"data":[{"id":"6b8862f0-d5ce-4c09-b16c-9692114a5852","yardBlock":{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","b... |
| Yard | GET | /yard/movements | PASS | 200 | 0 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| Yard | GET | /yard/inspections | PASS | 200 | 0 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| Yard | GET | /yard/bookings | PASS | 200 | 0 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| Truck Visit | GET | /gate/truck-visits | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Movement Order | GET | /movement-orders | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Billing | GET | /admin/tariffs | PASS | 200 | 1 | {"data":[{"id":"95f86ecc-eaf6-4518-bb03-ec564c511e87","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","name":"Biểu phí tiêu chuẩn ICD 2026","status":"ACTIVE","ef... |
| Billing | GET | /service-orders | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Billing | GET | /invoices | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Billing | GET | /payments | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Gate/Handover | GET | /handovers | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Gate/Handover | GET | /customer-warehouses | PASS | 200 | 3 | {"data":[{"id":"e24ab343-9e5c-46e9-b402-18e47db4f51f","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","consigneeId":"0153cd3f-f30f-4896-9388-1528d3462266","code"... |
| Partner | GET | /admin/partner-clients | PASS | 200 | 2 | {"data":[{"id":"51beff65-14e4-48ea-ab5c-a9b986301370","partnerCode":"VINATRANS_EXPRESS","partnerName":"Tổng Công ty Giao nhận Kho vận VinaTrans","keyLast4":"3F8... |
| Partner | GET | /admin/partner-api-logs | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| EDI | GET | /integrations/edi/routes | PASS | 200 | 19 | {"data":[{"id":"5f58e56c-d5cb-44c9-b426-ff91a30d0bc3","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","shippingLineId":"27008df5-9993-4513-bd21-40769fce9061","en... |
| EDI | GET | /integrations/edi/outbox | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| EDI | GET | /integrations/edi/alerts | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Reports | GET | /reports/summary | PASS | 200 | 1 | {"data":{"asOfAt":"2026-09-23T08:47:02.825Z","timeZone":"Asia/Ho_Chi_Minh","yard":{"inYardCount":9,"byCategory":{"IMPORT":9},"byHoldStatus":{"NONE":9},"byContai... |
| Reports | GET | /reports/yard-inventory/current | PASS | 200 | 1 | {"data":{"generatedAt":"2026-09-23T08:47:02.967Z","summary":{"occupiedSlots":9,"operationalSlots":48,"availableSlots":39,"occupancyRate":0.1875},"byBlock":[{"bl... |
| Reports | GET | /reports/revenue | PASS | 200 | 1 | {"data":{"period":{"fromDate":"2026-09-01","toDate":"2026-09-23","timeZone":"Asia/Ho_Chi_Minh","groupBy":"DAY"},"summary":{"totalRevenue":0,"allocationCount":0}... |
| Notifications | GET | /notifications/history | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0,"unreadCount":0}} |
| Admin | GET | /admin/users | PASS | 200 | 11 | {"data":[{"id":"3e70fa36-3199-499b-9e71-8979d0d60e7a","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","name":"Công ty Samsung SEVT","email":"consignee@icd.local"... |
| Admin | GET | /admin/roles | PASS | 200 | 9 | {"data":[{"id":"31205f10-d33d-4216-9851-d5f500c722cb","code":"ADMIN","name":"Quản trị viên","description":"Quản trị hệ thống, người dùng, cấu hình, tích hợp và ... |
| Admin | GET | /admin/permissions | PASS | 200 | 56 | {"data":[{"id":"8668fa20-919c-40b0-ab1d-6e9c3bc58b36","code":"audit.read","name":"Xem nhật ký Audit","description":"Cho phép xem lịch sử thay đổi và truy vết re... |
| Audit | GET | /audit-logs | PASS | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| Container | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c | PASS | 200 | 1 | {"data":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744ab02-6930-4061-b5b0-c5c1fc16fe67","manife... |
| Container | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/events | PASS | 200 | 0 | {"data":[]} |
| Gate-in | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-in-context | PASS | 200 | 1 | {"data":{"containerVisit":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","state":"IN_YARD","expectedSeal":"VOS-993821","grossWeight":"29500","gateInAt":"2026-09-2... |
| Gate-in | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/reception | FAIL | 404 |  | {"error":{"code":"CONTAINER_VISIT_NOT_FOUND","message":"Chưa có bản ghi tiếp nhận cho Container Visit này."},"requestId":"f342c647-b821-402b-a52e-f44af363b181"} |
| Yard | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/location | PASS | 200 | 1 | {"data":{"id":"a6935e08-4793-4a04-a103-0e6967a651d5","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","startedAt":"2026-09-22T08:17:36.728Z","endedAt":... |
| Gate Pass | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass/readiness | PASS | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","ready":false,"isReady":false,"blockers":["NO_BILLING","UNBILLED_SERVICES"],"details":{"conta... |
| Gate Pass | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass | PASS | 200 | 0 | {"data":null} |
| Handover | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/handover-summary | PASS | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","handover":null}} |
| Billing | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/billing | PASS | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","isReady":false,"blockers":["UNBILLED_SERVICES"],"details":{"pendingOrders":[],"unpaidInvoice... |
| Holds | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/holds | PASS | 200 | 0 | {"data":[]} |
| Yard | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/operations/active-summary | PASS | 200 | 1 | {"data":{"hasActiveOperations":false,"hasHoldInspection":false,"activeMovements":[],"activeInspections":[],"holdInspections":[],"activeBookings":[]}} |
| Movement Order | POST | /containers/b765de88-beea-4ada-a0f4-cbfd07a19a1c/movement-orders | FAIL | 409 |  | {"error":{"code":"CONTAINER_VISIT_INVALID_STATE","message":"Chỉ Container Visit ở trạng thái PENDING mới được tạo Movement Order."},"requestId":"5a37e037-49e0-4... |
| Container | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c | PASS | 200 | 1 | {"data":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744ab02-6930-4061-b5b0-c5c1fc16fe67","manife... |
| Yard | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/recommendations | FAIL | 409 |  | {"error":{"code":"YARD_LOCATION_ALREADY_ASSIGNED","message":"Container đã có vị trí bãi hiện tại."},"requestId":"10ae6576-805a-4b87-946a-8005df323407"} |
| Yard | GET | /yard/slots?pageSize=200 | PASS | 200 | 48 | {"data":[{"id":"6b8862f0-d5ce-4c09-b16c-9692114a5852","yardBlock":{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","b... |
| Yard | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/check | PASS | 201 | 1 | {"data":{"yardSlot":{"id":"6b8862f0-d5ce-4c09-b16c-9692114a5852","slotCode":"A-01-01-1","blockCode":"A","rowNo":"1","bayNo":"1","tierNo":"1"},"eligible":false,"... |
| Yard | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/assign | FAIL | 409 |  | {"error":{"code":"YARD_ASSIGNMENT_BLOCKED","message":"Không thể xếp container vào Yard Slot đã chọn.","details":{"blockers":[{"code":"YARD_LOCATION_ALREADY_ASSI... |
| Yard | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/location | PASS | 200 | 1 | {"data":{"id":"a6935e08-4793-4a04-a103-0e6967a651d5","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","startedAt":"2026-09-22T08:17:36.728Z","endedAt":... |
| Yard | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/inspections | PASS | 201 | 1 | {"data":{"id":"a5912f33-9cde-4bd3-b966-d6d067e17313","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","inspectionType":"DAMAGE_CHECK","status":"PENDING... |
| Yard | POST | /inspections/a5912f33-9cde-4bd3-b966-d6d067e17313/start | PASS | 201 | 1 | {"data":{"id":"a5912f33-9cde-4bd3-b966-d6d067e17313","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","inspectionType":"DAMAGE_CHECK","status":"IN_PROG... |
| Yard | POST | /inspections/a5912f33-9cde-4bd3-b966-d6d067e17313/complete | PASS | 201 | 1 | {"data":{"id":"a5912f33-9cde-4bd3-b966-d6d067e17313","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","inspectionType":"DAMAGE_CHECK","status":"COMPLET... |
| Yard | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard-bookings | PASS | 201 | 1 | {"data":{"id":"ed263d12-1703-42bc-9435-f3e53542acd9","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","bookingType":"INSPECTION","status":"PENDING","sc... |
| Yard | POST | /yard/bookings/ed263d12-1703-42bc-9435-f3e53542acd9/start | PASS | 201 | 1 | {"data":{"id":"ed263d12-1703-42bc-9435-f3e53542acd9","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","bookingType":"INSPECTION","status":"IN_PROGRESS"... |
| Yard | POST | /yard/bookings/ed263d12-1703-42bc-9435-f3e53542acd9/complete | PASS | 201 | 1 | {"data":{"id":"ed263d12-1703-42bc-9435-f3e53542acd9","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","bookingType":"INSPECTION","status":"COMPLETED","... |
| Yard | GET | /yard/slots?pageSize=200 | PASS | 200 | 48 | {"data":[{"id":"6b8862f0-d5ce-4c09-b16c-9692114a5852","yardBlock":{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","b... |
| Billing | POST | /service-orders/preview | PASS | 201 | 3 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","containerNumber":"VSCU6748392","size":"SIZE_40","type":"DRY","consigneeId":"da7cf9b2-cea1-46... |
| Billing | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/service-orders | PASS | 201 | 3 | {"data":{"id":"703e0575-8e6f-45dc-9131-2cf5e802a838","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","orderNumber":"SO-20260923-8F28CAC97F16","containerVisitId":... |
| Billing | POST | /service-orders/703e0575-8e6f-45dc-9131-2cf5e802a838/confirm | PASS | 201 | 3 | {"data":{"id":"703e0575-8e6f-45dc-9131-2cf5e802a838","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","orderNumber":"SO-20260923-8F28CAC97F16","containerVisitId":... |
| Billing | POST | /service-orders/703e0575-8e6f-45dc-9131-2cf5e802a838/invoice | PASS | 201 | 1 | {"data":{"id":"7d8d5006-2a0d-413f-ab55-b12ca71da6ad","invoiceNo":"INV-20260923-780976B25D","serviceOrderId":"703e0575-8e6f-45dc-9131-2cf5e802a838","issuedAt":"2... |
| Billing | POST | /invoices/7d8d5006-2a0d-413f-ab55-b12ca71da6ad/payments | PASS | 201 | 1 | {"data":{"id":"7fa4bf02-c34c-4fd6-92cf-97ba7963479b","paymentRef":"FW-1790153224966","consigneeId":"da7cf9b2-cea1-4645-b8c8-b0e9ae529701","amount":946000,"alloc... |
| Billing | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/billing | PASS | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","isReady":true,"blockers":[],"details":{"pendingOrders":[],"unpaidInvoices":[],"unbilledServi... |
| Gate Pass | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass/readiness | PASS | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","ready":true,"isReady":true,"blockers":[],"details":{"containerStatus":"IN_YARD","yardLocatio... |
| Gate Pass | POST | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass | PASS | 201 | 1 | {"data":{"id":"6c623a07-1873-466e-b87f-0d2bfb7a3bfb","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","code":"GP-MUDV0CY0-96F564","status":"ACTIVE","is... |
| Gate Pass | POST | /gate-pass/scan | PASS | 201 | 1 | {"data":{"gatePass":{"id":"6c623a07-1873-466e-b87f-0d2bfb7a3bfb","code":"GP-MUDV0CY0-96F564","status":"ACTIVE","issuedAt":"2026-09-23T08:47:05.282Z","expiresAt"... |
| Gate-out | POST | /gate-out | PASS | 201 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","containerNumber":"VSCU6748392","gatePassId":"6c623a07-1873-466e-b87f-0d2bfb7a3bfb","gatePass... |
| Container | GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c | PASS | 200 | 1 | {"data":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744ab02-6930-4061-b5b0-c5c1fc16fe67","manife... |
| Partner | POST | /admin/partner-clients | PASS | 201 | 1 | {"data":{"client":{"id":"d97a5658-003f-4bc6-be72-80aac53ae43f","partnerCode":"FW_1790153225738","partnerName":"Full Workflow Partner","keyLast4":"0bd4","status"... |
| Handover | POST | /handovers | PASS | 201 | 1 | {"data":{"id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","partnerApiClientId":"d97a5658-003f-4bc6-be72-80a... |
| Handover | POST | /handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4/publish | PASS | 201 | 1 | {"data":{"id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","partnerApiClientId":"d97a5658-003f-4bc6-be72-80a... |
| External Handover | GET | /v1/external/handovers | PASS | 200 | 1 | {"data":[{"handover_id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","transport_code":"FW-TR-1790153225787","container_code":"VSCU6748392","container_type":"DRY","sta... |
| External Handover | POST | /v1/external/handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4/accept | PASS | 201 | 1 | {"data":{"handover_id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","transport_code":"FW-TR-1790153225787","status":"PARTNER_ACCEPTED","partner_accepted_at":"2026-09-... |
| External Handover | POST | /v1/external/handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4/in-transit | PASS | 201 | 1 | {"data":{"handover_id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","transport_code":"FW-TR-1790153225787","status":"IN_TRANSIT","departed_at":"2026-09-23T08:47:06.06... |
| External Handover | POST | /v1/external/handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4/warehouse-received | PASS | 201 | 1 | {"data":{"handover_id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","transport_code":"FW-TR-1790153225787","status":"PARTNER_CONFIRMED","partner_confirmed_at":"2026-0... |
| Handover | POST | /handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4/icd-confirm | PASS | 201 | 1 | {"data":{"id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","partnerApiClientId":"d97a5658-003f-4bc6-be72-80a... |
| Handover | GET | /handovers/c41b4aa3-d6bc-4db6-bd13-fac705c71bc4 | PASS | 200 | 1 | {"data":{"id":"c41b4aa3-d6bc-4db6-bd13-fac705c71bc4","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","partnerApiClientId":"d97a5658-003f-4bc6-be72-80a... |
| Reports | GET | /reports/summary | PASS | 200 | 1 | {"data":{"asOfAt":"2026-09-23T08:47:06.415Z","timeZone":"Asia/Ho_Chi_Minh","yard":{"inYardCount":8,"byCategory":{"IMPORT":8},"byHoldStatus":{"NONE":8},"byContai... |
| Audit | GET | /audit-logs | PASS | 200 | 1 | {"data":[{"id":"55e4e0f1-5f3c-464c-90a0-01ae8ad8deb3","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","actorUserId":"21876409-d622-47aa-b8de-392f06bc0189","actio... |
| Partner | GET | /admin/partner-api-logs | PASS | 200 | 4 | {"data":[{"id":"d20ba1fe-dd06-43a9-88be-387c310b13d5","partnerApiClientId":"d97a5658-003f-4bc6-be72-80aac53ae43f","transportHandoverId":"c41b4aa3-d6bc-4db6-bd13... |
