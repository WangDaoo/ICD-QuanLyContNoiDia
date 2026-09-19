# Đặc tả Ứng dụng Web

# ICD Management System — Web Application

**Phiên bản:** 1.7 — Business-focused / Detailed Partner Handover
**Nền tảng:** Web Application (Desktop / Tablet)
**Tech stack:** React 19 + Vite + TypeScript + TanStack Query + React Router
**URL local:** `http://127.0.0.1:9999`
**API base:** `http://127.0.0.1:3100/api`

> **Định hướng:** đặc tả Web tập trung vào màn hình, thao tác người dùng, điều kiện cho phép action, kết quả và xử lý lỗi. Chi tiết class/DTO/migration không phải trọng tâm.

> **Kiến trúc Module 13:** ICD là API Provider. ADMIN ICD tạo/rotate/revoke API Key cho Partner. Core ICD vẫn kết thúc độc lập ở Gate-out; Bàn giao vận chuyển là lifecycle mở rộng để Partner nhận dữ liệu, cập nhật vận chuyển/kho nhận và ICD xác nhận cuối cùng.

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

## 1. Tổng quan

### 1.1 Mục tiêu

Web app phục vụ nghiệp vụ văn phòng — các thao tác yêu cầu màn hình rộng, nhập liệu nhiều trường, xem báo cáo và quản trị hệ thống. Web là nơi xử lý toàn bộ luồng nghiệp vụ chính từ đầu đến cuối, đồng thời là điểm kiểm soát quyết định trước khi mobile thực thi tại hiện trường. Từ phiên bản 1.6, Web quản lý **Bàn giao vận chuyển** sau/ngoài core ICD: OPERATOR tạo Handover, Partner cập nhật qua External API, OPERATOR/MANAGER review confirmation; ADMIN quản lý Đối tác tích hợp API/API Key và ADMIN/MANAGER giám sát Nhật ký API đối tác.

### 1.2 Đối tượng người dùng

| Role         | Quyền truy cập                 | Màn hình chính                                                       |
| ------------ | ------------------------------ | -------------------------------------------------------------------- |
| `ADMIN`      | Toàn bộ hệ thống               | Admin Center, Audit, EDI, Đối tác tích hợp API, Handover             |
| `MANAGER`    | Xem, phê duyệt, báo cáo        | Dashboard, Reports, Audit, EDI, Handover Review, Nhật ký API đối tác |
| `OPERATOR`   | Nghiệp vụ đầy đủ               | Manifest, Container, Billing, Gate Pass                              |
| `GATE_STAFF` | Gate workflow                  | Work Queue, Gate-in, Truck Visits                                    |
| `YARD_STAFF` | Yard workflow                  | Work Queue, Yard, Inspections                                        |
| `AGENT`      | Chỉ xem dữ liệu được cấp quyền | Container (hạn chế), Billing                                         |

> ICD Web Admin là nơi **cấp API Key cho Partner**. Plaintext key chỉ hiển thị đúng một lần khi tạo/rotate; hệ thống chỉ lưu hash/last4. Partner API Key không dùng cho user Web nội bộ.

### 1.3 Tech stack

```
React 19          — UI framework
Vite              — Build tool, dev server
TypeScript        — Type safety
React Router v6   — Client-side routing
TanStack Query    — Server state, cache, refetch
Axios             — HTTP client + interceptors (attach JWT, xử lý 401)
Zod               — Schema validation phía client
React Hook Form   — Form management
```

---

## 2. Kiến trúc màn hình & Điều hướng

### 2.1 Sơ đồ route

```
/login                         — Đăng nhập

/ (Dashboard)                  — Trang chủ sau login

/work-queue                    — Danh sách công việc thông minh

/manifests                     — Danh sách Manifest
/manifests/new                 — Tạo Manifest mới
/manifests/:id                 — Chi tiết Manifest
/manifests/:id/master-bills    — MBL thuộc Manifest
/master-bills/:id              — Chi tiết MBL
/master-bills/:id/house-bills  — HBL thuộc MBL
/house-bills/:id               — Chi tiết HBL

/containers                    — Danh sách Container
/containers/:id                — Chi tiết Container (container visit)

/truck-visits                  — Danh sách Truck Visits
/truck-visits/new              — Tạo Truck Visit mới
/truck-visits/:id              — Chi tiết Truck Visit

/gate-in/:visitId              — Luồng Tiếp nhận vào cổng

/yard                          — Sơ đồ và danh sách Yard Slots
/yard/:visitId/assign          — Assign Yard Slot cho container
/yard/movements                — Lịch sử internal movement
/yard/bookings                 — Danh sách stripping/inspection bookings

/billing                       — Tổng quan Billing
/billing/:visitId              — Billing của container cụ thể
/billing/:visitId/service-order/new  — Tạo Service Order
/invoices/:id                  — Chi tiết Invoice + thanh toán

/gate-pass/:visitId            — Quản lý Phiếu ra cổng

/handovers                     — Danh sách Bàn giao vận chuyển
/handovers/new                 — Tạo Handover
/handovers/:id                 — Handover detail / review confirmation

/edi                           — EDI Operations: Outbox / ACK / Alerts

/reports                       — Dashboard + báo cáo tổng hợp

/activity                      — Audit Log

/admin                         — Admin Center
/admin/settings                — Operational Settings
/admin/tariffs                 — Tariff Management
/admin/master-data             — Master Data (Shipping Line, Consignee...)
/admin/users                   — Quản lý Users
/admin/roles                   — Roles & Permissions
/admin/partner-clients         — Đối tác tích hợp API (Module 13)
/admin/partner-clients/:id     — API scopes / Rotate / Revoke
/admin/partner-api-logs        — External Nhật ký API đối tác
/admin/partner-api-logs/:id    — Chi tiết request/response
```

### 2.2 Layout tổng thể

