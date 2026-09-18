# Đặc tả Nghiệp vụ Tổng thể
# Hệ thống Quản lý Kho bãi Container Nội địa (ICD)

**Phiên bản:** 1.7 — Business-focused / Core ICD + Partner Handover

> **Định hướng tài liệu:** đây là đặc tả nghiệp vụ cho đồ án tốt nghiệp. Trọng tâm là actor, use case, luồng xử lý, trạng thái, business rule, ngoại lệ và cách các mô đun phối hợp. Chi tiết build/migration/test framework được tách khỏi tài liệu này.

> **Kiến trúc tích hợp đã chốt:** nghiệp vụ ICD vẫn độc lập hoàn toàn từ Manifest đến Gate-out. ICD là **API Provider** cho hệ thống Logistics/Transport Partner. ICD cấp API Key cho từng Partner; Partner chỉ được đọc dữ liệu `Transport Handover` được cấp và gửi các xác nhận vận chuyển/kho nhận. Sau khi Partner xác nhận kho đã nhận, ICD vẫn thực hiện bước xác nhận cuối cùng. Module 13 là lớp mở rộng, không thay đổi state Gate/Yard/Billing của ICD.

**Nền tảng:** Web Application + Mobile Application + External Integrations
**CSDL triển khai:** MySQL 8.x (InnoDB) + Prisma ORM
**Đối tượng:** Kho bãi container nội địa, doanh nghiệp logistics vừa và nhỏ

---

## Quy ước ngôn ngữ và thuật ngữ

Tài liệu sử dụng **tiếng Việt cho tên nghiệp vụ, tên màn hình, nhãn hiển thị và thao tác của người dùng trong nước**. Ở lần xuất hiện đầu tiên, một số thuật ngữ logistics quốc tế được ghi kèm tên tiếng Anh để thuận tiện đối chiếu.

Các thành phần kỹ thuật giữ nguyên tiếng Anh để đồng nhất khi phát triển và tích hợp:

- tên bảng/cột CSDL: `container_visit`, `transport_handover`, `partner_api_client`;
- enum/trạng thái kỹ thuật: `IN_YARD`, `READY_FOR_HANDOVER`, `PARTNER_CONFIRMED`;
- API route: `/api/v1/external/handovers`;
- permission, class/function, request/response field;
- chuẩn quốc tế: EDI, CODECO, MBL, HBL, ISO 6346.

| Tên hiển thị nghiệp vụ | Thuật ngữ kỹ thuật |
|---|---|
| Tiếp nhận vào cổng | Gate-in |
| Xác nhận ra cổng | Gate-out |
| Phiếu ra cổng | Gate Pass |
| Chuyến xe ra/vào | Truck Visit |
| Vị trí bãi | Yard Slot |
| Dịch vụ & Thanh toán | Billing |
| Bàn giao vận chuyển | Transport Handover |
| Xác nhận của đối tác | Partner Confirmation |
| Nhật ký API đối tác | Partner API Log |

---

## 1. Tổng quan hệ thống

### 1.1 Bối cảnh

Kho bãi container nội địa (ICD — Inland Container Depot) là mắt xích quan trọng trong chuỗi logistics xuất nhập khẩu. Tại đây, hàng hoá được tập kết, phân loại, kiểm định hải quan và bàn giao cho chủ hàng trước khi lưu thông nội địa.

Hiện nay phần lớn ICD quy mô vừa tại Việt Nam vẫn quản lý nghiệp vụ thủ công qua Excel, sổ sách hoặc phần mềm rời rạc — gây ra các vấn đề: mất thông tin container, không kiểm soát được tình trạng thanh toán, không theo dõi được vòng đời container realtime, thiếu báo cáo tổng hợp cho ban quản lý, và thiếu một kênh tích hợp có kiểm soát khi các hệ thống đối tác bên ngoài (ví dụ hệ thống quản lý kho vận và vận chuyển đơn hàng liên miền) cần trao đổi dữ liệu container với ICD.

### 1.2 Mục tiêu dự án

Xây dựng hệ thống quản lý ICD tích hợp trên nền tảng **Web + Mobile**, bao gồm:

- Số hoá toàn bộ luồng nghiệp vụ từ nhập manifest đến gate-out
- Theo dõi vòng đời container realtime trong yard
- Tự động tính phí dịch vụ và kiểm soát thanh toán
- Cung cấp dashboard và báo cáo cho ban quản lý
- Hỗ trợ nhân viên tác nghiệp hiện trường qua ứng dụng mobile
- Cung cấp **Tích hợp bàn giao đối tác (Module 13)** để ICD cấp API dữ liệu container/handover cho hệ thống Logistics/Transport Partner; Partner cập nhật trạng thái vận chuyển và xác nhận kho nhận bằng API Key do ICD cấp; ICD xác nhận cuối cùng trước khi đóng Handover

### 1.3 Phạm vi hệ thống

Hệ thống gồm các mô đun nghiệp vụ và mô đun hỗ trợ sau:

| STT | Mô đun | Trách nhiệm chính |
|-----|--------|-------------------|
| 1 | Bản lược khai hàng hóa (Manifest) & Vận đơn | Manifest, MBL, HBL, danh sách container |
| 2 | Quản lý container | Tra cứu, timeline, trạng thái Container Visit |
| 3 | Tiếp nhận vào cổng (Gate-in) | Movement Order, Truck Visit, Reception, xác nhận vào cổng |
| 4 | Quản lý bãi container (Yard) | Vị trí, assign slot, movement, inspection, stripping/booking |
| 5 | Dịch vụ & Thanh toán | Tariff, Service Order, Invoice, Payment |
| 6 | Phiếu ra cổng & Xác nhận ra cổng | Readiness, QR, xác nhận container rời ICD |
| 7 | Tổng quan & Báo cáo | KPI, gate activity, dwell, yard inventory, revenue, debt |
| 8 | Phân quyền & Cấu hình | User, role, permission, setting, tariff, master data |
| 9 | Nhật ký kiểm toán | Lịch sử thay đổi và truy vết request |
| 10 | Danh sách công việc thông minh | Chuyển trạng thái nghiệp vụ thành danh sách việc theo SLA/role |
| 11 | Gợi ý vị trí bãi bằng ML | Xếp hạng Yard Slot sau khi đã lọc hard safety rules |
| 12 | EDI / Email / Thông báo | Trao đổi CODECO/EDI, theo dõi gửi/ACK; email/push theo roadmap |
| 13 | Tích hợp bàn giao đối tác | ICD cấp API dữ liệu container/handover cho đối tác; nhận Partner confirmation, ICD confirmation, quản lý API Client và API Log |

### 1.4 Ngoài phạm vi

