# ICD Mobile Screens, Role Matrix, And Business Flow

## 1. Mục Tiêu

Tài liệu này tổng hợp chi tiết toàn bộ giao diện mobile ICD theo nghiệp vụ v1.7 và code hiện tại trong `apps/mobile`.

Mobile là ứng dụng tác nghiệp hiện trường, không phải Web Admin thu nhỏ.

- Gate Staff dùng để gate-in/gate-out.
- Yard Staff dùng để xếp bãi, di chuyển, inspection, booking.
- Agent/Consignee dùng để tra cứu.
- Operator/Manager dùng để điều phối, giám sát.
- Admin có thể thấy toàn bộ nhưng cấu hình hệ thống vẫn ở Web.

Mobile chỉ gọi ICD internal API bằng JWT/RBAC. Mobile không lưu Partner API Key và không gọi `/api/v1/external/*`.

---

## 2. Tổng Số Giao Diện

### 2.1 Màn chính hiện tại

Hiện app mobile có 13 màn nghiệp vụ chính:

| STT | Màn | Module | File hiện tại |
|---:|---|---|---|
| 1 | Login | Auth | `apps/mobile/src/features/auth/screens/LoginScreen.tsx` |
| 2 | Work Queue | Work Queue | `apps/mobile/src/features/work-queue/screens/WorkQueueScreen.tsx` |
| 3 | Gate-in Scan | Gate-in | `apps/mobile/src/features/gate-in/screens/GateInScanScreen.tsx` |
| 4 | Gate-in Form | Gate-in | `apps/mobile/src/features/gate-in/screens/GateInFormScreen.tsx` |
| 5 | Gate-in Success | Gate-in | `apps/mobile/src/features/gate-in/screens/GateInSuccessScreen.tsx` |
| 6 | Gate Pass Scan | Gate-out | `apps/mobile/src/features/gate-out/screens/GatePassScanScreen.tsx` |
| 7 | Gate-out Confirm | Gate-out | `apps/mobile/src/features/gate-out/screens/GateOutConfirmScreen.tsx` |
| 8 | Container Search | Container | `apps/mobile/src/features/containers/screens/ContainerSearchScreen.tsx` |
| 9 | Container Detail | Container | `apps/mobile/src/features/containers/screens/ContainerDetailScreen.tsx` |
| 10 | Yard Assignment | Yard | `apps/mobile/src/features/yard/screens/YardAssignmentScreen.tsx` |
| 11 | Yard Operation Detail | Yard | `apps/mobile/src/features/yard/screens/YardOperationDetailScreen.tsx` |
| 12 | Notifications | Notification | `apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx` |
| 13 | More / Account | Account | `apps/mobile/src/features/more/screens/MoreScreen.tsx` |

### 2.2 Màn kỹ thuật

| STT | Màn | Mục đích | File hiện tại |
|---:|---|---|---|
| 14 | Forbidden | Chặn user không có quyền mở nghiệp vụ | `apps/mobile/src/components/ForbiddenScreen.tsx` |

### 2.3 Màn phụ / modal / bottom sheet / state

Nếu làm đủ nghiệp vụ hiện trường, cần khoảng 43 màn phụ/trạng thái:

- Auth: 5
- Work Queue: 7
- Gate-in: 14
- Gate-out: 15
- Container: 14
- Yard Assignment: 10
- Yard Operation: 16
- Notifications: 7
- More / Account: 7
- Handover summary: 5

Một số màn phụ có thể là bottom sheet/modal thay vì route riêng.

---

## 3. Role Và Phạm Vi Mobile