```
┌──────────────────────────────────────────────────┐
│  Sidebar (240px)      │  Main Content Area        │
│                       │                           │
│  [Logo]               │  [Page Header + Actions]  │
│  [User avatar/name]   │                           │
│  ─────────────────    │  [Content]                │
│  Dashboard             │                           │
│  Danh sách công việc  [N]      │                           │
│  ─────────────────    │                           │
│  Manifest             │                           │
│  Container            │                           │
│  Truck Visits         │                           │
│  Yard                 │                           │
│  Billing              │                           │
│  Phiếu ra cổng            │                           │
│  ─────────────────    │                           │
│  EDI                  │                           │
│  Reports              │                           │
│  Activity             │                           │
│  Admin                │                           │
│  ─────────────────    │                           │
│  [Logout]             │                           │
└──────────────────────────────────────────────────┘
```

- Sidebar hiển thị badge số task đang active trên Work Queue
- Main content area responsive: tablet ≥ 768px vẫn dùng được
- Toast notifications cho API success/error
- Global loading indicator khi đang fetch
- Bàn giao vận chuyển là nghiệp vụ vận hành nên có route riêng `/handovers`; Đối tác tích hợp API/API Logs nằm trong Admin Center vì là chức năng quản trị/tích hợp.

---

## 3. Màn hình chi tiết

### 3.1 ĐĂNG NHẬP / XÁC THỰC (`/login`)

**Mục đích:** Xác thực người dùng, nhận JWT access + refresh token.

**Form fields:**

- Email (text, required, validate format)
- Password (password, required, minLength 8)
- Nút "Đăng nhập"

**Logic:**

- POST `/api/auth/login` → nhận `accessToken` (15 phút) + `refreshToken` (7 ngày)
- Lưu `accessToken` vào memory (không localStorage); `refreshToken` vào httpOnly cookie hoặc localStorage nếu không dùng được cookie
- Axios interceptor: nếu response 401 → tự động gọi `POST /api/auth/refresh` → retry request
- Sau login thành công → redirect về `/` hoặc route đã lưu trước đó

**Xử lý lỗi:**

- 401: "Email hoặc mật khẩu không đúng"
- 403: "Tài khoản đã bị vô hiệu hoá"

---

### 3.2 TỔNG QUAN VẬN HÀNH (`/`)

**Mục đích:** Tổng quan tình hình ICD theo thời gian thực, cảnh báo sớm.

**Widgets hiển thị:**

| Widget                      | Dữ liệu                          | Refresh |
| --------------------------- | -------------------------------- | ------- |
| Container trong Yard        | Tổng, phân theo trạng thái       | 60s     |
| Work Queue urgency          | Overdue / HIGH / MEDIUM / NORMAL | 60s     |
| Gate activity hôm nay       | Gate-in / Gate-out theo giờ      | 60s     |
| Container sắp hết free days | Danh sách ≤ 2 ngày free còn lại  | 60s     |
| Doanh thu tháng này         | Tổng thu, so với tháng trước     | 5 phút  |
| Công nợ chưa thu            | Tổng + số lượng Consignee        | 5 phút  |

**Action nhanh từ Dashboard:**

- Click vào Work Queue widget → `/work-queue`
- Click vào container sắp hết free day → `/containers/:id`
- Click vào Công nợ → `/reports` filter công nợ

**API:** `GET /api/reports/summary` (kết hợp với work queue endpoint)

---

### 3.3 DANH SÁCH CÔNG VIỆC (`/work-queue`)

**Mục đích:** Danh sách việc cần làm được sắp xếp theo SLA và urgency, lọc theo role.

**Layout:**

```
[Bộ lọc: Task type | Urgency | Trạng thái]     [Refresh]
─────────────────────────────────────────────
[OVERDUE] Container CSQU3054383                  [Tiếp nhận vào cổng]  →
  Truck: 51A-12345 | SLA: quá 45 phút
─────────────────────────────────────────────
[HIGH]    Container MSCU6639870                  [Yard ops] →
  Trong yard 3 ngày | Xác nhận ra cổng còn 2 giờ
─────────────────────────────────────────────
[MEDIUM]  Container TCKU1234567                  [Billing]  →
  Chờ billing | Free days: còn 1
─────────────────────────────────────────────
```

**Các task type hiển thị theo role:**

| Task              | Role thấy            | Action button                           |
| ----------------- | -------------------- | --------------------------------------- |
| `GATE_IN`         | OPERATOR, GATE_STAFF | "Gate-in" → `/gate-in/:visitId`         |
| `YARD_ASSIGN`     | OPERATOR, YARD_STAFF | "Assign Yard" → `/yard/:visitId/assign` |
| `YARD_OPERATIONS` | OPERATOR, YARD_STAFF | "Yard ops" → `/containers/:id`          |
| `BILLING`         | OPERATOR             | "Tạo billing" → `/billing/:visitId`     |
| `GATE_OUT`        | GATE_STAFF           | "Gate-out" → `/gate-pass/:visitId`      |

**Urgency badge:**

- `OVERDUE` = đỏ
- `HIGH` = cam
- `MEDIUM` = vàng
- `NORMAL` = xanh lá

**API:** `GET /api/containers/work-queue`

> Có thể bổ sung task `HANDOVER_REVIEW` khi Partner đã xác nhận kho nhận (`PARTNER_CONFIRMED`). Work Queue chỉ nhắc người dùng ICD review; request API của Partner không trở thành task Gate/Yard.

---

### 3.4 QUẢN LÝ BẢN LƯỢC KHAI (MANIFEST)

#### 3.4.1 Danh sách Manifest (`/manifests`)

**Bảng dữ liệu:**

| Cột          | Ghi chú                  |
| ------------ | ------------------------ |
| Mã Manifest  | Link đến detail          |
| Ngày tàu đến |                          |
| Tàu / Voyage |                          |
| Hãng tàu     |                          |
| Số MBL       |                          |
| Số container |                          |
| Trạng thái   | DRAFT / SUBMITTED badge  |
| Thao tác     | Xem, Sửa (DRAFT), Submit |