- Quản lý kho bãi cảng biển (terminal operations)
- Tích hợp trực tiếp với hệ thống hải quan VNACCS
- Quản lý đội xe và định tuyến vận chuyển
- Chức năng kế toán đầy đủ (chỉ billing cơ bản)
- Nghiệp vụ nội bộ của hệ thống Logistics/Transport Partner như phân tuyến, quản lý shipper, fuel, fleet maintenance; ICD chỉ quản lý Handover và confirmation liên quan container của ICD

---

## 2. Đối tượng người dùng

### 2.1 Danh sách vai trò

| Vai trò | Thiết bị chính | Trách nhiệm |
|---------|----------------|-------------|
| `ADMIN` | Web | Quản trị người dùng, cấu hình, tariff, master data, audit, Đối tác tích hợp API/API Key |
| `MANAGER` | Web | Dashboard, báo cáo, giám sát nghiệp vụ, audit, EDI, Handover và Nhật ký API đối tác |
| `OPERATOR` | Web | Manifest, Container, Billing, Gate Pass, tạo Handover, review Partner confirmation theo quyền |
| `GATE_STAFF` | Mobile/Web | Truck Visit tại cổng, Gate-in, scan Gate Pass, Gate-out |
| `YARD_STAFF` | Mobile/Web | Yard assign, movement, inspection, booking |
| `AGENT` | Web/Mobile | Tra cứu dữ liệu được cấp quyền |
| `CONSIGNEE` | Mobile/Web | Tra cứu container, billing/gate pass theo phạm vi |
| `PARTNER_SYSTEM` | Server-to-server | Hệ thống Logistics/Transport Partner; dùng API Key do ICD cấp để đọc Handover và gửi confirmation |

### 2.2 Ma trận phân quyền theo mô đun

| Mô đun | ADMIN | MANAGER | OPERATOR | GATE_STAFF | YARD_STAFF | AGENT | CONSIGNEE |
|--------|-------|---------|----------|------------|------------|-------|-----------|
| Manifest & B/L | CRUD | R | CRUD | R | R | R | R phạm vi |
| Container | CRUD | R | CRUD | R | RU | R | R phạm vi |
| Gate-in / Truck Visit | CRUD | R | CRU | CRU | R | — | — |
| Yard | CRUD | R | CRU | — | CRU | — | — |
| Billing | CRUD | R | CRUD | R | — | R | R |
| Gate Pass / Gate-out | CRUD | RA | CRA | RU | — | R | R |
| Reports | Full | Full | Hạn chế | — | — | Phạm vi | Phạm vi |
| Config / RBAC | Full | R | — | — | — | — | — |
| Audit / EDI Monitor | Full | R | R phạm vi | — | — | — | — |
| Tích hợp bàn giao đối tác | API Client + Full | R + Confirm theo policy | Create/Review theo quyền | R tóm tắt | R tóm tắt | — | R phạm vi nếu được cấp |

*CRUD: Create/Read/Update/Delete — A: Approve — R: Read — RU: Read/Update — CRU: Create/Read/Update.*

---

## 3. Mô hình nghiệp vụ end-to-end

### 3.1 Quy trình tổng quát

```text
[1] Manifest / MBL / HBL
        ↓
[2] Container Visit + Movement Order
        ↓
[3] Truck Visit / Gate Appointment
        ↓  xe ARRIVED, container đủ điều kiện tiếp nhận
[4] Tiếp nhận vào cổng / Reception
        ↓  Container → IN_YARD
[5] Xếp vị trí bãi
        ↓
[6] Yard Operations
    ├─ Internal Movement
    ├─ Inspection
    ├─ Stripping / Booking
    └─ Lệnh giữ nghiệp vụ / Release (có thể phát sinh ở nhiều thời điểm)
        ↓
[7] Billing
    Service Order → Invoice → Payment
        ↓
[8] Điều kiện cấp Phiếu ra cổng
    kiểm tra billing + vị trí + operation + inspection + hold
        ↓
[9] Phiếu ra cổng
        ↓
[10] Xác nhận ra cổng
    scan QR → re-check readiness → EXITED
```

Các luồng tích hợp chạy **song song** với vòng đời container, không được tự ý thay đổi state nghiệp vụ ICD:

```text
Tiếp nhận vào cổng / Xác nhận ra cổng
   └─ EDI Outbox → gửi Shipping Line → theo dõi delivery/ACK

Sau Xác nhận ra cổng / đủ điều kiện bàn giao
   └─ Module 13 Tích hợp bàn giao đối tác
       → tạo Bàn giao vận chuyển
       → Partner lấy dữ liệu qua API ICD
       → PARTNER_ACCEPTED → IN_TRANSIT
       → Partner xác nhận kho nhận
       → ICD review/xác nhận
       → COMPLETED / DISPUTED
```

Nguyên tắc: Handover là lifecycle mở rộng sau/ngoài core ICD. Partner API không được sửa `container_visit.state`, Yard, Billing, Hold, Gate Pass hoặc lịch sử Gate-out. Một lỗi/confirmation bất thường phía Partner không được rollback dữ liệu ICD đã commit hợp lệ.

### 3.2 Trạng thái vòng đời container

```
[Pending]
    |  (Tạo Movement Order)
    v
[Authorized]
    |  (Xe vào cổng, tạo Reception)
    v
[In Yard]
    |  (Có thể có: stripping, inspection, movement)
    |  → [In Stripping] → [Stripped]
    |  → [Under Inspection]
    |
    |  (Tạo Phiếu ra cổng)
    v
[Phiếu ra cổng Issued]
    |  (Submit gate-out)
    v
[Exited]

* Tại bất kỳ bước nào: Phiếu ra cổng hết hạn → trở về [In Yard]
```

### 3.3 Trạng thái Bàn giao vận chuyển (Module 13)

Bàn giao vận chuyển có state machine riêng và **không thay thế** Container Visit lifecycle:

```text
DRAFT
  ↓
READY_FOR_HANDOVER
  ↓  Partner Accept
PARTNER_ACCEPTED
  ↓  Partner báo bắt đầu vận chuyển
IN_TRANSIT
  ↓  Partner xác nhận kho đã nhận
PARTNER_CONFIRMED
  ↓  ICD review/xác nhận
ICD_CONFIRMED
  ↓
COMPLETED
```

Nhánh ngoại lệ:

```text
READY_FOR_HANDOVER → PARTNER_REJECTED
IN_TRANSIT         → DELIVERY_FAILED
PARTNER_CONFIRMED  → DISPUTED
DRAFT / READY      → CANCELLED (theo quyền và policy)
```

