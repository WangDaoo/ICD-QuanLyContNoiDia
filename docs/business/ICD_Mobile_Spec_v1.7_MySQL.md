# Đặc tả Ứng dụng Mobile

# ICD Management System — Mobile Application

**Phiên bản:** 1.7 — Business-focused / Detailed Partner Handover  
**Nền tảng:** iOS 14+ / Android 10+  
**Tech stack:** React Native + Expo + TypeScript + React Navigation  
**API base:** `http://<server>/api`

> **Định hướng:** Mobile tập trung tác nghiệp hiện trường. Mọi action phải trả lời rõ nhân viên cần làm gì, điều kiện nào cho phép thao tác và lỗi được xử lý ra sao.

> **Module 13:** ICD là API Provider cho Partner. Mobile ICD vẫn chỉ làm việc với ICD Backend bằng JWT; không giữ Partner API Key. Internal staff chỉ xem `Transport Handover` read-only khi cần, còn Partner confirmation và ICD confirmation được xử lý qua External API/Web.

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

Mobile app phục vụ tác nghiệp hiện trường — các thao tác cần thực hiện nhanh tại cổng hoặc trong yard, không cần ngồi trước máy tính. Tốc độ, độ tin cậy khi mạng yếu, và khả năng scan/chụp ảnh là ưu tiên hàng đầu.

Mobile là công cụ _thực thi_, không phải công cụ _quản lý_. Mọi quyết định nghiệp vụ quan trọng (tạo billing, phê duyệt, cấu hình) thực hiện trên Web. Đối tác tích hợp API/API Key được quản lý trên Web Admin. Mobile chỉ đọc Handover summary để nhân viên hiện trường biết container sau Gate-out đang ở bước bàn giao nào; Mobile không điều phối chuyến vận chuyển Partner.

### 1.2 Đối tượng người dùng

| Role         | Thiết bị         | Nhiệm vụ chính                                          |
| ------------ | ---------------- | ------------------------------------------------------- |
| `GATE_STAFF` | Mobile (chủ yếu) | Gate-in, scan Gate Pass, xác nhận gate-out              |
| `YARD_STAFF` | Mobile (chủ yếu) | Cập nhật vị trí, hoàn tất inspection/stripping/movement |
| `CONSIGNEE`  | Mobile (chủ yếu) | Tra cứu container, xem billing, nhận thông báo          |
| `AGENT`      | Mobile (phụ)     | Tra cứu container được cấp quyền                        |

### 1.3 Tech stack

```
React Native        — Cross-platform mobile framework
Expo SDK            — Build, OTA update, native APIs
TypeScript          — Type safety
React Navigation    — Stack + Tab navigation
TanStack Query      — Server state, cache, background refetch
Axios               — HTTP client + JWT interceptor
Expo Camera         — QR scan, chụp ảnh
Expo Notifications  — Push notification (FCM/APNs — roadmap)
AsyncStorage        — Lưu token, cache offline cơ bản
NetInfo             — Detect kết nối mạng
```

---

## 2. Kiến trúc màn hình & Điều hướng

### 2.1 Cấu trúc Navigation

```
Stack Navigator (root)
│
├── AuthStack
│   └── LoginScreen
│
└── MainStack (sau login)
    │
    ├── Bottom Tab Navigator
    │   ├── Tab: Home (Danh sách công việc)
    │   ├── Tab: Scan (Tiếp nhận vào cổng / Xác nhận ra cổng)
    │   ├── Tab: Containers
    │   └── Tab: Profile
    │
    └── Stack Screens (overlay từ tabs)
        ├── GateInFlow
        │   ├── GateInScanScreen
        │   ├── GateInFormScreen
        │   └── GateInSuccessScreen
        │
        ├── GateOutFlow
        │   ├── GatePassScanScreen
        │   └── GateOutConfirmScreen
        │
        ├── YardAssignScreen
        ├── YardOperationDetailScreen
        │   ├── InspectionCompleteForm
        │   ├── MovementCompleteForm
        │   └── BookingCompleteForm
        │
        ├── ContainerDetailScreen
        ├── HandoverSummarySheet (read-only, internal staff)
        └── NotificationScreen
```

### 2.2 Bottom Tab Bar