**Bộ lọc:**

- Khoảng ngày tàu đến
- Hãng tàu (dropdown từ master data)
- Trạng thái

**Action:** Nút "Tạo Manifest" → `/manifests/new`

#### 3.4.2 Tạo / Sửa Manifest (`/manifests/new`)

**Form:**

```
Hãng tàu*          [dropdown — catalog Shipping Line]
Tàu / Voyage*      [text]
Ngày tàu đến*      [date picker]
Cảng xếp hàng      [text]
Cảng đến           [text]
Ghi chú            [textarea]

[Lưu nháp]  [Submit]
```

**Sau khi tạo** → redirect về `/manifests/:id` để thêm MBL/HBL.

#### 3.4.3 Chi tiết Manifest (`/manifests/:id`)

**Layout tab:**

- Tab "Thông tin chung" — metadata Manifest
- Tab "Master BL" — danh sách MBL + nút thêm MBL
- Tab "Containers" — danh sách container liên kết
- Tab "Lịch sử" — audit trail

**Tạo MBL inline:**

```
Số MBL*            [text]
[Thêm MBL]
```

**Tạo HBL inline (từ màn hình MBL detail):**

```
Số HBL*            [text]
Consignee*         [searchable dropdown]
Clearing Agent     [searchable dropdown]
Mô tả hàng         [text]
Trọng lượng (kg)   [number]
Số lượng kiện      [number]
[Thêm HBL]
```

**Import container từ Excel:**

- Upload file `.xlsx`
- Preview dữ liệu mapping (số container, loại, seal, gross weight, HBL)
- Validate ISO 6346 realtime trên UI
- Submit → `POST /api/manifests/:id/import-containers`

---

### 3.5 QUẢN LÝ CONTAINER

#### 3.5.1 Danh sách Container (`/containers`)

**Bảng dữ liệu:**

| Cột          | Ghi chú                       |
| ------------ | ----------------------------- |
| Số container | Link đến detail               |
| Loại         | 20GP / 40GP / 40HC...         |
| Consignee    |                               |
| Manifest     |                               |
| Trạng thái   | Badge theo state              |
| Vị trí Yard  | Block-Row-Bay-Tier            |
| Ngày gate-in |                               |
| Số ngày lưu  | Highlight đỏ nếu > free days  |
| Blocker      | Icon nếu có readiness blocker |

**Bộ lọc:**

- Số container (search text)
- Consignee
- Trạng thái (multi-select)
- Manifest
- Có blocker (toggle)
- Khoảng ngày gate-in

#### 3.5.2 Chi tiết Container (`/containers/:id`)

Màn hình trung tâm — trả lời 4 câu hỏi:

1. Container này là của ai?
2. Đang ở bước nào?
3. Nằm ở đâu trong Yard?
4. Còn blocker nào?

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ CSQU3054383                    [IN_YARD] badge   │
│ Consignee: ABC Trading Co. | Manifest: MF-2026-01│
│ Tiếp nhận vào cổng: 01/09/2026 08:30 | Ngày lưu: 3 ngày    │
│                                                  │
│ [Tiếp nhận vào cổng] [Billing] [Phiếu ra cổng] [Holds]          │
└──────────────────────────────────────────────────┘

Tabs: [Tổng quan] [Tác nghiệp bãi] [Billing] [Phiếu ra cổng] [Timeline] [Holds]
```

**Tab Tổng quan:**

- Thông tin container (loại, seal, gross weight)
- Vị trí Yard hiện tại
- Readiness checklist (các blocker + trạng thái)
- Thông tin Manifest / MBL / HBL

**Tab Yard Ops:**

- Vị trí hiện tại
- Lịch sử vị trí (location log)
- Internal movements (pending + completed)
- Inspections
- Yard bookings (stripping...)

**Tab Billing:**

- Danh sách Service Orders + trạng thái
- Danh sách Invoices + số tiền / đã trả
- Tổng phí dịch vụ
- Nút "Tạo Service Order" (nếu có quyền)

**Tab Gate Pass:**

- Trạng thái Gate Pass hiện tại
- Thông tin Gate Pass (nếu đã tạo): code, QR, hạn dùng
- Nút "Tạo Gate Pass" (nếu readiness pass)
- Nút "Xem QR" để in / gửi

**Tab Timeline:**

- Danh sách event theo thứ tự thời gian ngược
- Mỗi event: timestamp, actor, loại event, mô tả
- Filter theo loại event

**Tab Holds:**

- Danh sách Lệnh giữ nghiệp vụs đang active
- Loại: Customs / Shipping Line / Damage / Security / Document / Other
- Nút "Release Hold" (nếu có quyền)
- Nút "Thêm Hold"

**Bàn giao vận chuyển:** Container Detail có tab/card riêng, không trộn Handover state với Container Visit state.

Nếu chưa có Handover:

```text
Bàn giao vận chuyển
Chưa tạo
[+ Tạo Handover]
```

Nếu đã có:

```text
Transport code: VC-2026-001
Partner: ABC Logistics
Kho đích: Kho ABC
Status: IN_TRANSIT
Partner accepted: 18/09 09:05
Đối tác đã xác nhận: -
[Xem Handover]
```

Quy tắc:

- `EXITED` của Container Visit không bị đổi theo Handover.
- Nút tạo Handover chỉ hiện khi user có `handover.create` và visit đạt precondition.
- Khi `PARTNER_CONFIRMED`, card hiển thị “Chờ ICD xác nhận” và link Review.
- Consignee/Agent không thấy API log hoặc secret Partner.

---

### 3.6 CHUYẾN XE RA/VÀO / LỊCH HẸN CỔNG (`/truck-visits`)

**Mục đích:** Quản lý chuyến xe vật lý đến cổng, lên lịch trước để gate-in nhanh.

**Danh sách:**

| Cột          | Ghi chú                                       |
| ------------ | --------------------------------------------- |
| Mã chuyến    |                                               |
| Biển số xe   |                                               |
| Tài xế       |                                               |
| Hãng xe      |                                               |
| Giờ hẹn      |                                               |
| Số container |                                               |
| Trạng thái   | SCHEDULED / ARRIVED / IN_PROGRESS / COMPLETED |
| Thao tác     | Xem, Xác nhận ARRIVED, Cancel                 |

**Tạo Truck Visit:**

```
Biển số xe*        [text]
Tài xế*            [text]
Hãng xe (Trans.)   [dropdown — catalog Transporter]
Giờ hẹn            [datetime picker]
Container(s)*      [multi-select từ container AUTHORIZED]
Gate lane          [text — không bắt buộc]
[Tạo]
```

**Chi tiết Truck Visit:**

- Thông tin xe + tài xế
- Danh sách container trong chuyến
- Timeline: SCHEDULED → ARRIVED → IN_PROGRESS → COMPLETED
- Nút "Xác nhận ARRIVED" (Gate Staff)
- Nút "Cancel"
- Khi toàn bộ container đã gate-in → auto COMPLETED

---

### 3.7 QUY TRÌNH TIẾP NHẬN VÀO CỔNG (`/gate-in/:visitId`)

**Mục đích:** Nhập thông tin tiếp nhận container vào ICD.

**Điều kiện vào màn hình:**

- Container phải ở trạng thái `PENDING` hoặc `AUTHORIZED`
- User phải có quyền `gate_in.create`

**Form:**

```
Thông tin container
──────────────────
Số container       [readonly — lấy từ visitId]
Loại               [readonly]
Seal manifest      [readonly]