- `DRAFT`: mới tạo, chưa expose cho Partner.
- `READY_FOR_HANDOVER`: Partner được phép đọc Handover qua External API.
- `PARTNER_ACCEPTED`: Partner xác nhận nhận nhiệm vụ/dữ liệu.
- `IN_TRANSIT`: Partner xác nhận đang vận chuyển container tới kho.
- `PARTNER_CONFIRMED`: Partner xác nhận kho đã nhận; chưa phải bước đóng cuối.
- `ICD_CONFIRMED`: nhân viên ICD đã review và chấp nhận confirmation.
- `COMPLETED`: kết thúc Handover.
- `DISPUTED`: dữ liệu Partner cần đối soát.

Ví dụ hoàn toàn hợp lệ:

```text
Container Visit = EXITED
Bàn giao vận chuyển = DELIVERY_FAILED
```

Container vẫn `EXITED`; việc xử lý giao thất bại chỉ nằm trong Module 13.
## 4. Mô đun nghiệp vụ chi tiết

### 4.1 Mô đun 1 — Bản lược khai hàng hóa (Manifest) & Vận đơn

#### Mục đích
Nhập dữ liệu chuyến hàng từ hãng tàu/forwarder vào hệ thống làm cơ sở theo dõi toàn bộ vòng đời container.

#### Yêu cầu chức năng

- **MN-01** Tạo Manifest thủ công hoặc import từ file Excel
- **MN-02** Nhập danh sách Master BL (vận đơn chủ) thuộc Manifest
- **MN-03** Nhập danh sách House BL (vận đơn con) thuộc mỗi Master BL
- **MN-04** Liên kết mỗi HBL với Consignee (chủ hàng) và Clearing Agent (đại lý thông quan)
- **MN-05** Tạo danh sách container (Containers Detail) từ Manifest
- **MN-06** Tìm kiếm, lọc Manifest theo ngày, hãng tàu, tàu, tuyến đường
- **MN-07** Xem lịch sử chỉnh sửa Manifest (audit log)

#### Dữ liệu chính

**Manifest**
```
- Mã manifest (tự sinh)
- Ngày tàu đến
- Tên tàu / số chuyến
- Hãng tàu (Shipping Line)
- Cảng xếp hàng / Cảng đến
- Trạng thái: Draft / Submitted
```

**Master BL**
```
- Số MBL
- Manifest (FK)
- Hãng tàu
- Số lượng container
```

**House BL**
```
- Số HBL
- Master BL (FK)
- Consignee (FK)
- Clearing Agent (FK)
- Mô tả hàng hoá
- Trọng lượng tổng
- Số lượng kiện
```

**Container (từ Manifest)**
```
- Số container (ISO format, ví dụ: MSCU1234567)
- Loại container: 20GP / 40GP / 40HC / 20RF
- Trọng lượng tổng (T.O.B)
- Seal number
- Hàng hoá (cargo description)
- HBL (FK)
```

#### Quy tắc nghiệp vụ

- Số container phải hợp lệ theo chuẩn ISO 6346 (4 chữ cái + 7 chữ số + 1 check digit)
- Một HBL có thể liên kết nhiều container
- Manifest ở trạng thái Submitted không được xoá, chỉ được sửa kèm ghi chú lý do

---

### 4.2 Mô đun 2 — Quản lý Container

#### Mục đích
Là trung tâm theo dõi toàn bộ vòng đời, vị trí, trạng thái và thông tin liên quan của từng container trong hệ thống.

#### Yêu cầu chức năng

- **CT-01** Xem chi tiết container: thông tin, lịch sử trạng thái, lịch sử vị trí
- **CT-02** Tìm kiếm container theo: số container, consignee, MBL, HBL, trạng thái
- **CT-03** Xem số ngày lưu kho hiện tại (tự động cập nhật mỗi ngày)
- **CT-04** Xem tất cả dịch vụ đã phát sinh trên container
- **CT-05** Xem trạng thái thanh toán của container
- **CT-06** Gắn tag/ghi chú nội bộ vào container
- **CT-07** Xem timeline đầy đủ các sự kiện của container

#### Dữ liệu chính

**Container**
```
- Số container (PK)
- Loại container
- Trạng thái hiện tại (enum: Pending / Authorized / In Yard /
  In Stripping / Stripped / Under Inspection / Phiếu ra cổng Issued / Exited)
- Vị trí hiện tại (hàng, lô, tầng trong yard)
- Ngày gate-in
- Ngày gate-out
- Số ngày lưu kho (tính tự động)
- Manifest (FK), Master BL (FK), House BL (FK)
- Consignee (FK)
- Ghi chú
```

#### Quy tắc nghiệp vụ

- Số ngày lưu kho = ngày hiện tại − ngày gate-in (tính theo ngày làm việc hoặc ngày dương lịch, tuỳ cấu hình)
- Ngày free storage (miễn phí lưu kho) được cấu hình theo loại container và loại hàng
- Container ở trạng thái Exited không được cập nhật trạng thái, chỉ xem
- **Lệnh giữ nghiệp vụ** không đổi state Container Visit nhưng có thể chặn Gate Pass/Gate-out. Hold có loại như Customs, Shipping Line, Damage, Security, Document, Other và lifecycle tối thiểu `ACTIVE → RELEASED`.
- Container Detail phải cho biết còn hold nào active, lý do, người tạo và lịch sử release để người vận hành hiểu blocker trước Gate-out.
- Container Visit là source-of-truth nghiệp vụ ICD. `transport_handover` có FK tới `container_visit` để xác định container được bàn giao, nhưng Partner API không được ghi trực tiếp vào state/yard/billing/gate-pass của visit.

---

### 4.3 Mô đun 3 — Tiếp nhận vào cổng (Gate-in)

#### Mục đích

Quản lý quá trình xe/container đến ICD và xác nhận container chính thức vào Yard. Nghiệp vụ được tách thành **Movement Order → Truck Visit → Reception/Gate-in** để phản ánh đúng chuyến xe vật lý và tránh ghi đè dữ liệu tài xế/biển số trực tiếp lên container.

#### Yêu cầu chức năng

- **GI-01** Tạo/authorize Movement Order trước Gate-in.
- **GI-02** Tạo Truck Visit/Gate Appointment, gắn xe, tài xế, transporter, thời gian dự kiến và danh sách container.
- **GI-03** Xác nhận Truck Visit `ARRIVED` khi xe đến cổng.
- **GI-04** Scan hoặc nhập số container trên Mobile; kiểm tra container có thuộc chuyến và có Movement Order hợp lệ.
- **GI-05** Ghi nhận Reception: seal thực tế, trọng lượng, tình trạng, ảnh và ghi chú bất thường.
- **GI-06** Nếu seal khác manifest phải yêu cầu ghi chú và tạo cảnh báo cho người phụ trách.
- **GI-07** Gate-in thành công chuyển Container Visit → `IN_YARD`, tạo event và đưa container vào Work Queue `YARD_ASSIGN` nếu chưa có vị trí.
- **GI-08** Gate-in có thể phát sinh CODECO vào EDI Outbox nếu Shipping Line/route được cấu hình.