```
┌──────────┬──────────┬──────────┬──────────┐
│          │          │          │          │
│  Home    │   Scan   │ Containers│ Profile │
│  [N]     │   [●]    │          │          │
│ Work Q.  │ Tiếp nhận vào cổng  │  Search  │ Settings │
└──────────┴──────────┴──────────┴──────────┘
```

- Home badge: số task urgent trong Work Queue
- Scan tab: nút lớn nổi bật — đây là action chính của Gate Staff
- Tab bar ẩn khi đang ở màn hình con (GateInFlow, GateOutFlow)

---

## 3. Màn hình chi tiết

### 3.1 ĐĂNG NHẬP / XÁC THỰC

**Layout:**

```
┌─────────────────────────────┐
│                             │
│     [Logo ICD]              │
│                             │
│  Email                      │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  Mật khẩu                   │
│  ┌─────────────────────┐   │
│  │             [👁]    │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │      Đăng nhập      │   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Logic:**

- POST `/api/auth/login`
- Lưu `accessToken` + `refreshToken` vào AsyncStorage
- Axios interceptor: 401 → auto refresh → retry
- Nếu refresh fail → clear tokens → redirect về Login
- Sau login → kiểm tra role → điều hướng phù hợp:
  - GATE_STAFF → Tab Scan
  - YARD_STAFF → Tab Home
  - CONSIGNEE → Tab Containers
  - AGENT → Tab Containers

**UX:**

- Keyboard type: `email-address` cho email field
- `secureTextEntry` cho password field
- Loading spinner trên nút trong khi đang gọi API
- Error message inline bên dưới form

---

### 3.2 TRANG CHỦ — Danh sách công việc

**Mục đích:** Danh sách việc cần làm ngay, lọc theo role đang đăng nhập.

**Layout:**

```
┌─────────────────────────────┐
│  Công việc hôm nay      [↺] │
│  Xin chào, Minh ✋          │
├─────────────────────────────┤
│  [OVERDUE]                  │
│  CSQU3054383                │
│  Tiếp nhận vào cổng · Quá 45 phút     │
│  Truck: 51A-12345      [→]  │
├─────────────────────────────┤
│  [HIGH]                     │
│  MSCU6639870                │
│  Xếp vị trí bãi · 15 phút      │
│  40HC · 28,500 kg      [→]  │
├─────────────────────────────┤
│  [MEDIUM]                   │
│  TCKU1234567                │
│  Tác nghiệp bãi · Inspection      │
│  B/R02/Bay01/T1        [→]  │
├─────────────────────────────┤
│  [NORMAL]                   │
│  HLXU2345678                │
│  Xác nhận ra cổng · Phiếu ra cổng OK    │
│  Hết hạn: 2 giờ nữa    [→]  │
└─────────────────────────────┘
```

**Task card hiển thị:**

- Badge urgency (OVERDUE đỏ / HIGH cam / MEDIUM vàng / NORMAL xanh lá)
- Số container
- Loại task
- Thông tin ngắn (xe, thời gian còn lại, vị trí...)
- Chevron → tap để thực hiện

**Behavior:**

- Pull-to-refresh
- Auto refresh mỗi 60s (background)
- Nếu không có task → "Không có việc cần làm" + icon minh hoạ
- Tap vào task card → điều hướng đến flow tương ứng:
  - `GATE_IN` → GateInFlow (bắt đầu từ GateInScanScreen)
  - `YARD_ASSIGN` → YardAssignScreen
  - `YARD_OPERATIONS` → YardOperationDetailScreen
  - `GATE_OUT` → GatePassScanScreen

**API:** `GET /api/containers/work-queue`

---

### 3.3 QUY TRÌNH TIẾP NHẬN VÀO CỔNG

Luồng 3 bước để tiếp nhận container vào cổng.

#### Bước 1: Scan / Nhập số container (`GateInScanScreen`)

**Layout:**

```
┌─────────────────────────────┐
│  ← Tiếp nhận vào cổng                  │
├─────────────────────────────┤
│                             │
│  ┌─── Camera Viewfinder ──┐ │
│  │                        │ │
│  │   [   ___________  ]   │ │
│  │   Đặt số container     │ │
│  │   vào khung này        │ │
│  │                        │ │
│  └────────────────────────┘ │
│                             │
│        - hoặc -             │
│                             │
│  Nhập thủ công:             │
│  ┌─────────────────────┐   │
│  │ CSQU3054383         │   │
│  └─────────────────────┘   │
│  [Xác nhận]                 │
└─────────────────────────────┘
```

**Khi scan/nhập thành công:**

- Validate ISO 6346 trên client
- Gọi API tìm container
- Nếu tìm thấy và trạng thái hợp lệ → chuyển sang Bước 2
- Nếu không hợp lệ → alert rõ lý do

**Trường hợp lỗi:**

- Container không tồn tại trong hệ thống → "Không tìm thấy container"
- Container đã IN_YARD → "Container đã được gate-in"
- Container thiếu Movement Order → "Chưa có lệnh vận chuyển"

#### Bước 2: Nhập thông tin tiếp nhận (`GateInFormScreen`)

**Layout:**

```
┌─────────────────────────────┐
│  ← CSQU3054383       Bước 2/3│
├─────────────────────────────┤
│  Loại: 40HC                 │
│  Seal manifest: SL123456    │
├─────────────────────────────┤
│  Seal thực tế*              │
│  ┌─────────────────────┐   │
│  │ SL123456            │   │
│  └─────────────────────┘   │
│  ⚠ Khác manifest! Ghi chú? │
│                             │
│  Trọng lượng thực tế (kg)   │
│  ┌─────────────────────┐   │
│  │ 28500               │   │
│  └─────────────────────┘   │
│                             │
│  Tình trạng vật lý          │
│  ┌─────────────────────┐   │
│  │ Bình thường         │   │
│  └─────────────────────┘   │
│                             │
│  Truck Visit                │
│  [Chọn chuyến xe ▼]         │
│  Hoặc nhập thủ công:        │
│  Biển số* [51A-12345]       │
│  Tài xế*  [Nguyễn Văn A]   │
│                             │
│  📷 Ảnh seal container      │
│  [Chụp ảnh] [Thư viện]      │
│  [thumbnail ảnh đã chụp]    │
│                             │
│  [Tiếp tục →]               │
└─────────────────────────────┘
```

**Logic:**

- Seal thực tế khác manifest → highlight đỏ + yêu cầu điền ghi chú
- Truck Visit dropdown chỉ hiện các chuyến `ARRIVED`
- Ảnh seal: optional nhưng recommended

#### Bước 3: Xác nhận (`GateInSuccessScreen`)

```
┌─────────────────────────────┐
│                             │
│        ✓ Tiếp nhận vào cổng OK         │
│                             │
│  Container: CSQU3054383     │
│  Thời gian: 01/09/2026 08:30│
│  Vị trí Yard: chưa assign   │
│                             │
│  [Giao task Xếp vị trí bãi]    │
│                             │
│  [Về Danh sách công việc]            │
└─────────────────────────────┘
```

- Nếu container chưa có Yard position → gợi ý tạo task YARD_ASSIGN
- Nút "Giao task" → tạo notification cho YARD_STAFF (roadmap)
- Gate-in kết thúc hoàn toàn theo business rule ICD. Bàn giao vận chuyển không phải điều kiện Gate-in và thường chỉ được tạo ở giai đoạn sau; Mobile không chờ hoặc gọi External Partner API.

**API:** `POST /api/containers/:visitId/gate-in`

---

### 3.4 MÀN HÌNH XẾP VỊ TRÍ BÃI

**Mục đích:** Nhân viên yard chọn vị trí đặt container sau khi gate-in.

**Layout:**

```
┌─────────────────────────────┐
│  ← Assign Yard              │
│  CSQU3054383 · 40HC · 28.5t │
├─────────────────────────────┤
│  Gợi ý vị trí               │
├─────────────────────────────┤
│  #1  A/R02/B03/T1   ★92    │
│      Gần cổng · tải OK [✓]  │
├─────────────────────────────┤
│  #2  B/R01/B05/T2   ★85    │
│      Cùng khu consignee [✓] │
├─────────────────────────────┤
│  #3  C/R04/B01/T1   ★78    │
│      Xa cổng hơn       [✓]  │
├─────────────────────────────┤
│  Chọn thủ công:             │
│  Block [A▼] Row[01▼]        │
│  Bay  [01▼] Tier[1▼]        │
│  [Kiểm tra] → Hợp lệ        │
│  [Xác nhận thủ công]        │
└─────────────────────────────┘
```

**Logic:**

- List recommendation từ API (rule-based + ML nếu enabled)
- Mỗi item hiển thị: vị trí, score, lý do ngắn (max 2 điểm)
- Tap vào item → confirm dialog → assign
- Chọn thủ công: validate trước khi cho assign (kiểm tra occupied, kích thước, reefer)

**Feedback ML:**
Khi nhân viên chọn một slot → backend tự động ghi lại feedback (selected=1 cho slot được chọn, selected=0 cho các slot còn lại) để training ML sau này.

**API:**

- `GET /api/containers/:visitId/yard/recommendations`
- `POST /api/containers/:visitId/yard/assign`

---

### 3.5 TÁC NGHIỆP BÃI

**Mục đích:** Nhân viên yard ghi nhận kết quả các thao tác trong yard.

#### 3.5.1 Danh sách tác nghiệp bãi

```
┌─────────────────────────────┐
│  ← Tác nghiệp bãi: MSCU6639870    │
│  B/R01/Bay05/T2             │
├─────────────────────────────┤
│  PENDING                    │
│  Internal Movement          │
│  → A/R03/Bay02/T1           │
│  Lệnh: 2 giờ trước   [Bắt đầu]│
├─────────────────────────────┤
│  IN_PROGRESS                │
│  Inspection – Hải quan      │
│  Bắt đầu: 09:15      [Hoàn tất]│
├─────────────────────────────┤
│  PENDING                    │
│  Stripping Booking          │
│  Lịch: 10:00          [Bắt đầu]│
└─────────────────────────────┘
```

#### 3.5.2 Hoàn tất di chuyển nội bộ (`MovementCompleteForm`)

```
┌─────────────────────────────┐
│  ← Hoàn tất Movement        │
│                             │
│  Từ: A/R02/B03/T1           │
│  Đến: B/R01/B05/T2          │
│                             │
│  Xác nhận container đã đến  │
│  đúng vị trí?               │
│                             │
│  Ghi chú (tuỳ chọn)         │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  [Huỷ]  [Xác nhận hoàn tất] │
└─────────────────────────────┘
```

**Sau hoàn tất:**

- Location log cũ đóng lại
- Location log mới mở với vị trí mới
- Container location = vị trí mới

**API:**

- `POST /api/yard/movements/:movementId/start`
- `POST /api/yard/movements/:movementId/complete`

#### 3.5.3 Hoàn tất kiểm định (`InspectionCompleteForm`)

```
┌─────────────────────────────┐
│  ← Hoàn tất Inspection      │
│  MSCU6639870 · Hải quan      │
├─────────────────────────────┤
│  Kết quả*                   │
│  ○ PASS                     │
│  ○ FAIL                     │
│  ○ HOLD                     │
│                             │
│  Ghi chú*                   │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  📷 Đính kèm biên bản       │
│  [Chụp ảnh] [Thư viện]      │
│                             │
│  [Xác nhận]                 │
└─────────────────────────────┘
```

**Logic:**

- Kết quả `HOLD` → sẽ trở thành blocker Gate Pass (`INSPECTION_HOLD`)
- Ghi chú bắt buộc khi FAIL hoặc HOLD

**API:** `POST /api/inspections/:inspectionId/complete`

#### 3.5.4 Hoàn tất lịch rút hàng (`BookingCompleteForm`)

```
┌─────────────────────────────┐
│  ← Hoàn tất Stripping       │
│  MSCU6639870                │
├─────────────────────────────┤
│  Số kiện thực tế            │
│  ┌─────────────────────┐   │
│  │ 120                 │   │
│  └─────────────────────┘   │
│                             │
│  Trọng lượng thực tế (kg)   │
│  ┌─────────────────────┐   │
│  │ 18000               │   │
│  └─────────────────────┘   │
│                             │
│  Tình trạng hàng            │
│  ┌─────────────────────┐   │
│  │ Bình thường         │   │
│  └─────────────────────┘   │
│                             │
│  📷 Ảnh hàng hoá            │
│  [Chụp ảnh]                 │
│                             │
│  [Xác nhận hoàn tất]        │
└─────────────────────────────┘
```

**API:** `POST /api/yard/movements/:movementId/complete` (hoặc endpoint tương đương cho booking)

---

### 3.6 QUY TRÌNH XÁC NHẬN RA CỔNG (Quét Phiếu ra cổng)

Luồng xác nhận container rời khỏi ICD.

#### Bước 1: Quét QR Phiếu ra cổng (`GatePassScanScreen`)

```
┌─────────────────────────────┐
│  ← Xác nhận ra cổng                 │
├─────────────────────────────┤
│                             │
│  ┌─── Camera Viewfinder ──┐ │
│  │                        │ │
│  │   [  ___QR code___  ]  │ │
│  │   Scan QR trên Gate    │ │
│  │   Pass                 │ │
│  │                        │ │
│  └────────────────────────┘ │
│                             │
│        - hoặc -             │
│                             │
│  Nhập mã Phiếu ra cổng:         │
│  ┌─────────────────────┐   │
│  │ GP-2026-0342        │   │
│  └─────────────────────┘   │
│  [Tra cứu]                  │
│                             │
└─────────────────────────────┘
```

**Khi scan thành công:**

- Gọi `POST /api/gate-pass/scan` với token từ QR
- Backend kiểm tra: Gate Pass còn active? Đúng container? Readiness còn pass?
- Nếu valid → chuyển Bước 2
- Nếu invalid → hiển thị lý do rõ ràng

**Trường hợp lỗi:**

- Gate Pass hết hạn (EXPIRED) → "Gate Pass đã hết hạn, vui lòng liên hệ văn phòng"
- Gate Pass đã dùng (USED) → "Gate Pass này đã được sử dụng"
- Gate Pass bị huỷ (CANCELLED) → "Gate Pass đã bị huỷ"
- Readiness fail → hiển thị danh sách blocker, bao gồm `INSPECTION_HOLD` / `OPERATIONAL_HOLD` nếu có; nhân viên cổng không được bypass

#### Bước 2: Xác nhận ra cổng (`GateOutConfirmScreen`)

```
┌─────────────────────────────┐
│  ← Xác nhận ra cổng          │
├─────────────────────────────┤
│  Phiếu ra cổng: GP-2026-0342    │
│  Container: CSQU3054383     │
│  Consignee: ABC Trading     │
│  Hết hạn: còn 2 giờ 30 phút│
├─────────────────────────────┤
│  Thông tin xe               │
│  Biển số: 51B-54321         │
│  Tài xế: Trần Văn B         │
│  Người nhận: Lê Thị C       │
│  CMND: 0123456789           │
├─────────────────────────────┤
│  Readiness:                 │
│  ✓ Thanh toán đủ            │
│  ✓ Không có Hold            │
│  ✓ Phiếu ra cổng hợp lệ         │
├─────────────────────────────┤
│  📷 Ảnh xe rời cổng         │
│  [Chụp ảnh]  [Bỏ qua]       │
│                             │
│  [XÁC NHẬN GATE-OUT]        │
│  (giữ 2 giây để xác nhận)   │
└─────────────────────────────┘
```

**UX đặc biệt:**

- Nút "Xác nhận Gate-out" yêu cầu **nhấn giữ 2 giây** để tránh tap nhầm (long press)
- Countdown timer trực quan trên nút

**Sau gate-out:**

- Gate-out thành công commit theo business rule ICD trước: Container Visit → `EXITED`, Gate Pass → `USED`. Sau đó Web/Backend có thể tạo/Publish Bàn giao vận chuyển theo policy. Partner chưa accept hoặc Delivery Failed **không rollback Gate-out**.
- Mobile có thể hiển thị Handover summary sau refresh nhưng không có action quản trị Partner API hoặc ICD Confirm.

```
┌─────────────────────────────┐
│                             │
│        ✓ Xác nhận ra cổng OK        │
│                             │
│  Container: CSQU3054383     │
│  Thời gian: 01/09 14:30     │
│  Tổng lưu: 3 ngày           │
│                             │
│  [Về Danh sách công việc]            │
└─────────────────────────────┘
```

**API:** `POST /api/gate-out` (với visitId và gate pass token)

---

### 3.7 TAB CONTAINER — Tra cứu container

**Mục đích:** Tìm kiếm nhanh thông tin container — chủ yếu cho Consignee và Agent.

#### 3.7.1 Màn hình tìm kiếm

```
┌─────────────────────────────┐
│  Container           [🔔 2] │
├─────────────────────────────┤
│  ┌──────────────────────┐  │
│  │ 🔍 Tìm số container  │  │
│  └──────────────────────┘  │
│                             │
│  Gần đây:                   │
│  CSQU3054383   IN_YARD  →   │
│  MSCU6639870   IN_YARD  →   │
│  TCKU1234567   EXITED   →   │
│                             │
│  ─────────────────────────  │
│                             │
│  Container của tôi (3)      │
│  [Xem tất cả →]             │
│                             │
│  HLXU2345678   IN_YARD  →   │
│  Lưu: 5 ngày · 2,400,000₫  │
│                             │
└─────────────────────────────┘
```

**Logic:**

- Consignee chỉ thấy container của mình (`container.consignee_id = user.consignee_id`)
- Agent thấy theo scope được cấp quyền
- GATE/YARD_STAFF thấy tất cả trong ICD
- Search: nhập số container → filter realtime hoặc debounce 300ms

#### 3.7.2 Chi tiết container (Mobile)

Bản rút gọn của màn hình Container Detail Web, tập trung vào thông tin cần thiết cho Consignee.

```
┌─────────────────────────────┐
│  ← CSQU3054383              │
│                             │
│  [IN_YARD]  40HC            │
│  Consignee: ABC Trading Co. │
│  Tiếp nhận vào cổng: 01/09/2026 08:30  │
│  Lưu kho: 3 ngày           │
│                             │
│  Vị trí: A/R02/Bay03/T1     │
│                             │
│  ─── Billing ───────────────│
│  Tổng phí:    3,700,000₫   │
│  Đã TT:       1,500,000₫   │
│  Còn lại:     2,200,000₫   │
│                             │
│  ─── Readiness ─────────────│
│  ✓ Có vị trí Yard           │
│  ✗ Còn 2,200,000₫ chưa TT   │
│  ✓ Không có Hold            │
│                             │
│  ─── Bàn giao vận chuyển* ─────────────│
│  Status: IN_TRANSIT         │
│  VC-2026-001 · ABC Logistics│
│                             │
│  ─── Timeline ──────────────│
│  14:30  Phiếu ra cổng hết hạn   │
│  11:00  Invoice INV-001     │
│  08:30  Tiếp nhận vào cổng thành công  │
│                             │
└─────────────────────────────┘
```

**Consignee không thấy:** thông tin xe/tài xế nội bộ, nhân viên tiếp nhận, Nhật ký API đối tác/API Key; Handover chỉ hiển thị nếu product policy cho phép chia sẻ trạng thái giao nhận.

**Bàn giao vận chuyển:** nhân viên nội bộ chỉ xem tóm tắt read-only; review/ICD Confirm thực hiện trên Web.

---

### 3.8 TAB TÀI KHOẢN

```
┌─────────────────────────────┐
│  Tài khoản                  │
├─────────────────────────────┤
│  [Avatar]                   │
│  Nguyễn Văn A               │
│  gate@icd.local             │
│  Role: Gate Staff           │
├─────────────────────────────┤
│  ICD: ICD Hưng Yên          │
├─────────────────────────────┤
│  Thông báo              [≡] │
│  Ngôn ngữ             [VI▼] │
│  Phiên bản            1.3.0 │
├─────────────────────────────┤
│  [Đăng xuất]               │
└─────────────────────────────┘
```

**Thông báo settings (roadmap — khi push notification live):**

- Gate Pass sắp hết hạn
- Container sắp hết free days
- Task mới trong Work Queue

---

### 3.9 THÔNG BÁO (Lộ trình)

**Khi push notification được triển khai (FCM Android / APNs iOS):**

| Trigger                          | Người nhận          | Nội dung                                 |
| -------------------------------- | ------------------- | ---------------------------------------- |
| Gate Pass sắp hết hạn (2h trước) | CONSIGNEE, OPERATOR | "Gate Pass CSQU... hết hạn lúc 15:30"    |
| Container sắp hết free days      | OPERATOR, MANAGER   | "MSCU... còn 1 ngày free storage"        |
| Gate-out thành công              | CONSIGNEE           | "Container CSQU... đã rời ICD lúc 14:30" |
| Inspection HOLD                  | OPERATOR            | "Kiểm định MSCU... kết quả HOLD"         |
| Task mới GATE_IN                 | GATE_STAFF          | "Container CSQU... đến cổng"             |

**Màn hình Notification Center:**

```
┌─────────────────────────────┐
│  ← Thông báo                │
├─────────────────────────────┤
│  Hôm nay                    │
│  ─────────────────────────  │
│  14:30  Phiếu ra cổng sắp HH    │
│  CSQU3054383 · còn 2 giờ   │
│                       [→]   │
├─────────────────────────────┤
│  Hôm qua                    │
│  ─────────────────────────  │
│  09:15  Xác nhận ra cổng OK         │
│  MSCU6639870 đã rời ICD     │
│                       [→]   │
└─────────────────────────────┘
```

---

### 3.10 BÀN GIAO VẬN CHUYỂN — Mô đun 13 (Chỉ xem)

**Mục đích:** giúp Gate/Yard Staff biết trạng thái bàn giao sau Gate-out khi cần tra cứu, nhưng không biến Mobile ICD thành ứng dụng vận chuyển của Partner.

```text
Bàn giao vận chuyển
Transport code: VC-2026-001
Partner: ABC Logistics
Kho: Kho ABC
Status: PARTNER_CONFIRMED
Đối tác đã xác nhận: 18/09 15:30
Chờ ICD xác nhận trên Web
```

**Status có thể hiển thị:**

- `DRAFT`;
- `READY_FOR_HANDOVER`;
- `PARTNER_ACCEPTED`;
- `IN_TRANSIT`;
- `PARTNER_CONFIRMED`;
- `COMPLETED`;
- `PARTNER_REJECTED / DELIVERY_FAILED / DISPUTED`.

**Quy tắc:**

- Mobile không hiển thị Partner API Key.
- Không hiển thị request/response body hoặc full Idempotency-Key.
- Không có Rotate/Revoke Client.
- Không có External API actions thay mặt Partner.
- Mặc định không có nút `ICD Confirm`; đây là quyết định văn phòng trên Web.
- Handover status không thay Container Visit state.

**Khi status bất thường:**

- `DELIVERY_FAILED`: hiển thị reason ngắn và “Vui lòng xem chi tiết trên Web”.
- `DISPUTED`: hiển thị cảnh báo read-only.
- Không cho Gate/Yard Staff tự sửa trạng thái Handover.

## 4. Camera & Scan

### 4.1 Scan

- Scan QR Gate Pass khi Gate-out.
- Có thể scan barcode/container number nếu nhãn hỗ trợ.
- Luôn có fallback nhập tay khi camera/QR không dùng được.
- Sau scan phải hiển thị kết quả validation rõ ràng trước action quan trọng.

### 4.2 Chụp ảnh

Ảnh dùng cho seal/tình trạng container/inspection/stripping. Ứng dụng hiển thị preview, cho phép chụp lại và giảm kích thước trước upload để phù hợp mạng hiện trường.

## 5. Offline & Kết nối yếu

### 5.1 Phát hiện trạng thái kết nối

Dùng `@react-native-community/netinfo`:

```typescript
// Banner cảnh báo khi mất mạng
useNetInfo().isConnected === false
  → hiển thị banner "Không có kết nối mạng"