Thông tin tiếp nhận
───────────────────
Seal thực tế*      [text — so sánh với seal manifest, highlight khác biệt]
Trọng lượng vào    [number, kg]
Tình trạng vật lý  [textarea — mô tả bất thường nếu có]

Thông tin xe
────────────
Truck Visit        [dropdown — chọn Truck Visit đã ARRIVED, hoặc bỏ trống nếu walk-in]
Biển số xe*        [text — tự điền nếu chọn Truck Visit]
Tài xế*            [text — tự điền nếu chọn Truck Visit]
Transporter        [dropdown — tự điền nếu chọn Truck Visit]

[Hủy]  [Xác nhận Tiếp nhận vào cổng]
```

**Validation:**

- Nếu seal thực tế ≠ seal manifest → highlight đỏ, yêu cầu điền ghi chú bắt buộc
- Nếu container đã `IN_YARD` → block với thông báo rõ ràng

**Sau gate-in thành công:**

- Toast "Gate-in thành công"
- Redirect về `/containers/:id` tab Tổng quan
- Container state = `IN_YARD`

**API:** `POST /api/containers/:visitId/gate-in`

---

### 3.8 QUẢN LÝ BÃI CONTAINER

#### 3.8.1 Sơ đồ và danh sách Vị trí bãi (`/yard`)

**Tab "Danh sách slot":**

| Cột                      | Ghi chú                            |
| ------------------------ | ---------------------------------- |
| Block / Row / Bay / Tier |                                    |
| Loại                     |                                    |
| Trạng thái               | Available / Occupied / Maintenance |
| Container hiện tại       | Link nếu đang occupied             |
| Tải trọng tối đa         |                                    |
| Reefer power             | Có / Không                         |

**Tab "Sơ đồ" (grid view — future):**

- Grid 2D hiển thị block/row/bay
- Màu: trống (trắng), có container (xanh), bảo trì (xám)
- Click vào ô → xem thông tin container

#### 3.8.2 Xếp vị trí bãi (`/yard/:visitId/assign`)

**Mục đích:** Chọn vị trí đặt container trong yard sau gate-in.

**Layout:**

```
Container: CSQU3054383 | 40HC | 28,500 kg

Gợi ý vị trí (Rule-based + ML ranking)
─────────────────────────────────────────
#1  A / R02 / B03 / T1    Score: 92     [Chọn]
    Gần cổng, tải phù hợp, lịch gate-out sớm

#2  B / R01 / B05 / T2    Score: 85     [Chọn]
    Cùng khu consignee

#3  C / R04 / B01 / T1    Score: 78     [Chọn]

──────────────────────────────────────────
Hoặc chọn thủ công:
Block [A ▼]  Row [01 ▼]  Bay [01 ▼]  Tier [1 ▼]  [Kiểm tra & Chọn]
```

**Hard rules hiển thị:**

- Slot đang occupied → không hiển thị trong gợi ý, vô hiệu hoá manual
- Container 40HC → chỉ hiện slot phù hợp kích thước
- Container reefer → chỉ hiện slot có reefer power
- Gross weight > slot max → ẩn slot đó

**API:**

- `GET /api/containers/:visitId/yard/recommendations` → list + score từ backend (ML hoặc rule-based)
- `POST /api/containers/:visitId/yard/assign`

---

### 3.9 DỊCH VỤ & THANH TOÁN

#### 3.9.1 Tổng quan Dịch vụ & Thanh toán (`/billing/:visitId`)

**Layout:**

```
Container CSQU3054383 — Billing Overview

Readiness:  [✓] Yard  [✓] No active ops  [✗] Unpaid invoice
──────────────────────────────────────────────────────────

Service Orders
──────────────
SO-001  CONFIRMED    Lưu kho 3 ngày + Reception  1,500,000₫  → Invoice
SO-002  DRAFT        Stripping lần 1              800,000₫   [Confirm] [Xoá]

Invoices
────────
INV-001  UNPAID  2,200,000₫  Hạn: 05/09/2026   [Ghi nhận TT]
INV-002  PAID    1,500,000₫  Đã TT: 01/09/2026

Tổng phí:      3,700,000₫
Đã thanh toán: 1,500,000₫
Còn lại:       2,200,000₫