#### Vòng đời chuyến xe ra/vào (Truck Visit)

```text
SCHEDULED → ARRIVED → IN_PROGRESS → COMPLETED
      └────────────────────────→ CANCELLED
```

#### Quy tắc nghiệp vụ

- Container chỉ được nằm trong một Truck Visit Gate-in đang active tại một thời điểm.
- Truck Visit phải `ARRIVED` trước khi được chọn để Gate-in.
- Container đã `IN_YARD` hoặc `EXITED` không được Gate-in lại trong cùng visit.
- Khi toàn bộ container trên chuyến đã xử lý xong, Truck Visit có thể tự chuyển `COMPLETED`.
- Nếu không dùng Truck Visit trong tình huống đặc biệt, backend vẫn phải validate Movement Order và container state trước khi tạo Reception.


---

### 4.4 Mô đun 4 — Vận hành bãi container (Yard)

#### Mục đích
Quản lý toàn bộ hoạt động xảy ra trong yard: vị trí container, stripping, kiểm định, di chuyển nội bộ.

#### 4.4.1 Quản lý vị trí (Container Location)

**Yêu cầu chức năng**
- **YD-01** Cập nhật vị trí container trong yard (hàng/block/tầng)
- **YD-02** Xem sơ đồ yard (grid layout) — Web
- **YD-03** Tìm container theo vị trí

**Dữ liệu**
```
Container Location:
- Container (FK)
- Vị trí: Block + Row + Bay + Tier (ví dụ: A-03-04-2)
- Thời điểm cập nhật
- Nhân viên cập nhật
```

#### 4.4.2 Booking Stripping (In Yard Container Booking)

**Mục đích:** Lên lịch rút hàng ra khỏi container (đối với hàng FCL → LCL hoặc hàng cần kho đệm).

**Yêu cầu chức năng**
- **ST-01** Tạo booking stripping cho container
- **ST-02** Lên lịch ngày giờ thực hiện
- **ST-03** Ghi nhận kết quả: số kiện, trọng lượng, tình trạng hàng
- **ST-04** Cập nhật trạng thái container → Stripped
- **ST-05** Tạo bulk booking cho nhiều container cùng lúc

**Dữ liệu**
```
In Yard Booking:
- Mã booking
- Container (FK)
- Loại: Stripping / Stuffing / Inspection Booking
- Ngày giờ đặt lịch
- Ngày giờ thực hiện thực tế
- Trạng thái: Pending / In Progress / Hoàn tất / Cancelled
- Nhân viên thực hiện
- Ghi chú kết quả
```

#### 4.4.3 Kiểm định (Container Inspection)

**Mục đích:** Ghi nhận kết quả kiểm tra hải quan hoặc kiểm định nội bộ.

**Yêu cầu chức năng**
- **IN-01** Tạo yêu cầu kiểm định
- **IN-02** Ghi nhận kết quả kiểm định (pass / fail / hold)
- **IN-03** Upload biên bản kiểm định (PDF)
- **IN-04** Thông báo kết quả đến Consignee / Clearing Agent

**Dữ liệu**
```
Container Inspection:
- Container (FK)
- Loại kiểm định: Hải quan / Nội bộ / Kiểm dịch
- Ngày yêu cầu / Ngày thực hiện
- Kết quả: Pass / Fail / Hold
- Cơ quan kiểm tra
- Biên bản đính kèm
- Ghi chú
```

#### 4.4.4 Di chuyển nội bộ (Container Verification Movement)

**Yêu cầu chức năng**
- **MV-01** Tạo lệnh di chuyển container từ vị trí A sang vị trí B
- **MV-02** Xác nhận hoàn thành di chuyển (Mobile — nhân viên yard)
- **MV-03** Tự động cập nhật vị trí container

---

### 4.5 Mô đun 5 — Dịch vụ & Thanh toán

#### Mục đích
Tính toán và quản lý các khoản phí dịch vụ phát sinh trên container, tạo hoá đơn và theo dõi thanh toán.

#### 5.1 Danh mục dịch vụ & biểu phí

| Loại phí | Đơn vị tính | Ghi chú |
|----------|------------|---------|
| Phí lưu kho (Storage) | Container/ngày | Có free days, tính theo loại container |
| Phí tiếp nhận (Reception) | Container/lần | Một lần khi gate-in |
| Phí stripping | Container/lần | Khi thực hiện stripping |
| Phí kiểm định | Lần | Theo loại kiểm định |
| Corridor levy | Container/ngày | Phí cơ sở hạ tầng |
| Phí di chuyển nội bộ | Lần | Khi thực hiện movement |

#### 5.2 Yêu cầu chức năng

- **BL-01** Tự động tính phí lưu kho dựa trên số ngày và biểu phí cấu hình
- **BL-02** Tạo Service Order tổng hợp tất cả phí cho một container
- **BL-03** Tạo hoá đơn (Invoice) từ Service Order
- **BL-04** Ghi nhận thanh toán (tiền mặt / chuyển khoản)
- **BL-05** Xem công nợ theo Consignee
- **BL-06** Gửi hoá đơn qua email cho Consignee / Agent
- **BL-07** Báo cáo doanh thu theo ngày / tháng / quý

#### Dữ liệu chính

**Service Order**
```
- Mã Service Order
- Container (FK)
- Consignee (FK)
- Danh sách dịch vụ:
  + Loại dịch vụ
  + Số lượng / đơn vị
  + Đơn giá
  + Thành tiền
- Tổng tiền
- Trạng thái: Draft / Confirmed / Invoiced / Paid
```

**Invoice**
```
- Mã hoá đơn
- Service Order (FK)
- Ngày xuất hoá đơn
- Hạn thanh toán
- Tổng tiền
- Số tiền đã thanh toán
- Trạng thái: Unpaid / Partial / Paid / Overdue
- Lịch sử thanh toán
```

#### Quy tắc nghiệp vụ

- Free storage days: mặc định 5 ngày làm việc (cấu hình được theo loại hàng)
- Phí lưu kho tính từ ngày gate-in đến ngày payment (không phải ngày gate-out)
- Container chỉ được cấp Gate Pass khi tổng tiền chưa thanh toán = 0
- Nếu Consignee có công nợ quá hạn > 30 ngày → cảnh báo khi tạo Service Order mới

---

### 4.6 Mô đun 6 — Phiếu ra cổng & Xác nhận ra cổng

#### Mục đích

Chỉ cho phép container rời ICD khi toàn bộ điều kiện tài chính và vận hành đã đạt. Gate Pass là **kết quả của readiness**, không chỉ là kết quả “đã thanh toán”.

#### Điều kiện sẵn sàng trước khi cấp Phiếu ra cổng

Backend kiểm tra tối thiểu:

| Blocker | Ý nghĩa |
|---|---|
| `CONTAINER_NOT_IN_YARD` | Container chưa ở trạng thái phù hợp |
| `NO_YARD_POSITION` | Chưa có vị trí Yard hợp lệ |
| `NO_BILLING` / `BILLING_INCOMPLETE` | Billing chưa hoàn tất |
| `UNBILLED_SERVICES` | Có dịch vụ phát sinh chưa được bill |
| `ACTIVE_YARD_OPERATION` | Còn movement/inspection/booking đang active |
| `INSPECTION_HOLD` | Inspection có kết quả HOLD |
| `OPERATIONAL_HOLD` | Có Hold nghiệp vụ đang ACTIVE |

#### Yêu cầu chức năng

- **GP-01** Hiển thị readiness và danh sách blocker cho Operator.
- **GP-02** Chỉ tạo Gate Pass khi không còn blocker.
- **GP-03** Gate Pass có QR/token, thời hạn mặc định 24 giờ và trạng thái `ACTIVE / USED / EXPIRED / CANCELLED`.
- **GP-04** Mobile scan Gate Pass tại cổng và hiển thị container/xe/người nhận để xác nhận.
- **GP-05** Trước Gate-out, backend **re-check readiness** để tránh dùng dữ liệu cũ.
- **GP-06** Gate-out thành công: Container Visit → `EXITED`, Gate Pass → `USED`, đóng vị trí Yard và ghi event lịch sử.
- **GP-07** Gate-out có thể tạo CODECO vào EDI Outbox và phát sinh thông báo cho Consignee/Agent.

#### Quy tắc nghiệp vụ

- UI hiển thị “Ready” không thay thế validation backend tại thời điểm Gate-out.
- Gate Pass hết hạn/đã dùng/bị huỷ không được tái sử dụng.
- Lệnh giữ nghiệp vụ/Inspection Hold phải được release/xử lý trước khi cấp hoặc sử dụng Gate Pass.


---

### 4.7 Mô đun 7 — Tổng quan & Báo cáo

#### Mục đích

Cho Manager/ADMIN nhìn được tình hình vận hành hiện tại và dữ liệu lịch sử mà không cần truy vấn thủ công từng container.

#### Tổng quan vận hành

- Container đang trong Yard, phân theo trạng thái/loại.
- Work Queue theo `OVERDUE / HIGH / MEDIUM / NORMAL`.
- Gate-in/Gate-out theo ngày/giờ.
- Container sắp hết free days.
- Revenue theo payment thực tế và công nợ chưa thu.
- Cảnh báo Lệnh giữ nghiệp vụ và sự cố tích hợp ngoài quan trọng.

#### Báo cáo chính

| Báo cáo | Mục đích |
|---|---|
| Gate Activity | Theo dõi lưu lượng vào/ra |
| Container Turnover / Dwell | Đo thời gian lưu và tốc độ quay vòng |
| Current Yard Inventory | Tồn Yard hiện tại theo Block/Slot/Container Type |
| Historical Yard Inventory EOD | Tái dựng tồn cuối ngày từ lịch sử location |
| Revenue | Tổng hợp theo payment allocation |
| Outstanding Debt | Công nợ hiện tại/quá hạn |
| Partner Handover | Ready/In Transit/Partner Confirmed/ICD Confirmed/Disputed theo partner/kho |

Web hỗ trợ lọc theo khoảng thời gian và xuất CSV/Excel; PDF/scheduled report có thể để roadmap nếu chưa cần cho phạm vi đồ án.

---

### 4.8 Mô đun 8 — Phân quyền & Cấu hình

- Quản lý User/Role/Permission.
- Operational Settings và Tariff.
- Master Data: Shipping Line, Consignee, Clearing Agent, Transporter.
- ADMIN không được tự vô hiệu hoá hoặc tự loại bỏ quyền ADMIN của chính mình.
- Thay đổi quyền/cấu hình phải ghi Audit Log.
- Đối tác tích hợp API/API Key là cấu hình quản trị; Bàn giao vận chuyển là dữ liệu nghiệp vụ mở rộng và luôn liên kết với Container Visit.

---

### 4.9 Mô đun 9 — Nhật ký kiểm toán

**Mục đích:** trả lời được “ai đã làm gì, lúc nào, trên dữ liệu nào và request nào”.

- Ghi actor, action, entity, before/after, timestamp, ICD và request ID.
- Redact password/token/secret/API key.
- Cho ADMIN/MANAGER lọc theo actor, entity, thời gian và request ID.
- Các thao tác tạo/rotate/revoke Partner API Key, Partner confirmation, ICD confirmation/dispute và thay đổi Hold phải có dấu vết truy vết phù hợp.

---

### 4.10 Mô đun 10 — Danh sách công việc thông minh

**Mục đích:** biến trạng thái nghiệp vụ thành danh sách việc cần làm theo role và SLA.

| Task | Điều kiện điển hình |
|---|---|
| `GATE_IN` | Container chờ tiếp nhận, Movement Order/Truck Visit hợp lệ |
| `YARD_ASSIGN` | `IN_YARD` nhưng chưa có vị trí |
| `YARD_OPERATIONS` | Có movement/inspection/booking cần xử lý |
| `GATE_OUT` | Gate Pass đã phát hành và còn hiệu lực |

Sắp xếp ưu tiên: **Overdue → mức urgency → deadline gần hơn → task cũ hơn**. Frontend dùng action metadata từ backend thay vì tự suy luận quyền chỉ từ state.

---

### 4.11 Mô đun 11 — Gợi ý vị trí bãi bằng ML

ML chỉ là lớp **hỗ trợ quyết định**:

```text
Hard Safety Rules
      ↓
Rule-based candidates
      ↓
ML rerank (nếu enabled/ready)
```

- Slot fail hard rule tuyệt đối không được đưa trở lại bởi ML.
- Nếu ML timeout/down/chưa đủ dữ liệu, hệ thống fallback rule-based để không chặn Yard workflow.
- Yard Staff vẫn là người xác nhận slot cuối cùng; lựa chọn được ghi lại làm feedback cho mô hình.

---

### 4.12 Mô đun 12 — EDI / Email / Thông báo

#### Luồng nghiệp vụ EDI

```text
Tiếp nhận vào cổng / Xác nhận ra cổng thành công
        ↓
Tạo message vào Outbox trong cùng luồng nghiệp vụ
        ↓
Dispatcher gửi theo route Shipping Line (MOCK / HTTPS / SFTP)
        ↓
PENDING → PROCESSING → SENT / FAILED / DEAD
        ↓
Nếu có ACK/response: lưu và đối soát
        ↓
Sự cố cần xử lý → hiển thị EDI Operations/Alerts trên Web
```