| Role | Phạm vi mobile | Nguyên tắc |
|---|---|---|
| `ADMIN` | Toàn bộ màn chính | Có quyền rộng, nhưng không cấu hình hệ thống sâu trên mobile |
| `MANAGER` | Giám sát, xem Work Queue, Container, trạng thái Gate/Yard | Ưu tiên read-only, chỉ thao tác nếu được cấp permission |
| `OPERATOR` | Điều phối Gate + Yard + Container | Có thể xử lý nhiều workflow vận hành |
| `GATE_STAFF` | Gate-in, Gate-out, tra cứu container | Không xử lý yard nếu không có quyền |
| `YARD_STAFF` | Yard assignment, yard operations, tra cứu container | Không gate-in/gate-out nếu không có quyền |
| `AGENT` | Tra cứu container được cấp quyền | Read-only |
| `CONSIGNEE` | Tra cứu container của mình, nhận thông báo | Read-only |

---

## 4. Navigation Theo Role

### 4.1 ADMIN

Tab nên thấy:

- Work Queue
- Gate
- Yard
- Notifications
- More

Màn truy cập:

- Login
- Work Queue
- Gate-in Scan
- Gate-in Form
- Gate-in Success
- Gate Pass Scan
- Gate-out Confirm
- Container Search
- Container Detail
- Yard Assignment
- Yard Operation Detail
- Notifications
- More

Nghiệp vụ:

- Xem toàn bộ task.
- Xử lý gate nếu cần.
- Xử lý yard nếu cần.
- Tra cứu container.
- Xem role/permission trong More.

Không nên làm trên mobile:

- Quản lý user/role.
- Cấu hình tariff/billing.
- Quản lý Partner API Key.
- Cấu hình hệ thống.

### 4.2 MANAGER

Tab nên thấy:

- Work Queue
- Tra cứu
- Notifications
- More
- Gate/Yard chỉ hiện nếu manager có permission vận hành.

Màn truy cập mặc định:

- Work Queue
- Container Search
- Container Detail
- Notifications
- More

Nghiệp vụ:

- Theo dõi task quá hạn.
- Xem trạng thái container.
- Xem blocker: hold, billing, gate pass, yard operation.
- Xem readiness trước gate-out.
- Xem handover summary read-only.

Không nên làm nếu không có permission:

- Submit gate-in.
- Submit gate-out.
- Assign yard slot.
- Complete movement/inspection/booking.

### 4.3 OPERATOR

Tab nên thấy:

- Work Queue
- Gate
- Yard
- Notifications
- More

Màn truy cập:

- Work Queue
- Gate-in Scan/Form/Success
- Gate Pass Scan/Gate-out Confirm
- Container Search/Detail
- Yard Assignment
- Yard Operation Detail
- Notifications
- More

Nghiệp vụ:

- Điều phối task.
- Xem container đang mắc ở bước nào.
- Gọi luồng gate hoặc yard theo task.
- Kiểm tra blocker trước khi chuyển luồng.
- Xem handover summary read-only.

### 4.4 GATE_STAFF

Tab nên thấy:

- Work Queue
- Gate
- Tra cứu
- Notifications
- More

Màn truy cập:

- Work Queue
- Gate-in Scan
- Gate-in Form
- Gate-in Success
- Gate Pass Scan
- Gate-out Confirm
- Container Search
- Container Detail
- Notifications
- More

Không nên thấy:

- Yard Assignment
- Yard Operation Detail
- Billing/Admin/Partner.

Nghiệp vụ:

- Scan/nhập số container gate-in.
- Kiểm tra gate-in context.
- Nhập seal, weight, biển số, tài xế, tình trạng container.
- Chụp ảnh seal/tình trạng nếu nghiệp vụ yêu cầu.
- Submit gate-in.
- Scan QR Gate Pass.
- Xem readiness và blocker.
- Xác nhận gate-out bằng thao tác chắc chắn, ví dụ long press.

Không được phép:

- Bypass readiness blocker.
- Tự release hold.
- Tự xác nhận billing.
- Tự sửa yard slot.

### 4.5 YARD_STAFF

Tab nên thấy:

- Work Queue
- Yard
- Notifications
- More

Màn truy cập:

- Work Queue
- Container Search
- Container Detail
- Yard Assignment
- Yard Operation Detail
- Notifications
- More

Không nên thấy:

- Gate-in Form.
- Gate-out Confirm.
- Billing/Admin/Partner.

Nghiệp vụ:

- Nhận task `YARD_ASSIGN`.
- Xem recommendation slot.
- Xem lý do đề xuất slot.
- Chọn slot và assign container.
- Nhận task `YARD_OPERATIONS`.
- Start/complete/cancel movement.
- Start/complete/cancel inspection.
- Start/complete/cancel booking.
- Ghi kết quả inspection/stripping/stuffing.

Không được phép:

- Gate-in/gate-out nếu không có permission.
- Tạo Gate Pass.
- Xác nhận thanh toán.

### 4.6 AGENT

Tab nên thấy:

- Tra cứu
- Notifications
- More

Màn truy cập:

- Container Search
- Container Detail
- Notifications
- More

Nghiệp vụ:

- Tra cứu container được cấp quyền.
- Xem manifest/basic status nếu có quyền.
- Xem hold/hải quan nếu có quyền.
- Nhận thông báo liên quan.

Không được phép:

- Gate-in.
- Gate-out.
- Assign yard.
- Movement/inspection/booking.
- Billing command.

### 4.7 CONSIGNEE

Tab nên thấy:

- Tra cứu
- Notifications
- More

Màn truy cập:

- Container Search
- Container Detail
- Notifications
- More

Nghiệp vụ:

- Xem container của mình.
- Xem trạng thái: pending, authorized, in yard, gate pass issued, exited.
- Xem vị trí yard ở mức thông tin.
- Xem billing/readiness summary ở mức thông tin.
- Xem handover summary read-only nếu backend trả.
- Nhận thông báo Gate Pass sắp hết hạn, Gate-out thành công.

Không được phép:

- Thao tác hiện trường.
- Sửa manifest/container.
- Release hold.
- Xác nhận gate-out.

---

## 5. Chi Tiết Màn Chính Và Màn Phụ

## 5.1 Auth

### Login

Mục đích:

- Đăng nhập bằng email/password.
- Nhận access token, refresh token.
- Nhận `roleCodes`, `permissionCodes`.
- Điều hướng vào app theo role.

API:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/refresh
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Quên mật khẩu | Screen/modal | Gửi yêu cầu reset |
| Đổi mật khẩu lần đầu | Screen | Bắt buộc user đổi password |
| Session expired | Modal | Token hết hạn, yêu cầu login lại |
| Forbidden | Screen | Không đủ quyền |
| Logout confirm | Modal | Xác nhận đăng xuất |

State cần có:

- Loading login.
- Login failed.
- Network error.
- Token expired.

---

## 5.2 Work Queue

### Work Queue

Mục đích:

- Hiển thị việc cần làm ngay theo role.
- Lọc task theo quyền user.
- Điều hướng task đến đúng luồng xử lý.

Task types:

```text
GATE_IN
YARD_ASSIGN
YARD_OPERATIONS
BILLING
GATE_OUT
HANDOVER_REVIEW
```

API đúng theo spec/backend:

```text
GET /api/containers/work-queue
GET /api/containers/work-queue/stats
```

Ghi chú code hiện tại:

```text
apps/mobile/src/features/work-queue/screens/WorkQueueScreen.tsx
```

Đang cần sửa endpoint nếu còn gọi `/work-queue`.

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Filter task type | Bottom sheet | Lọc Gate/Yard/Gate-out |
| Filter urgency | Bottom sheet | Lọc Overdue/High/Medium/Normal |
| Task detail preview | Bottom sheet | Xem nhanh trước khi mở |
| Empty state | Inline state | Không có task |
| Error retry state | Inline state | API lỗi |
| Pull-to-refresh loading | Inline state | Refresh task |
| Task navigation failed | Modal | Không mở được do thiếu quyền/deleted task |