[Tạo Service Order mới]
```

#### 3.9.2 Tạo Đơn dịch vụ (Service Order)

**Form:**

```
Danh sách dịch vụ
─────────────────
[+] Thêm dịch vụ

Loại dịch vụ*    [dropdown: Reception / Storage / Stripping / Inspection / Movement]
Số lượng*        [number — tự động tính nếu có thể]
Đơn giá          [readonly — lấy từ tariff]
Thành tiền       [readonly — tính tự động]

Tổng cộng: xxx₫

[Hủy]  [Lưu nháp]  [Xác nhận]
```

**Logic:**

- Khi chọn "Storage" → hệ thống tự điền số ngày lưu kho chưa bill
- Đơn giá lấy từ tariff active, ưu tiên rule theo `container_type`, fallback generic
- Không được bill số lượng đã bill trong SO trước

#### 3.9.3 Hóa đơn & Thanh toán

**Chi tiết Invoice (`/invoices/:id`):**

```
INV-001
Container: CSQU3054383 | Consignee: ABC Trading
Ngày xuất: 01/09/2026 | Hạn TT: 05/09/2026

Dịch vụ:
  Reception × 1            200,000₫
  Storage × 3 ngày       1,200,000₫
  Stripping × 1            300,000₫
                        ──────────
  Tổng:                  1,700,000₫

Lịch sử thanh toán:
  01/09/2026  Chuyển khoản  500,000₫  (nhân viên: nguyen.van.a)
              ──────────────────────
  Còn lại:   1,200,000₫

[Ghi nhận Thanh toán]
```

**Form thanh toán:**

```
Số tiền*         [number]
Phương thức*     [dropdown: Tiền mặt / Chuyển khoản / Khác]
Ngày thanh toán  [date, default: hôm nay]
Ghi chú          [text]
[Xác nhận]
```

---

### 3.10 PHIẾU RA CỔNG (`/gate-pass/:visitId`)

**Mục đích:** Tạo và quản lý Gate Pass, kiểm soát xuất container.

**Readiness panel:**

```
Điều kiện cấp Phiếu ra cổng Check
──────────────────────────
[✓] Container đang IN_YARD
[✓] Đã có Yard Position
[✓] Billing hoàn tất
[✗] INSPECTION_HOLD — Còn 1 inspection kết quả HOLD
[✓] Không có Lệnh giữ nghiệp vụ active
```

**Khi readiness = PASS:**

```
[Tạo Phiếu ra cổng]
```

**Form tạo Gate Pass:**

```
Biển số xe lấy hàng   [text]
Tên người nhận*        [text]
CMND/CCCD*             [text]
[Tạo Phiếu ra cổng]
```

**Sau khi tạo:**

```
Phiếu ra cổng: GP-2026-0342
Trạng thái: ACTIVE
Hết hạn: 02/09/2026 08:30 (còn 23:45:00)

[QR Code — 256×256]

[In Phiếu ra cổng]  [Gửi Email]  [Cancel Phiếu ra cổng]
```

**Trạng thái Gate Pass:**

- `ACTIVE` — xanh lá, countdown timer
- `EXPIRED` — xám, đã hết hạn
- `USED` — xanh dương, đã gate-out
- `CANCELLED` — đỏ, đã huỷ

**API:**

- `GET /api/containers/:visitId/gate-pass`
- `POST /api/containers/:visitId/gate-pass`
- `POST /api/gate-pass/scan` (gate-out)

---

### 3.11 VẬN HÀNH EDI (`/edi`)

**Mục đích:** Theo dõi luồng trao đổi EDI phát sinh từ Gate-in/Gate-out mà không làm người dùng phải đọc log backend.

**Các vùng chính:**

1. **Outbox** — container/message, loại CODECO, Shipping Line, trạng thái `PENDING / PROCESSING / SENT / FAILED / DEAD`, lần thử gần nhất.
2. **Acknowledgement / Receipt** — response/ACK nhận từ đối tác, trạng thái đối soát và reference liên quan.
3. **Alerts / Incidents** — lỗi delivery, ACK reject, inbound receipt lỗi/quarantine; có lifecycle `OPEN → ACKNOWLEDGED → RESOLVED`.

**Hướng xử lý:**

```text
Tiếp nhận vào cổng/Xác nhận ra cổng thành công
        ↓
Message xuất hiện trong Outbox
        ↓
Dispatcher gửi
   ├─ thành công → SENT → chờ/ghi ACK nếu có
   └─ lỗi → FAILED/DEAD → tạo cảnh báo → Operator xử lý/retry
```

**Quyền:** ADMIN/MANAGER xem toàn bộ; OPERATOR xem/xử lý theo permission. EDI lỗi không được tự hoàn tác Gate-in/Gate-out đã hoàn tất.

---

### 3.12 BÀN GIAO VẬN CHUYỂN (`/handovers`) — Mô đun 13

**Mục đích:** quản lý quá trình bàn giao container sau/ngoài core ICD cho hệ thống Logistics/Transport Partner và thực hiện bước xác nhận cuối cùng của ICD.

#### 3.12.1 Danh sách bàn giao (`/handovers`)

**Bảng:**

| Cột               | Ghi chú                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| Transport code    | Link detail                                                                         |
| Container         | Link Container Detail                                                               |
| Partner           | Đối tác tích hợp API                                                                |
| Kho đích          | Customer Warehouse                                                                  |
| Status            | DRAFT / READY / ACCEPTED / IN_TRANSIT / PARTNER_CONFIRMED / COMPLETED / DISPUTED... |
| Ready at          |                                                                                     |
| Partner confirmed | nếu có                                                                              |
| ICD confirmed     | nếu có                                                                              |
| Action            | Xem / Review tùy state                                                              |

**Filter:** container, transport code, Partner, warehouse, status, khoảng ngày, `Awaiting ICD confirmation`.

**Quick filters:**

```text
[Sẵn sàng] [Đang vận chuyển] [Chờ ICD xác nhận] [Disputed] [Hoàn tất]
```

#### 3.12.2 Tạo bàn giao (`/handovers/new`)

```text
Container Visit*       [search / readonly nếu đi từ Container Detail]
Partner*               [active Partner Client]
Destination Warehouse* [searchable dropdown]
Transport code*        [text]
Expected delivery      [datetime]
Ghi chú                [textarea]