Nguyên tắc quan trọng:
- `SENT` nghĩa là gửi transport thành công, không mặc định đồng nghĩa đối tác đã chấp nhận nghiệp vụ.
- Retry không được tạo message nghiệp vụ trùng.
- EDI failure không rollback Gate-in/Gate-out đã hoàn tất; thay vào đó tạo trạng thái lỗi để vận hành xử lý.
- Email/push dùng cho hóa đơn, gate-out, free-day/Gate Pass warning khi triển khai.

---

### 4.13 Mô đun 13 — Tích hợp bàn giao đối tác

#### Mục đích

Cho phép ICD công bố dữ liệu bàn giao container cho hệ thống Logistics/Transport Partner qua API có kiểm soát. Partner dùng API Key do ICD cấp để lấy đúng Handover thuộc phạm vi của mình, xác nhận nhận nhiệm vụ, cập nhật `IN_TRANSIT` và xác nhận kho đã nhận. **ICD luôn là bên xác nhận cuối cùng** trước khi Handover `COMPLETED`.

Module 13 không mở rộng quyền của Partner vào core ICD. Partner không được sửa Manifest, Container Visit state, Yard, Billing, Hold, Gate Pass hay lịch sử Gate-out.

#### Tác nhân

| Actor | Trách nhiệm |
|---|---|
| ADMIN | Tạo/rotate/revoke Đối tác tích hợp API/API Key; xem toàn bộ API Log |
| MANAGER | Giám sát Handover, review confirmation, xem báo cáo và log |
| OPERATOR | Tạo Handover, đưa sang READY, review confirmation theo quyền |
| PARTNER_SYSTEM | Lấy dữ liệu được cấp và gọi các API state transition |
| GATE/YARD STAFF | Chỉ xem tóm tắt Handover khi cần; không quản trị API |

#### Đầu vào của Handover

Một Handover tối thiểu cần:

- `container_visit_id`;
- `container_code`;
- Đối tác tích hợp API;
- destination warehouse;
- transport code;
- status;
- thời gian ready/expected delivery;
- snapshot dữ liệu chia sẻ cho Partner;
- người tạo và audit metadata.

#### PH-01 — Tạo Bàn giao vận chuyển

**Trigger:** Operator tạo sau Gate-out hoặc tại điểm nghiệp vụ được cấu hình cho phép.

**Precondition mặc định:**
- Container Visit tồn tại;
- không có Handover active xung đột;
- Partner đang ACTIVE;
- kho đích đang active;
- transport code hợp lệ/không trùng theo scope.

**Flow:**
```text
Chọn Container Visit
→ chọn Partner
→ chọn kho đích
→ nhập transport code / expected delivery
→ lưu DRAFT hoặc Publish
```

**Kết quả:** `DRAFT` hoặc `READY_FOR_HANDOVER`.

#### PH-02 — Công bố dữ liệu cho đối tác

Khi Handover chuyển `READY_FOR_HANDOVER`, External API cho phép đúng Partner nhìn thấy Handover đó. Việc công bố không thay đổi `container_visit.state`.

Dữ liệu chia sẻ có thể gồm:
- container number/type;
- seal/gross weight ở mức cần thiết;
- Gate-out time;
- destination warehouse;
- consignee fields được phép;
- cargo/items snapshot theo hợp đồng tích hợp.

Không chia sẻ mặc định:
- password/secret;
- internal audit diff;
- billing nội bộ chi tiết nếu Partner không cần;
- dữ liệu container thuộc Partner khác.

#### PH-03 — Đối tác tiếp nhận bàn giao

Partner gọi API accept.

```text
READY_FOR_HANDOVER → PARTNER_ACCEPTED
```

Rule:
- API Key phải ACTIVE;
- Partner của key phải trùng `transport_handover.partner_api_client_id`;
- state hiện tại đúng;
- Idempotency-Key hợp lệ;
- lưu partner reference nếu Partner cung cấp.

#### PH-04 — Đối tác xác nhận đang vận chuyển

```text
PARTNER_ACCEPTED → IN_TRANSIT
```

Partner có thể gửi snapshot:
- departed_at;
- vehicle plate;
- driver name/contact;
- partner trip/reference.

Snapshot này phục vụ Handover, **không ghi đè Truck Visit** tại cổng ICD.

#### PH-05 — Đối tác xác nhận kho đã nhận

Partner gửi:
- `received_at`;
- receiver name/contact;
- note;
- optional GPS (`latitude`, `longitude`, `accuracy_m`);
- optional proof image/signature/reference.

Flow:
```text
IN_TRANSIT
→ validate request
→ create transport_confirmation
→ PARTNER_CONFIRMED
→ tạo Danh sách công việc HANDOVER_REVIEW (nếu bật)
```

#### PH-06 — ICD xác nhận cuối cùng

Operator/Manager mở Handover Detail và review:
- đúng container;
- đúng transport code;
- đúng Partner/kho;
- received time hợp lý;
- proof/GPS nếu policy yêu cầu;
- không có discrepancy chưa xử lý.

Nếu chấp nhận:
```text
PARTNER_CONFIRMED → ICD_CONFIRMED → COMPLETED
```

Lưu `icd_confirmed_by`, `icd_confirmed_at`, note và audit.

#### PH-07 — Đối soát / tranh chấp

Nếu confirmation có sai lệch:
```text
PARTNER_CONFIRMED → DISPUTED
```

Dispute bắt buộc có reason, note và actor. Ví dụ:
- sai container;
- sai kho;
- thời gian không hợp lý;
- proof không đủ;
- seal/tình trạng có tranh chấp;
- transport code không khớp.

Sau đối soát, hệ thống có thể cho phép resolution theo policy, nhưng không được sửa lịch sử confirmation cũ; phải tạo event/record mới.

#### PH-08 — Đối tác từ chối / Giao vận thất bại

`PARTNER_REJECTED`: Partner từ chối nhận nhiệm vụ trước khi vận chuyển.

`DELIVERY_FAILED`: chuyến đã thực hiện nhưng không giao được. Partner phải cung cấp reason code, occurred_at và note.

Hai trạng thái này không rollback Gate-out. Operator có thể tạo Handover thay thế/reschedule theo policy.

#### PH-09 — Quản lý đối tác tích hợp API

ICD ADMIN quản lý API Client:
- tạo Client;
- tạo API Key;
- plaintext key chỉ hiển thị một lần;
- DB chỉ lưu hash + last4;
- rotate;
- revoke;
- scope quyền API;
- audit đầy đủ.

#### PH-10 — Chống xử lý trùng (Idempotency)

Các API thay đổi state yêu cầu `Idempotency-Key`.

- uniqueness scope `(partner_client_id, endpoint, idempotency_key)`;
- same key + same payload hash → trả response đã lưu;
- same key + khác payload → `409 IDEMPOTENCY_KEY_REUSED`;
- không tạo duplicate confirmation/state event;
- lỗi trước commit có thể retry theo policy.