Điều hướng:

| Task | Role chính | Điều hướng |
|---|---|---|
| `GATE_IN` | `GATE_STAFF`, `OPERATOR` | Gate-in Form/Scan |
| `YARD_ASSIGN` | `YARD_STAFF`, `OPERATOR` | Yard Assignment |
| `YARD_OPERATIONS` | `YARD_STAFF`, `OPERATOR` | Yard Operation Detail |
| `GATE_OUT` | `GATE_STAFF`, `OPERATOR` | Gate Pass Scan |
| `BILLING` | `MANAGER`, `ADMIN` | Mobile chỉ nên xem blocker, xử lý trên Web |
| `HANDOVER_REVIEW` | `MANAGER`, `OPERATOR` | Mobile chỉ xem summary |

---

## 5.3 Gate-in

### Gate-in Scan

Mục đích:

- Scan barcode/QR hoặc nhập tay số container.
- Tìm container đủ điều kiện tiếp nhận vào cổng.

API:

```text
GET /api/containers?search={containerNo}&limit=10
GET /api/containers/:visitId/gate-in-context
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Nhập tay container | Inline input | Fallback khi camera lỗi |
| Camera permission denied | State | Hướng dẫn cấp quyền |
| Scan failed | Toast/modal | QR/barcode không hợp lệ |
| Container search result | List/bottom sheet | Chọn container đúng |
| Gate-in context checklist | Bottom sheet | Xem điều kiện trước form |

### Gate-in Form

Mục đích:

- Nhập dữ liệu tiếp nhận thực tế.
- Xác nhận container chính thức vào ICD/Yard.

Trường chính:

- Container number.
- Actual seal.
- Actual weight.
- Vehicle plate.
- Driver name.
- Driver phone.
- Transporter.
- Condition notes.
- Photos.

API:

```text
POST /api/containers/:visitId/gate-in
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Movement order status | Inline panel | Xem lệnh vận chuyển liên quan |
| Truck visit info | Inline panel | Xem xe/tài xế |
| Seal photo capture | Camera modal | Chụp seal |
| Container condition photo capture | Camera modal | Chụp tình trạng vỏ |
| Weight/seal mismatch warning | Modal | Cảnh báo lệch manifest |
| Confirm gate-in | Confirm modal | Tránh submit nhầm |
| Gate-in blocker detail | Bottom sheet | Lý do không được gate-in |
| Gate-in API failed retry | Modal/state | Retry khi API lỗi |

### Gate-in Success

Mục đích:

- Xác nhận gate-in thành công.
- Hiển thị bước tiếp theo.

Thông tin:

- Container number.
- Received at.
- Vehicle plate.
- Yard position hiện tại.
- Gợi ý tạo/chuyển sang task xếp bãi nếu chưa có vị trí.

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Create yard assign task suggestion | CTA/card | Gợi ý chuyển sang Yard Assign |
| View container detail | CTA | Mở Container Detail |
| Back to Work Queue | CTA | Quay về danh sách việc |

---

## 5.4 Gate-out

### Gate Pass Scan

Mục đích:

- Scan QR Gate Pass hoặc nhập tay mã gate pass.
- Backend kiểm tra gate pass và readiness.

API:

```text
POST /api/gate-pass/scan
GET  /api/containers/:visitId/gate-pass/readiness
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Nhập tay mã Gate Pass | Inline input | Fallback khi QR lỗi |
| Camera permission denied | State | Hướng dẫn cấp quyền |
| QR invalid | Modal | QR không đúng format |
| Gate pass readiness detail | Bottom sheet | Xem checklist |
| Blocker list | Bottom sheet | Danh sách blocker |
| Hold blocker detail | Detail panel | Hold đang active |
| Billing blocker detail | Detail panel | Chưa thanh toán |
| Active yard operation blocker detail | Detail panel | Movement/inspection/booking active |
| Gate pass expired | Error state | Phiếu hết hạn |
| Gate pass cancelled | Error state | Phiếu bị hủy |
| Gate pass already used | Error state | Phiếu đã dùng |

### Gate-out Confirm

Mục đích:

- Nhân viên cổng xác nhận container rời ICD.
- Gate-out phải re-check readiness ở backend.

API:

```text
POST /api/gate-out
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Long-press confirm | Interaction | Tránh bấm nhầm |
| Vehicle exit photo capture | Camera modal | Chụp xe rời cổng |
| Gate-out success | Success state | Xác nhận hoàn tất |
| Gate-out failed retry | Error state | Retry hoặc quay lại |