```

### 5.2 Bộ nhớ đệm dữ liệu (TanStack Query)

Các dữ liệu được cache để xem offline:

- Work Queue (staleTime: 5 phút)
- Container đã xem gần đây, bao gồm `handover_summary` read-only nếu backend trả về (staleTime: 10 phút)
- Profile + permissions (staleTime: 30 phút)

**Behavior khi offline:**

- Hiển thị dữ liệu từ cache với banner "Dữ liệu từ cache"
- Disable các nút action (Gate-in, Gate-out) — các thao tác này cần online
- Handover summary chỉ hiển thị từ cache; Mobile không tự gửi External Partner API request
- Auto retry query ICD Backend khi mạng trở lại

### 5.3 Không hỗ trợ offline-first

Mobile **không** hỗ trợ queue action offline (ví dụ: submit gate-in khi mất mạng, sync lại sau). Lý do: gate-in/gate-out là nghiệp vụ có tính nhất quán cao, cần server validation ngay lập tức.

---

## 6. Các API chính Mobile sử dụng

```http
# Auth
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

# Work Queue
GET    /api/containers/work-queue

# Gate-in
POST   /api/containers/:visitId/movement-orders
POST   /api/movement-orders/:orderId/authorize
POST   /api/containers/:visitId/gate-in