#### PH-11 — Nhật ký API đối tác

Mỗi request external lưu:
- Partner;
- endpoint/method;
- handover/container/transport code;
- idempotency key (masked);
- request hash;
- request/response snapshot đã redact;
- HTTP/business status;
- error code;
- request/correlation ID;
- latency;
- timestamps.

#### PH-12 — Quy tắc cách ly core ICD

External Partner API chỉ được thao tác:
```text
transport_handover
transport_confirmation
partner_api_log
```

Partner API không được trực tiếp sửa:
```text
container_visit.state
yard_location
service_order / invoice / payment
operational_hold
gate_pass
container_reception / gate_out history
```

Đây là business boundary quan trọng nhất của Module 13.

#### Web hỗ trợ

- Container Detail: tab/card `Transport Handover`.
- `/handovers`: danh sách Handover.
- `/handovers/:id`: timeline, Partner confirmation, ICD Confirm/Dispute.
- `/admin/partner-clients`: tạo/rotate/revoke API Key.
- `/admin/partner-api-logs`: giám sát request external.

#### Mobile hỗ trợ

- Gate/Yard workflow không đổi.
- Internal staff có thể xem Handover summary read-only.
- Không lưu Partner API Key và không có chức năng Confirm/Rotate/Revoke trên Mobile.

## 5. Yêu cầu phi chức năng

### 5.1 Hiệu năng

- Trang danh sách container tải trong < 2 giây với tối đa 5.000 container
- API response time < 500ms cho các thao tác CRUD thông thường
- Dashboard refresh realtime mỗi 60 giây
- External Partner API CRUD/state transition mục tiêu < 500ms–1s trong điều kiện bình thường; request Partner không được giữ lock/transaction lên core Gate/Yard/Billing lâu hơn cần thiết

### 5.2 Bảo mật

- Xác thực bằng JWT (access token 15 phút + refresh token 7 ngày) cho người dùng nội bộ
- ICD cấp API Key cho Partner; plaintext chỉ hiển thị một lần, DB ICD chỉ lưu hash/last4; Partner gửi key qua `X-API-Key`
- Phân quyền theo vai trò (RBAC)
- Toàn bộ API phải qua HTTPS
- Log đầy đủ thao tác tạo/rotate/revoke Đối tác tích hợp API, Partner state transition, ICD confirmation/dispute
- Mật khẩu hash bằng bcrypt
- API Key external không được truyền qua query string; Web/Mobile user nội bộ sử dụng JWT, không dùng Partner API Key

### 5.3 Khả dụng

- Uptime tối thiểu 99% trong giờ hành chính
- Backup dữ liệu tự động hàng ngày
- Hỗ trợ hoạt động offline một phần trên Mobile (xem dữ liệu đã cache)

### 5.4 Khả năng mở rộng

- Kiến trúc RESTful API, tách biệt frontend/backend
- Hỗ trợ multi-ICD trong tương lai (mỗi ICD là một tenant)
- API design chuẩn để tích hợp với hệ thống ngoài
- Module 13 hỗ trợ nhiều Đối tác tích hợp API, mỗi Client có scopes, trạng thái key và phạm vi Handover riêng; có thể mở rộng multi-ICD/multi-partner

### 5.5 Khả năng sử dụng

- Web: hỗ trợ Chrome, Edge, Firefox phiên bản 2 năm gần nhất
- Mobile: Android 10+ / iOS 14+
- Giao diện hỗ trợ tiếng Việt (mặc định)
- Responsive trên màn hình tablet (web)

---

## 6. Phân tách Web / Mobile / API đối tác bên ngoài

### Web Application — Dành cho nghiệp vụ văn phòng

- Toàn bộ core ICD giữ nguyên.
- Tạo/Publish/Review `Transport Handover`.
- ICD Confirm/Dispute Partner confirmation.
- ADMIN quản lý `/admin/partner-clients` và API Key.
- ADMIN/MANAGER giám sát `/admin/partner-api-logs`.

### Mobile Application — Dành cho tác nghiệp hiện trường

- Gate/Yard workflow giữ nguyên.
- Không giữ Partner API Key.
- Có thể xem Handover summary read-only cho internal staff.
- Gate-in/Gate-out không chờ Partner API.

### External Partner API — Server-to-server

- Được expose bởi ICD Backend.
- Partner gửi `X-API-Key`; state-changing request gửi thêm `Idempotency-Key`.
- Partner chỉ truy cập Handover thuộc client/scope của mình.
- Partner không có quyền sửa core ICD.

## 7. Mô hình CSDL tổng quan

### Nhóm bảng Manifest & Vận đơn

```
manifest
├── id (PK)
├── date
├── vessel
├── shipping_line
└── status

master_bl
├── id (PK)
├── manifest_id (FK → manifest)
└── mbl_number

house_bl
├── id (PK)
├── master_bl_id (FK → master_bl)
├── hbl_number
├── consignee_id (FK → consignee)
└── clearing_agent_id (FK → clearing_agent)
```

### Nhóm bảng Container & Vận hành

```
container
├── id (PK)
├── container_number (UNIQUE)
├── container_type
├── state
├── location
├── storage_days
├── gate_in_date
├── gate_out_date
├── manifest_id (FK)
├── master_bl_id (FK)
├── house_bl_id (FK)
└── consignee_id (FK)

container_reception
├── id (PK)
├── container_id (FK → container)
├── gate_in_time
├── operator_id (FK → user)
├── vehicle_plate
├── transporter_id (FK → transporter)
├── actual_seal
└── condition_notes

container_location_log
├── id (PK)
├── container_id (FK → container)
├── block, row, bay, tier
├── logged_at
└── logged_by (FK → user)

in_yard_booking
├── id (PK)
├── container_id (FK → container)
├── booking_type
├── scheduled_at
├── completed_at
└── status

container_inspection
├── id (PK)
├── container_id (FK → container)
├── inspection_type
├── result
└── inspected_at
```

### Nhóm bảng Billing

```
service_order
├── id (PK)
├── container_id (FK → container)
├── consignee_id (FK → consignee)
├── total_amount
└── status

service_order_item
├── id (PK)
├── service_order_id (FK → service_order)
├── service_type
├── quantity
├── unit_price
└── amount

invoice
├── id (PK)
├── service_order_id (FK → service_order)
├── issued_date
├── due_date
├── total_amount
├── paid_amount
└── status

payment
├── id (PK)
├── invoice_id (FK → invoice)
├── amount
├── paid_at
└── method
```

### Nhóm bảng Gate Pass

```
gate_pass
├── id (PK)
├── container_id (FK → container)
├── consignee_id (FK → consignee)
├── created_at
├── expires_at
├── vehicle_plate
├── receiver_name
├── receiver_id_number
├── status
└── confirmed_by (FK → user)
```