Business rule:

- Gate-out thành công thì `container_visit` chuyển `EXITED`.
- Gate Pass chuyển `USED`.
- Yard location đóng lại.
- Partner handover không rollback gate-out.

---

## 5.5 Container

### Container Search

Mục đích:

- Tìm container nhanh theo số container.
- Dùng cho Gate/Yard/Agent/Consignee.

API:

```text
GET /api/containers?search={containerNo}
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Recent containers | Inline list | Container xem gần đây |
| Filter theo trạng thái | Bottom sheet | Pending/In Yard/Exited |
| Search empty state | State | Không tìm thấy |
| Search error state | State | API lỗi |

### Container Detail

Mục đích:

- Xem tổng quan container.
- Xem blocker, timeline, yard, billing, gate pass.
- Là màn read-only chính cho Agent/Consignee.

API:

```text
GET /api/containers/:id
GET /api/containers/:id/events
GET /api/containers/:id/holds
GET /api/containers/:id/gate-pass/readiness
GET /api/containers/:id/handover-summary
```

Màn phụ/section:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Container overview section | Section | Type/state/seal/weight |
| Yard location detail | Section/bottom sheet | Block/row/bay/tier |
| Holds detail | Section/bottom sheet | Hold active/released |
| Billing summary | Section | Trạng thái phí |
| Gate pass summary | Section | Active/expired/used |
| Handover summary read-only | Section | Trạng thái bàn giao |
| Timeline events | Section | Lịch sử nghiệp vụ |
| Document/image preview | Modal | Xem ảnh/biên bản |
| Copy container number | Action | Copy số container |
| Refresh detail state | Pull-to-refresh | Reload detail |

---

## 5.6 Yard Assignment

### Yard Assignment

Mục đích:

- Chọn vị trí đặt container sau gate-in.
- Dùng recommendation từ backend.
- Yard staff là người xác nhận cuối cùng.

API:

```text
GET  /api/containers/:visitId/yard/recommendations
POST /api/containers/:visitId/yard/check
POST /api/containers/:visitId/yard/assign
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Waiting assignment list | List | Container chưa có vị trí |
| Select container | Bottom sheet | Chọn container cần xếp |
| Recommendation list | List | Top slot đề xuất |
| Recommendation reason detail | Bottom sheet | Lý do đề xuất |
| Slot detail | Bottom sheet | Slot code, max weight, reefer |
| Slot compatibility check | Inline result | Kết quả check hard rules |
| Yard map mini selector | Modal/screen | Chọn slot trực quan |
| Confirm assign slot | Confirm modal | Xác nhận assign |
| Assign success | Success state | Assign thành công |
| Assign failed/blocker detail | Error state | Slot không hợp lệ |

Hard rules:

- Container phải `IN_YARD`.
- Container chưa có active location.
- Block operational.
- Slot operational.
- Slot chưa occupied.
- Slot hỗ trợ container type.
- Reefer container phải vào reefer slot.
- Gross weight không vượt max weight.

---

## 5.7 Yard Operation

### Yard Operation Detail

Mục đích:

- Xử lý tác nghiệp bãi ngoài hiện trường.
- Gồm movement, inspection, booking.

API:

```text
GET  /api/containers/:visitId/yard/operations/active-summary
GET  /api/yard/movements
POST /api/containers/:visitId/yard/movements
POST /api/yard/movements/:id/start
POST /api/yard/movements/:id/complete
POST /api/yard/movements/:id/cancel

GET  /api/yard/inspections
POST /api/containers/:visitId/inspections
POST /api/inspections/:id/start
POST /api/inspections/:id/complete
POST /api/inspections/:id/cancel

GET  /api/yard/bookings
POST /api/containers/:visitId/yard-bookings
POST /api/yard/bookings/:id/start
POST /api/yard/bookings/:id/complete
POST /api/yard/bookings/:id/cancel
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Movement detail | Section/screen | Xem movement |
| Start movement confirm | Confirm modal | Bắt đầu movement |
| Complete movement confirm | Confirm modal | Hoàn tất movement |
| Cancel movement reason | Form modal | Nhập lý do hủy |
| Inspection detail | Section/screen | Xem inspection |
| Start inspection confirm | Confirm modal | Bắt đầu inspection |
| Inspection result form | Form | PASS/FAIL/HOLD |
| Inspection photo capture | Camera modal | Chụp ảnh |
| Upload inspection document | Upload modal | Upload biên bản |
| Complete inspection confirm | Confirm modal | Hoàn tất inspection |
| Booking detail | Section/screen | Xem booking |
| Start booking confirm | Confirm modal | Bắt đầu booking |
| Complete booking result form | Form | Số kiện/trọng lượng/tình trạng |
| Cancel booking reason | Form modal | Nhập lý do hủy |
| Operation active summary | Section | Tóm tắt operation active |
| Operation failed retry | Error state | Retry khi lỗi |

Business rules:

- Movement: `PENDING -> IN_PROGRESS -> COMPLETED/CANCELLED`.
- Chỉ cập nhật location mới khi movement completed.
- Inspection result `HOLD` trở thành blocker Gate Pass.
- Booking active là blocker Gate Pass.

---

## 5.8 Notifications

### Notifications

Mục đích:

- Hiển thị thông báo theo user/role.
- Hỗ trợ task, warning, gate pass, gate-out.

API:

```text
GET   /api/notifications/history
PATCH /api/notifications/:id/read
POST  /api/notifications/read-all
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Notification detail | Bottom sheet | Xem chi tiết |
| Filter unread | Toggle | Chỉ chưa đọc |
| Filter task notification | Filter | Task |
| Filter system notification | Filter | System |
| Mark as read | Action | Đánh dấu đã đọc |
| Mark all as read | Action | Đánh dấu tất cả |
| Empty notification state | State | Không có thông báo |

Thông báo chính:

- Gate Pass sắp hết hạn.
- Task mới.
- Gate-out thành công.
- Container có hold.
- Yard operation quá hạn.

---

## 5.9 More / Account

### More / Account

Mục đích:

- Hiển thị thông tin tài khoản.
- Xem role/permission.
- Logout.

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Profile detail | Section/screen | Tên/email/ICD |
| Role & permissions detail | Section/screen | Role + quyền |
| Server/API status | Section | Trạng thái API |
| Device info | Section | Thiết bị/app |
| App version | Section | Version |
| Change password | Screen/modal | Đổi mật khẩu |
| Logout confirm | Confirm modal | Đăng xuất |

---

## 5.10 Handover Summary

Không nên là tab riêng trong Mobile ICD.

Vị trí phù hợp:

- Section trong Container Detail.
- Bottom sheet xem chi tiết handover.

API:

```text
GET /api/containers/:visitId/handover-summary
```

Màn phụ:

| Màn phụ | Dạng | Mục đích |
|---|---|---|
| Handover summary | Section | Trạng thái bàn giao |
| Handover timeline | Bottom sheet | Timeline partner |
| Partner status detail | Bottom sheet | Partner accepted/in-transit/... |
| Warehouse received info | Bottom sheet | Thông tin kho nhận |
| Delivery failed info | Bottom sheet | Lỗi vận chuyển nếu có |

