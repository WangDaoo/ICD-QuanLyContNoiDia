# Frontend API Smoke Report

Generated: 2026-09-23T14:56:09
Sample containerVisitId: 8b807f34-ef0b-4ad5-9e0f-e07da0f0570c

| Method | Path | OK | Status | Count | Detail |
|---|---|---:|---:|---:|---|
| GET | /containers | True | 200 | 10 | {"data":[{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744... |
| GET | /health/ready | True | 200 | 1 | {"data":{"status":"ok","service":"icd-api","database":"up","timestamp":"2026-09-23T07:54:39.749Z"}} |
| GET | /auth/me | True | 200 | 1 | {"data":{"id":"21876409-d622-47aa-b8de-392f06bc0189","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","sessionId":"e03e5b8... |
| GET | /admin/master-data/shipping-lines | True | 200 | 19 | {"data":[{"id":"27008df5-9993-4513-bd21-40769fce9061","name":"CMA CGM Group","scacCode":"CMDU","active":true,"createdAt"... |
| GET | /admin/master-data/consignees | True | 200 | 11 | {"data":[{"id":"64cce54c-d619-445d-bae9-cd4ee45e3cb9","name":"Công ty Cổ phần Sản xuất & Kinh doanh VinFast","taxCode":"... |
| GET | /admin/master-data/clearing-agents | True | 200 | 5 | {"data":[{"id":"dcb87876-976b-4771-b7fa-db3fd7881ade","name":"Đại lý Hải quan Quốc tế Việt Thịnh","licenseNo":"038877665... |
| GET | /admin/master-data/transporters | True | 200 | 6 | {"data":[{"id":"2df7e7da-d9fe-4700-9d7f-daccd3cf50ad","name":"Công ty CP Dịch vụ Vận tải Container Hoàng Long","taxCode"... |
| GET | /yard/blocks | True | 200 | 4 | {"data":[{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","blockCode":"A","na... |
| GET | /yard/slots | True | 200 | 48 | {"data":[{"id":"6b8862f0-d5ce-4c09-b16c-9692114a5852","yardBlock":{"id":"6f941473-8a97-4aae-b3f7-3f7fe53082cd","icdId":"... |
| GET | /yard/movements | True | 200 | 1 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| GET | /yard/inspections | True | 200 | 1 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| GET | /yard/bookings | True | 200 | 1 | {"data":{"items":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}}} |
| GET | /gate/truck-visits | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /movement-orders | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /admin/tariffs | True | 200 | 1 | {"data":[{"id":"95f86ecc-eaf6-4518-bb03-ec564c511e87","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","name":"Biểu phí ti... |
| GET | /service-orders | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /invoices | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /payments | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /integrations/edi/routes | True | 200 | 19 | {"data":[{"id":"5f58e56c-d5cb-44c9-b426-ff91a30d0bc3","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","shippingLineId":"2... |
| GET | /integrations/edi/outbox | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /integrations/edi/alerts | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /handovers | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /customer-warehouses | True | 200 | 3 | {"data":[{"id":"e24ab343-9e5c-46e9-b402-18e47db4f51f","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","consigneeId":"0153... |
| GET | /admin/partner-clients | True | 200 | 2 | {"data":[{"id":"51beff65-14e4-48ea-ab5c-a9b986301370","partnerCode":"VINATRANS_EXPRESS","partnerName":"Tổng Công ty Giao... |
| GET | /admin/partner-api-logs | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /audit-logs | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0}} |
| GET | /reports/summary | True | 200 | 1 | {"data":{"asOfAt":"2026-09-23T07:55:31.831Z","timeZone":"Asia/Ho_Chi_Minh","yard":{"inYardCount":9,"byCategory":{"IMPORT... |
| GET | /reports/yard-inventory/current | True | 200 | 1 | {"data":{"generatedAt":"2026-09-23T07:55:34.055Z","summary":{"occupiedSlots":9,"operationalSlots":48,"availableSlots":39... |
| GET | /reports/revenue | True | 200 | 1 | {"data":{"period":{"fromDate":"2026-09-01","toDate":"2026-09-23","timeZone":"Asia/Ho_Chi_Minh","groupBy":"DAY"},"summary... |
| GET | /notifications/history | True | 200 | 0 | {"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0,"unreadCount":0}} |
| GET | /admin/users | True | 200 | 11 | {"data":[{"id":"3e70fa36-3199-499b-9e71-8979d0d60e7a","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","name":"Công ty Sam... |
| GET | /admin/roles | True | 200 | 9 | {"data":[{"id":"31205f10-d33d-4216-9851-d5f500c722cb","code":"ADMIN","name":"Quản trị viên","description":"Quản trị hệ t... |
| GET | /admin/permissions | True | 200 | 56 | {"data":[{"id":"8668fa20-919c-40b0-ab1d-6e9c3bc58b36","code":"audit.read","name":"Xem nhật ký Audit","description":"Cho ... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c | True | 200 | 1 | {"data":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","icdId":"16174fea-a7cc-4f76-815e-db21684f86f6","containerId":"2744a... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/events | True | 200 | 0 | {"data":[]} |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-in-context | True | 200 | 1 | {"data":{"containerVisit":{"id":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","state":"IN_YARD","expectedSeal":"VOS-993821","gr... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/reception | False | 404 |  | Response status code does not indicate success: 404 (Not Found). |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/recommendations | False | 409 |  | Response status code does not indicate success: 409 (Conflict). |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/location | True | 200 | 1 | {"data":{"id":"a6935e08-4793-4a04-a103-0e6967a651d5","containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","startedA... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass/readiness | True | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","ready":false,"isReady":false,"blockers":["NO_BILLING... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/gate-pass | True | 200 | 0 | {"data":null} |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/handover-summary | True | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","handover":null}} |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/billing | True | 200 | 1 | {"data":{"containerVisitId":"8b807f34-ef0b-4ad5-9e0f-e07da0f0570c","isReady":false,"blockers":["UNBILLED_SERVICES"],"det... |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/holds | True | 200 | 0 | {"data":[]} |
| GET | /containers/8b807f34-ef0b-4ad5-9e0f-e07da0f0570c/yard/operations/active-summary | True | 200 | 1 | {"data":{"hasActiveOperations":false,"hasHoldInspection":false,"activeMovements":[],"activeInspections":[],"holdInspecti... |