### Nhóm bảng Danh mục

```
consignee (id, name, tax_code, phone, email, address)
clearing_agent (id, name, license_number)
transporter (id, name, tax_code)
user (id, name, email, role, active)
service_type_config (id, name, unit, default_price, free_days)
icd_settings (key, value) — cấu hình hệ thống
```

### Nhóm bảng Tích hợp bàn giao đối tác (Module 13)

```text
partner_api_client
├── id (PK)
├── partner_code (UNIQUE)
├── partner_name
├── api_key_hash
├── key_last4
├── status (ACTIVE / REVOKED)
├── scopes (JSON/normalized relation)
├── created_at
├── rotated_at
└── revoked_at

customer_warehouse
├── id (PK)
├── consignee_id (nullable FK)
├── code
├── name
├── address
├── latitude / longitude (nullable)
├── contact_name / contact_phone
└── active

transport_handover
├── id (PK)
├── container_visit_id (FK → container_visit)
├── partner_api_client_id (FK → partner_api_client)
├── warehouse_id (FK → customer_warehouse)
├── transport_code
├── status
├── ready_at
├── partner_accepted_at
├── departed_at
├── partner_confirmed_at
├── icd_confirmed_at
├── completed_at
├── created_by (FK → user)
└── created_at / updated_at

transport_confirmation
├── id (PK)
├── transport_handover_id (FK)
├── confirmation_type
├── partner_request_id
├── confirmed_at
├── receiver_name / receiver_phone
├── note
├── latitude / longitude / accuracy_m (nullable)
├── proof_image_url / signature_url (nullable)
├── payload_snapshot
└── created_at

partner_api_log
├── id (PK)
├── partner_api_client_id (FK)
├── transport_handover_id (nullable FK)
├── endpoint / method
├── idempotency_key
├── request_hash
├── request_body_redacted
├── response_body
├── http_status / business_status
├── error_code
├── request_id
├── latency_ms
└── created_at / completed_at
```

> Không tạo `partner_container` trùng với `container` của ICD. `transport_handover` tham chiếu trực tiếp `container_visit`; Partner chỉ làm việc trên lifecycle Handover.
## 8. Tích hợp bên ngoài

### 8.1 EDI / Shipping Line Integration

EDI phục vụ trao đổi với Shipping Line/Terminal, khác với Module 13 Logistics Partner Integration.

| Trigger | Xử lý |
|---|---|
| Gate-in | Tạo CODECO gate-in vào Outbox |
| Gate-out | Tạo CODECO gate-out vào Outbox |
| Dispatcher | Gửi qua route đã cấu hình: MOCK / HTTPS / SFTP |
| Partner response/ACK | Lưu để đối soát delivery/application result |
| Failure | Đưa vào trạng thái lỗi, cho phép retry và theo dõi incident |

Web `/edi` cho phép người vận hành theo dõi Outbox, ACK/receipt và các sự cố cần xử lý. Chi tiết format EDIFACT, HMAC/SFTP, host-key và parser nằm trong tài liệu kỹ thuật EDI riêng, không phải trọng tâm của đặc tả nghiệp vụ tổng thể.

### 8.2 Email & Thông báo

- Gửi hoá đơn qua email (PDF đính kèm)
- Thông báo gate-out đến Consignee / Agent
- Cảnh báo Gate Pass sắp hết hạn
- Cảnh báo container sắp hết free storage days

### 8.3 Push Notification (Mobile)

- FCM (Firebase Cloud Messaging) cho Android
- APNs cho iOS

### 8.4 Tích hợp bàn giao đối tác (Module 13)

| API/Operation | Chiều | Mục đích |
|---|---|---|
| `GET /external/handovers` | Partner → ICD | Lấy Handover thuộc Partner |
| `GET /external/handovers/:id` | Partner → ICD | Lấy chi tiết container/handover được phép |
| `POST .../:id/accept` | Partner → ICD | Xác nhận nhận nhiệm vụ |
| `POST .../:id/in-transit` | Partner → ICD | Báo container đang vận chuyển |
| `POST .../:id/warehouse-received` | Partner → ICD | Xác nhận kho đã nhận + optional POD/GPS |
| ICD Confirm/Dispute | ICD Web nội bộ | Xác nhận cuối hoặc tạo đối soát |

ICD là API Provider và cấp API Key cho Partner. Partner chỉ tác động lifecycle `transport_handover`; không có endpoint external để sửa Gate/Yard/Billing/Gate Pass.

## 9. Bảng tổng hợp yêu cầu chức năng

| Mã | Chức năng | Mô đun | Ưu tiên |
|----|-----------|--------|---------|
| MN-01 | Tạo/import Manifest, MBL, HBL | Manifest | Cao |
| CT-01 | Tra cứu vòng đời Container Visit | Container | Cao |
| CT-02 | Quản lý Lệnh giữ nghiệp vụ/Release | Container | Cao |
| TV-01 | Tạo và xác nhận Truck Visit | Gate-in | Cao |
| GI-01 | Gate-in/Reception và scan Mobile | Gate-in | Cao |
| YD-01 | Yard Assign theo hard rules | Yard | Cao |
| YD-02 | Movement / Inspection / Booking | Yard | Cao |
| BL-01 | Tính phí, Service Order, Invoice, Payment | Billing | Cao |
| GP-01 | Readiness + tạo Gate Pass | Gate Pass | Cao |
| GP-02 | Scan/re-check readiness và Gate-out | Gate Pass | Cao |
| WQ-01 | Danh sách công việc thông minh theo SLA/role | Work Queue | Cao |
| ML-01 | ML rerank Yard Slot có fallback | Yard ML | Trung bình |
| DB-01 | Dashboard và báo cáo vận hành | Reports | Cao |
| DB-02 | Yard Inventory EOD / Excel export | Reports | Trung bình |
| EDI-01 | CODECO Outbox + delivery status/ACK | EDI | Trung bình |
| PH-01 | Tạo/Publish Bàn giao vận chuyển | Module 13 | Cao |
| PH-02 | Partner đọc Handover/Container được cấp | Module 13 | Cao |
| PH-03 | Partner Accept / In Transit | Module 13 | Cao |
| PH-04 | Partner Warehouse Received Confirmation | Module 13 | Cao |
| PH-05 | ICD Confirm / Dispute | Module 13 | Cao |
| PH-06 | Quản lý Đối tác tích hợp API/API Key | Module 13 | Cao |
| PH-07 | Nhật ký API đối tác + Idempotency | Module 13 | Cao |

---

*Tài liệu này là nền tảng để tách ra thành Web Application Spec, Mobile Application Spec, Database Design và Tích hợp bàn giao đối tác API Spec. Core ICD luôn là source-of-truth; Module 13 chỉ mở rộng Handover với hệ thống bên ngoài.*