[Lưu nháp] [Sẵn sàng bàn giao]
```

**Validation:**

- Container Visit tồn tại và user có scope.
- Theo policy mặc định visit phải `EXITED`; có thể cấu hình chuẩn bị DRAFT trước Gate-out nhưng chỉ publish khi đủ điều kiện.
- Partner ACTIVE.
- Warehouse active.
- Không có Handover active xung đột.
- Transport code unique theo rule.

**Kết quả:**

- Lưu nháp → `DRAFT`.
- Sẵn sàng bàn giao → `READY_FOR_HANDOVER`; Partner bắt đầu nhìn thấy qua External API.

#### 3.12.3 Chi tiết bàn giao (`/handovers/:id`)

Header:

```text
VC-2026-001                      [PARTNER_CONFIRMED]
Container: MSCU1234567
Partner: ABC Logistics
Kho: Kho ABC
```

Tabs/sections:

- Tổng quan.
- Container snapshot.
- Xác nhận của đối tác/POD.
- Timeline.
- API Requests liên quan (nếu có quyền).
- Dispute/Resolution history.

**Timeline:**

```text
09:00 READY_FOR_HANDOVER   Operator A
09:05 PARTNER_ACCEPTED     API / ABC Logistics
09:20 IN_TRANSIT           API / ABC Logistics
15:30 PARTNER_CONFIRMED    API / ABC Logistics
--:-- ICD_CONFIRMED        pending
```

#### 3.12.4 Kiểm tra xác nhận của đối tác

Khi status `PARTNER_CONFIRMED`, hiển thị:

```text
Partner xác nhận kho đã nhận
--------------------------------
Received at: 18/09/2026 15:30
Receiver: Nguyễn Văn B
Phone: ...
GPS: 20.xxxxxx, 105.xxxxxx (±12m)
Proof image: [Xem]
Signature: [Xem]
Note: Container nguyên trạng