# Truck Visits (Gate Staff)
GET    /api/gate/truck-visits
POST   /api/gate/truck-visits/:id/arrive

# Yard (Yard Staff)
GET    /api/containers/:visitId/yard/recommendations
POST   /api/containers/:visitId/yard/assign
GET    /api/containers/:visitId/yard/operations
POST   /api/yard/movements/:movementId/start
POST   /api/yard/movements/:movementId/complete
POST   /api/inspections/:inspectionId/start
POST   /api/inspections/:inspectionId/complete
POST   /api/containers/:visitId/yard-bookings

# Gate-out
POST   /api/gate-pass/scan
POST   /api/gate-out

# Container (Consignee / Agent / Internal staff)
GET    /api/containers
GET    /api/containers/:id              # Có thể kèm handover_summary theo permission
GET    /api/containers/:id/holds

# Transport Handover
GET    /api/containers/:id/handover-summary
# Mobile không gọi /api/v1/external/* và không dùng Partner API Key.

# Notifications (Roadmap)
POST   /api/notifications/register-device
DELETE /api/notifications/unregister-device
GET    /api/notifications/history
```

---

## 7. Yêu cầu phi chức năng — Mobile

### 7.1 Hiệu năng

- App startup (cold start) < 3s
- Màn hình Work Queue load < 1.5s (từ cache); < 3s (từ network)
- Camera scan phản hồi < 200ms sau khi nhận diện QR

### 7.2 Pin & Tài nguyên

- Camera chỉ active khi đang ở màn hình scan — tắt khi navigate đi
- Background fetch (Work Queue refresh) không chạy liên tục — dùng pull-to-refresh thay thế
- Image upload: compress trước khi gửi để tiết kiệm data

### 7.3 Trải nghiệm người dùng

- Haptic feedback: scan thành công, gate-out confirm
- Toàn bộ màn hình action (Gate-in, Gate-out) có nút Back rõ ràng
- Confirm dialog cho action không thể undo (gate-out, approve)
- Long press 2s cho gate-out để tránh tap nhầm
- Font size tối thiểu 16px cho field label, 14px cho secondary text (đọc ngoài trời)

### 7.4 Bảo mật

- Không hardcode API endpoint hay token
- Token refresh tự động, không yêu cầu login lại trong ca làm việc
- **Không lưu hoặc nhận Partner API Key trên Mobile**; key chỉ được cấp cho hệ thống Partner bên ngoài
- Mobile chỉ gọi ICD internal API bằng JWT/RBAC
- Không hiển thị full Idempotency-Key, Partner request/response hoặc secret
- Biometric lock tùy chọn (TouchID/FaceID) — roadmap

### 7.5 Phạm vi triển khai

- Staging và production dùng endpoint ICD Backend tương ứng.
- Partner API Key không được đóng gói trong Mobile ICD.

---

## 8. Ranh giới Mobile với Module 13

```text
[Mobile Gate/Yard ICD]
      ↓ JWT / Internal API
[ICD Backend / Core ICD]
      │
      ├── Bàn giao vận chuyển
      │
      └── External Partner API ← X-API-Key ← [Partner System]
```

- Mobile là client nội bộ của ICD Backend.
- Partner System là client máy-to-máy riêng, không dùng Mobile ICD.
- Gate-in/Gate-out không phụ thuộc việc Partner có online hay không.
- Mobile chỉ xem Handover summary; ICD Confirm/Dispute và API Client management thuộc Web.
- Partner API không có quyền thay đổi Gate/Yard/Billing của ICD.