Không có trên Mobile ICD:

- Partner accept.
- Partner reject.
- Partner in-transit.
- Partner warehouse received.
- API key management.
- ICD confirm/dispute.

---

## 6. Permission Mapping Đề Xuất

| Mobile capability | Permission backend |
|---|---|
| Xem container | `container.read` |
| Xử lý gate-in | `gate_in.execute` |
| Xử lý gate-out | `gate_out.execute` |
| Assign yard slot | `yard.assign` hoặc `yard.update` |
| Yard movement/inspection/booking | `yard.move`, `yard.inspect`, `yard.update` |
| Xem billing blocker | `billing.read` hoặc `billing.manage` |
| Xử lý handover review | `handover.manage` |

---

## 7. API Mobile Chính

```text
# Auth
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/logout

# Work Queue
GET    /api/containers/work-queue
GET    /api/containers/work-queue/stats

# Container
GET    /api/containers
GET    /api/containers/:id
GET    /api/containers/:id/events
GET    /api/containers/:id/holds
GET    /api/containers/:id/handover-summary

# Gate-in
GET    /api/containers/:visitId/gate-in-context
POST   /api/containers/:visitId/gate-in
GET    /api/containers/:visitId/reception

# Yard
GET    /api/containers/:visitId/yard/recommendations
POST   /api/containers/:visitId/yard/check
POST   /api/containers/:visitId/yard/assign
GET    /api/containers/:visitId/yard/location
GET    /api/containers/:visitId/yard/operations/active-summary

# Yard movement
GET    /api/yard/movements
POST   /api/containers/:visitId/yard/movements
POST   /api/yard/movements/:id/start
POST   /api/yard/movements/:id/complete
POST   /api/yard/movements/:id/cancel

# Inspection
GET    /api/yard/inspections
POST   /api/containers/:visitId/inspections
POST   /api/inspections/:id/start
POST   /api/inspections/:id/complete
POST   /api/inspections/:id/cancel

# Booking
GET    /api/yard/bookings
POST   /api/containers/:visitId/yard-bookings
POST   /api/yard/bookings/:id/start
POST   /api/yard/bookings/:id/complete
POST   /api/yard/bookings/:id/cancel

# Gate-out
GET    /api/containers/:visitId/gate-pass/readiness
GET    /api/containers/:visitId/gate-pass
POST   /api/gate-pass/scan
POST   /api/gate-out

# Notifications
GET    /api/notifications/history
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
```

---

## 8. Gap Hiện Tại Cần Sửa

| Gap | Mức độ | Ghi chú |
|---|---|---|
| Work Queue mobile có thể đang gọi `/work-queue` thay vì `/containers/work-queue` | Cao | Cần sửa endpoint |
| Container Detail chưa đủ hold/billing/gate pass/handover sections | Cao | Cần đấu API detail |
| Yard Operation Detail còn đơn giản | Cao | Cần tách movement/inspection/booking states |
| Gate-out readiness blocker UI chưa đủ chi tiết | Cao | Cần hiển thị từng blocker |
| Handover summary chưa gắn sâu vào Container Detail | Trung bình | Read-only |
| Offline cache read-only chưa đủ | Trung bình | Không queue action offline |
| Role/permission UI đã có bước đầu nhưng cần test theo từng account thật | Cao | Login từng role kiểm tra |

---

## 9. Chốt Thiết Kế

Mobile app cần giữ đúng nguyên tắc:

- Ít tab, nhiều luồng tác nghiệp nhanh.
- Không đưa chức năng admin/config lên mobile.
- Mỗi role chỉ thấy nghiệp vụ của mình.
- Mọi command hiện trường phải gọi backend kiểm tra lại.
- Không bypass blocker.
- Không queue action offline cho gate-in/gate-out.
- Handover trên mobile chỉ read-only.