[XÁC NHẬN BÀN GIAO] [TẠO TRANH CHẤP]
```

**ICD Confirm:**

- confirm dialog;
- backend re-check current state;
- ghi actor/time/note;
- `PARTNER_CONFIRMED → ICD_CONFIRMED → COMPLETED`.

**Dispute:** bắt buộc reason + note; optional attachment. Kết quả `DISPUTED`, không xóa Partner confirmation cũ.

#### 3.12.5 Đối tác từ chối / Giao vận thất bại

Web phải hiển thị reason, time, partner reference và action nghiệp vụ được backend cho phép: tạo Handover thay thế/reschedule/cancel. Không có action đưa Container Visit từ `EXITED` quay lại `IN_YARD`.

#### 3.12.6 Danh mục kho nhận

Warehouse có:

- code/name/address;
- consignee optional;
- contact;
- latitude/longitude optional;
- active/inactive.

GPS của confirmation có thể được so sánh với warehouse coordinate để **cảnh báo**, không mặc định hard-block nếu sai số GPS chưa được kiểm soát.

---

### 3.13 BÁO CÁO (`/reports`)

**Mục đích:** Tổng hợp tình hình vận hành và lịch sử phục vụ Manager/ADMIN.

| Nhóm                          | Nội dung                                              |
| ----------------------------- | ----------------------------------------------------- |
| Gate Activity                 | Gate-in/Gate-out theo ngày/giờ                        |
| Container Turnover            | Dwell time, số container hoàn tất                     |
| Current Yard Inventory        | Tồn hiện tại theo Block/Slot/Type                     |
| Historical Yard Inventory EOD | Tái dựng tồn cuối ngày từ location history            |
| Revenue                       | Doanh thu theo payment                                |
| Outstanding Debt              | Công nợ hiện tại/quá hạn                              |
| Bàn giao vận chuyển           | Ready/In Transit/Partner Confirmed/Completed/Disputed |

**Action:** lọc thời gian, drill-down, CSV/Excel. PDF/scheduled report có thể thuộc roadmap.

### 3.14 TRUNG TÂM QUẢN TRỊ (`/admin`)

**Chỉ ADMIN truy cập phần cấu hình Đối tác tích hợp API**; Nhật ký API đối tác cho phép MANAGER xem read-only theo RBAC. Bàn giao vận chuyển là nghiệp vụ vận hành nên OPERATOR/MANAGER truy cập theo quyền riêng.

#### 3.14.1 Cấu hình vận hành (`/admin/settings`)

| Setting key               | Mô tả                    | Giá trị mặc định |
| ------------------------- | ------------------------ | ---------------- |
| `FREE_STORAGE_DAYS`       | Số ngày lưu kho miễn phí | 5                |
| `GATE_PASS_TTL_HOURS`     | Thời hạn Gate Pass (giờ) | 24               |
| `GATE_IN_SLA_MINUTES`     | SLA Gate-in (phút)       | 120              |
| `YARD_ASSIGN_SLA_MINUTES` | SLA Yard Assign (phút)   | 60               |
| `OVERDUE_DEBT_DAYS`       | Ngày cảnh báo công nợ    | 30               |

Form CRUD đơn giản theo key-value.

#### 3.14.2 Quản lý biểu phí (`/admin/tariffs`)

**Lifecycle tariff:** `DRAFT → ACTIVE → RETIRED`

Mỗi tariff có:

- Tên tariff
- Ngày hiệu lực
- Trạng thái

Mỗi tariff rule:

- Loại dịch vụ: Reception / Storage / Stripping / Inspection / Movement
- Container type: 20GP / 40GP / 40HC / ALL (generic)
- Đơn giá
- Đơn vị: lần / ngày / container

**Rule khi activate:**

- Tariff phải có ≥ 1 rule generic cho mỗi service type bắt buộc (Reception, Storage, Stripping, Inspection, Movement)
- Activation làm RETIRED tariff ACTIVE trước đó

#### 3.14.3 Dữ liệu danh mục (`/admin/master-data`)

Quản lý 4 catalog:

| Catalog        | Fields                        |
| -------------- | ----------------------------- |
| Shipping Line  | Tên, SCAC code                |
| Consignee      | Tên, MST, SĐT, Email, Địa chỉ |
| Clearing Agent | Tên, Số phép                  |
| Transporter    | Tên, MST                      |

Tất cả dùng soft delete (deactivate thay vì xoá cứng).

#### 3.14.4 Người dùng & Vai trò (`/admin/users`)

**Danh sách user:**

- Email, Tên, Role, Trạng thái (Active / Inactive)
- Thao tác: Sửa, Deactivate

**Tạo / sửa user:**

```
Email*         [text, unique]
Tên*           [text]
Mật khẩu*      [password — chỉ khi tạo mới]
Role*          [dropdown: ADMIN / MANAGER / OPERATOR / GATE_STAFF / YARD_STAFF / AGENT / CONSIGNEE]
[Lưu]
```

**Safeguards:**

- ADMIN không tự deactivate chính mình
- ADMIN không tự bỏ role ADMIN của mình
- Role change → revoke refresh token → user phải login lại

#### 3.14.5 Ma trận phân quyền (`/admin/roles`)

Bảng hiển thị: Role × Permission = checkbox On/Off

```
Permission                  ADMIN  MANAGER  OPERATOR  GATE  YARD  AGENT
manifest.read                [✓]    [✓]       [✓]      [✓]   [✓]   [✓]
manifest.create              [✓]    [ ]       [✓]      [ ]   [ ]   [ ]
gate_in.create               [✓]    [ ]       [✓]      [✓]   [ ]   [ ]
yard.update                  [✓]    [ ]       [✓]      [ ]   [✓]   [ ]
billing.manage               [✓]    [ ]       [✓]      [ ]   [ ]   [ ]
gate_pass.create             [✓]    [ ]       [✓]      [ ]   [ ]   [ ]
gate_pass.use                [✓]    [ ]       [ ]      [✓]   [ ]   [ ]
reports.read                 [✓]    [✓]       [✓]      [ ]   [ ]   [ ]
partner_client.manage                [✓]    [ ]       [ ]      [ ]   [ ]   [ ]
handover.create                      [✓]    [ ]       [✓]      [ ]   [ ]   [ ]
handover.read                        [✓]    [✓]       [✓]      [R]   [R]   [ ]
handover.confirm                     [✓]    [✓]*      [✓]*     [ ]   [ ]   [ ]
handover.dispute                     [✓]    [✓]*      [✓]*     [ ]   [ ]   [ ]
partner_api_log.read                 [✓]    [✓]       [R]*     [ ]   [ ]   [ ]
...
```

#### 3.14.6 Đối tác tích hợp API (`/admin/partner-clients`) — Mô đun 13

**Mục đích:** ICD cấp danh tính máy-to-máy cho từng hệ thống Partner.

**Danh sách:** Partner code/name, Key last4, scopes, ACTIVE/REVOKED, created, last request, action.

**Tạo Client:**

```text
Partner code*   [text]
Partner name*   [text]
Scopes*         [handover.read, handover.accept, handover.transit, handover.confirm_warehouse]
[Tạo API Client]
```

Sau khi tạo:

```text
API Key mới
pk_live_xxxxxxxxxxxxxxxxx
[Sao chép]
⚠ Chỉ hiển thị một lần.
```

- Backend chỉ lưu hash và last4.
- Rotate tạo key mới, revoke key cũ theo policy.
- Revoke chặn request mới nhưng không xóa lịch sử.
- Mọi action ghi Audit.
- Quyền: ADMIN.

#### 3.14.7 Nhật ký API đối tác (`/admin/partner-api-logs`) — Mô đun 13

**Mục đích:** tra cứu request Partner gọi vào ICD.

**Danh sách:** time, Partner, method, endpoint, container/transport code, HTTP status, business status, error code, request ID, latency.

**Filter:** Partner, endpoint, handover, container, HTTP status, thời gian.

**Detail:** request body đã redact, response, request hash, masked idempotency key, correlation, state transition trước/sau.

Không có nút “retry” từ ICD cho request do Partner gửi. Partner tự retry với cùng Idempotency-Key theo contract.

**Quyền:** ADMIN/MANAGER; OPERATOR chỉ xem subset liên quan nếu policy cho phép.

### 3.15 NHẬT KÝ KIỂM TOÁN (`/activity`)

**Mục đích:** Truy vết mọi thay đổi trong hệ thống.

**Bảng:**

| Cột        | Ghi chú                                      |
| ---------- | -------------------------------------------- |
| Thời gian  | datetime                                     |
| Actor      | User thực hiện                               |
| Hành động  | CREATE / UPDATE / DELETE / SUBMIT...         |
| Entity     | Loại + ID                                    |
| ICD        |                                              |
| Request ID | Link trace theo `X-Request-Id`               |
| Chi tiết   | Xem diff old/new (sensitive fields redacted) |

**Bộ lọc:**

- Actor
- Loại entity
- Khoảng thời gian
- Request ID (search exact)

Mọi thao tác tạo/rotate/revoke Đối tác tích hợp API, Publish Handover, ICD Confirm/Dispute đều vào Audit Log. Request server-to-server của Partner được lưu ở Nhật ký API đối tác; API Key và dữ liệu nhạy cảm luôn redact.

**API:** `GET /api/audit-logs`
**Quyền:** ADMIN, MANAGER

---

## 4. Quy tắc nghiệp vụ áp dụng trên Web

- Frontend chỉ hiển thị action khi backend trả permission/action hợp lệ; không tự suy luận workflow chỉ từ state.
- Gate-in phải kiểm tra Movement Order/Truck Visit/state trước khi submit.
- Lệnh giữ nghiệp vụ/Inspection Hold hiển thị như blocker rõ ràng trên Container Detail và Gate Pass readiness.
- Gate Pass chỉ được tạo khi readiness không còn blocker; Gate-out luôn re-check readiness tại backend.
- Billing không được bill trùng quantity đã bill trước đó; supplemental billing chỉ tính phần phát sinh chưa bill.
- EDI và Bàn giao vận chuyển đều không được ghi đè Container Visit state.
- Partner chỉ state-transition Handover qua External API; ICD Confirm là action nội bộ Web.
- State-changing Partner request phải idempotent; same key + khác payload trả 409.
- API Key chỉ hiển thị plaintext một lần khi tạo/rotate và không xuất hiện trong Audit/API Log.

## 5. Các API chính Web sử dụng

```http
# Auth
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

# Dashboard
GET    /api/reports/summary

# Work Queue
GET    /api/containers/work-queue

# Manifest
GET    /api/manifests
POST   /api/manifests
GET    /api/manifests/:id
POST   /api/manifests/:id/master-bills
POST   /api/master-bills/:id/house-bills
POST   /api/manifests/:id/import-containers

# Container
GET    /api/containers
GET    /api/containers/:id
GET    /api/containers/:id/holds
POST   /api/containers/:id/holds
POST   /api/containers/:id/holds/:holdId/release
GET    /api/containers/:id/holds
POST   /api/containers/:id/holds
POST   /api/containers/:id/holds/:holdId/release

# Truck Visit
GET    /api/gate/truck-visits
POST   /api/gate/truck-visits
POST   /api/gate/truck-visits/:id/arrive
POST   /api/gate/truck-visits/:id/cancel

# Gate-in
POST   /api/containers/:visitId/movement-orders
POST   /api/movement-orders/:orderId/authorize
POST   /api/containers/:visitId/gate-in

# Yard
GET    /api/yard/slots
GET    /api/containers/:visitId/yard/recommendations
POST   /api/containers/:visitId/yard/assign
POST   /api/containers/:visitId/yard/movements
POST   /api/containers/:visitId/inspections
POST   /api/containers/:visitId/yard-bookings

# Billing
GET    /api/containers/:visitId/billing
POST   /api/containers/:visitId/service-orders
POST   /api/service-orders/:orderId/confirm
POST   /api/service-orders/:orderId/invoice
POST   /api/invoices/:invoiceId/payments

# Gate Pass
GET    /api/containers/:visitId/gate-pass
POST   /api/containers/:visitId/gate-pass

# EDI Operations
GET    /api/integrations/edi/outbox
GET    /api/integrations/edi/acknowledgements
GET    /api/integrations/edi/alerts
POST   /api/integrations/edi/outbox/:id/retry

# Reports
GET    /api/reports/summary
GET    /api/reports/export.xlsx

# Admin
GET    /api/admin/settings
PATCH  /api/admin/settings/:key
GET    /api/admin/tariffs
POST   /api/admin/tariffs
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/master-data
POST   /api/admin/master-data/:type
PATCH  /api/admin/master-data/:type/:id

# Module 13 — Internal Handover APIs
GET    /api/handovers
POST   /api/handovers
GET    /api/handovers/:id
POST   /api/handovers/:id/publish
POST   /api/handovers/:id/icd-confirm
POST   /api/handovers/:id/dispute
GET    /api/containers/:visitId/handover-summary

# Admin — Partner API Client / Logs
GET    /api/admin/partner-clients
POST   /api/admin/partner-clients
GET    /api/admin/partner-clients/:id
POST   /api/admin/partner-clients/:id/rotate
POST   /api/admin/partner-clients/:id/revoke
GET    /api/admin/partner-api-logs
GET    /api/admin/partner-api-logs/:id

# External Partner-facing (Partner gọi ICD bằng X-API-Key)
GET    /api/v1/external/handovers
GET    /api/v1/external/handovers/:id
POST   /api/v1/external/handovers/:id/accept
POST   /api/v1/external/handovers/:id/in-transit
POST   /api/v1/external/handovers/:id/warehouse-received

# Audit
GET    /api/audit-logs
```

---

## 6. Yêu cầu phi chức năng — Web

### 6.1 Hiệu năng

- First Contentful Paint (FCP) < 1.5s trên kết nối 4G
- Danh sách container với 5.000 record: render < 2s (dùng virtual scroll)
- Dashboard widget tự refresh mỗi 60s (không reload cả trang)
- Danh sách Handover và Nhật ký API đối tác dùng phân trang/filter server-side; không tải toàn bộ log cùng lúc

### 6.2 Trải nghiệm người dùng

- Skeleton loading thay vì spinner toàn trang
- Optimistic update cho các thao tác đơn giản (thêm ghi chú, cập nhật trạng thái nhỏ)
- Sticky header trên bảng dữ liệu dài
- Toast notification tự đóng sau 4s
- Dialog tạo/rotate Partner API Key plaintext phải cảnh báo rõ đây là lần hiển thị duy nhất

### 6.3 Bảo mật

- Không lưu access token vào localStorage
- CORS chỉ accept từ origin được cấu hình
- CSP header từ backend
- Input sanitization trước khi render HTML
- Partner API Key không bao giờ lưu ở browser/localStorage/URL; Web internal dùng JWT. Partner API Key chỉ được trả một lần từ backend khi create/rotate Client

### 6.4 Trình duyệt hỗ trợ

- Chrome ≥ 110
- Edge ≥ 110
- Firefox ≥ 110
- Safari ≥ 16 (basic support)
- Responsive: tablet ≥ 768px

### 6.5 Khả năng tiếp cận

- Contrast ratio WCAG AA
- Keyboard navigation cho form chính
- ARIA labels trên icon-only buttons
