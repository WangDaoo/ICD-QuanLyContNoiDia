# Kiểm thử và sửa trang Vận hành Bãi — 02/10/2026

Trang web tại **http://127.0.0.1:5173/** đã có khung ICD demo, hiển thị vị trí thật theo Block / Row / Bay / Tier, Legend thống nhất và thao tác bãi nối backend. Thuật toán đề xuất vị trí hiển thị đúng **“Đang trong quá trình phát triển”** theo yêu cầu hiện tại của người dùng. Không chạy chấm điểm hoặc gọi recommendations từ trang này.

[Mở bộ 39 ảnh kiểm thử](gallery.html). Ảnh trước khi sửa: [01-before.jpg](01-before.jpg). Giao diện sau sửa: [29-final-desktop-map.jpg](29-final-desktop-map.jpg); [khung đầy đủ bốn Block](32-complete-site-plan.jpg).

## Đối chiếu tài liệu

Đã đọc bảy tài liệu v1.7 MySQL người dùng cung cấp. Tài liệu là nguồn mô tả nghiệp vụ; yêu cầu mới của người dùng về tạm dừng thuật toán thay thế phần gợi ý Rule-based/ML trong Web Spec ở phạm vi trang này.

| Nguồn | Yêu cầu liên quan | Kết quả |
|---|---|---|
| [Web Spec §3.8.1](</D:/Project/Đồ Án 4 +Mobile/ICD_Web_Spec_v1.7_MySQL.md:531>) | Grid Block/Row/Bay, trống trắng, có container xanh, bảo trì xám, click xem chi tiết | Đã dựng sơ đồ tổng thể và grid vị trí, danh sách có bộ lọc và popup chi tiết |
| [Web Spec §3.8.2](</D:/Project/Đồ Án 4 +Mobile/ICD_Web_Spec_v1.7_MySQL.md:549>) | Chọn thủ công, backend kiểm tra điều kiện vị trí | Đã thêm kiểm tra thật trước xác nhận; source `MANUAL`; thay tọa độ làm mất hiệu lực kết quả kiểm tra cũ |
| [Business Spec YD-01–03](</D:/Project/Đồ Án 4 +Mobile/ICD_Business_Spec_v1.7_MySQL.md:398>) | Cập nhật vị trí, xem sơ đồ, tìm container | Đã kiểm thử trên bản đồ, tìm kiếm và API |
| [Business Spec ST-01–03](</D:/Project/Đồ Án 4 +Mobile/ICD_Business_Spec_v1.7_MySQL.md:415>) | Lịch booking, số kiện/trọng lượng/tình trạng thực tế | Luồng tạo/bắt đầu/hoàn tất/hủy dùng API; đã lưu và đọc lại 100 kiện, 20.000 kg và ghi chú |
| [Business Spec IN-01–02](</D:/Project/Đồ Án 4 +Mobile/ICD_Business_Spec_v1.7_MySQL.md:440>) | Tạo và ghi nhận giám định PASS/FAIL/HOLD | Đã bổ sung tạo, bắt đầu, kết quả; kiểm thử PASS và chặn HOLD thiếu lý do |
| [Business Spec MV-01–03](</D:/Project/Đồ Án 4 +Mobile/ICD_Business_Spec_v1.7_MySQL.md:458>) | Lệnh di chuyển và cập nhật vị trí | Đã kiểm thử tạo/bắt đầu/hoàn tất/di chuyển về/hủy khi đang chạy |
| [Database Spec trạng thái Visit](</D:/Project/Đồ Án 4 +Mobile/ICD_Database_Design_v1.7_MySQL.md:268>) | Sáu trạng thái canonical của Container Visit | Giữ trạng thái thực tế backend; giám định màu vàng đọc từ inspection `IN_PROGRESS` |

Khung sơ đồ gồm ranh giới ICD, cổng vào/ra, đường nội bộ, khu đệm/trạm cân, điều hành/chứng từ, CFS và khu giám định. Hạ tầng minh họa được ghi nhãn rõ. Đây là sơ đồ ICD demo, không theo tỷ lệ địa lý và không bổ sung nghiệp vụ cầu tàu. Số lượng Block/slot/container lấy từ dữ liệu backend.

## Các lỗi đã sửa

- Grid cũ bị dàn phẳng và thiếu khung vận hành: hiện tách đúng Row × Bay, có tầng, chọn Block, tìm vị trí/container và popup chi tiết. Các nhãn `R02/B03/T1` hoặc `01/02/1` được giữ nguyên.
- Legend và ô dùng chung bảng màu. Chế độ loại vị trí: trống trắng, occupied xanh dương, ngưng dùng/bảo trì xám, slot lạnh trống cyan. Chế độ container bổ sung trong bãi xanh lá, Hold đỏ, giám định đang chạy vàng, phiếu ra cổng tím. Phiếu đã cấp không được diễn giải thành đủ điều kiện ra cổng.
- Slot `MAINTENANCE`, slot ngưng dùng hoặc Block ngưng dùng được chặn chọn như dữ liệu backend. Occupancy đối chiếu bằng Container **Visit ID**.
- Đã bỏ gọi/chọn đề xuất từ trang web này. Xếp thủ công kiểm tra backend rồi mới ghi nhận; không dùng trọng lượng khai báo hoặc ISO display type để tự thay thế hard rules của backend.
- Bổ sung bảng và popup di chuyển, booking, giám định; nút tương ứng theo `yard.update/configure/move/booking/inspect`. Có trạng thái đang gửi, lỗi trong form và lý do hủy.
- Booking dùng ngày giờ địa phương thật từ form. Ngày trống bị chặn; sửa thành `17:30` lưu đúng `10:30 UTC`. Form kết quả ghi nhận số kiện, kg và tình trạng hàng; dữ liệu tùy chọn chưa ghi nhận giữ trống, không tự biến thành `0 kg`.
- Loader đọc đúng metadata phân trang trong `{data:{items,meta}}`. Công việc ở trang sau vẫn được tải khi vượt 100 bản ghi; nếu trang sau lỗi, báo lỗi thay vì trả danh sách bị cắt. Regression kiểm tra 101 bản ghi, gồm tác vụ đang chạy ở trang hai; không tạo thêm 101 record vào cơ sở dữ liệu chỉ để thử.
- Inspection đã có thao tác bắt đầu qua endpoint thực. Vì backend giữ Visit `IN_YARD` khi bắt đầu inspection, bản đồ đọc inspection `IN_PROGRESS` để tô vàng; Hold giữ ưu tiên đỏ.
- Lỗi nghiệp vụ canonical `{error:{message}}` hiện thông báo tiếng Việt, ví dụ mã Block trùng: **“Mã Yard Block đã tồn tại trong ICD.”**, thay cho lỗi HTTP chung chung.
- Popup cuộn được, có Escape, vòng Tab và trả focus về nút mở. Đã kiểm tra ở 390 × 844 và 1440 × 1000.

## Kiểm thử trực tiếp

Backend MySQL/API được sử dụng thật; giao diện kiểm thử ở cổng 5173. Chỉ thao tác trên hồ sơ QA cục bộ, không reseed hoặc migrate dữ liệu.

| Luồng | Thao tác và bằng chứng | Kết quả |
|---|---|---|
| Bản đồ | 4 Block A–D × 2 tầng; đối chiếu ID và màu DOM với API/Legend | 48 ID vị trí duy nhất khớp backend; 13 occupied, 35 khả dụng |
| Hold | Mở QAOU5007570 và xem nguyên nhân giữ | Đỏ đúng Legend; Hold cũ vẫn ACTIVE, readiness vẫn bị chặn |
| Giám định | Tạo/bắt đầu trên QAOU5007565; xem vàng; thử HOLD thiếu ghi chú; hoàn tất PASS | Màu vàng chỉ khi chạy; thiếu ghi chú bị chặn; PASS lưu thật và trở lại xanh lá |
| Xếp thủ công | QAOU6004067 → A / 2 / 2 / 1; kiểm tra hợp lệ, đổi Tier để thử mất hiệu lực xác nhận, chọn lại và lưu | Backend ghi `A-02-02-1`, source `MANUAL`; còn đúng sau reload |
| Di chuyển | QAOU5007565: A-01-03-2 → A-02-01-2 → quay về; thêm lệnh bắt đầu rồi hủy | Tạo/bắt đầu chưa đổi occupancy; hoàn tất mới đổi; ô đích tạm được trả AVAILABLE sau quay về/hủy |
| Booking | Tạo/bắt đầu, hủy PENDING và IN_PROGRESS có lý do; ngày trống; giờ sửa; số kiện âm | Validation đúng; lịch sửa khớp UTC; kết quả hoàn tất 100 kiện / 20.000 kg / ghi chú còn trong API |
| Trọng lượng tùy chọn | QAOU6004067: tạo/bắt đầu/hoàn tất booking INSPECTION, giữ trống số kiện/kg | Popup giữ trống; UI hiển thị `—`; backend giữ `actualPackageCount/actualWeight = null`, không tự ghi 0 |
| Cấu hình | Thiếu trường bắt buộc, mã Block trùng, nhập nhãn tọa độ chữ/số | Form báo lỗi; 409 giữ thông báo backend; nhãn R02/B03/T1 nhập được, không tạo slot giả để thử |
| Tìm/lọc | Tìm QAOU6004067, chọn Block/tầng, lọc slot lạnh | Các ô/record hiển thị đúng dữ liệu; sơ đồ tổng thể và grid chi tiết có thể biểu diễn cùng một ID |
| Bàn phím/kích thước | Tab ở nút cuối, Shift+Tab, Escape, focus restore; viewport nhỏ | Không tràn ngang trang ở 390 px; popup nằm trong viewport, thao tác còn truy cập được |

Snapshot [verify-api.json](verify-api.json) kiểm tra lại 43 lần gọi API trong lượt cuối. [evidence-validation.json](evidence-validation.json) kiểm tra 16 nhóm điều kiện từ dữ liệu DOM và snapshot theo thời điểm, gồm vị trí chỉ đổi khi hoàn tất và dữ liệu tùy chọn giữ null. Có thể chạy lại:

```powershell
node test-artifacts/2026-10-02-web-yard-audit/yard-qa.mjs verify
node test-artifacts/2026-10-02-web-yard-audit/verify-evidence.mjs
```

| Container QA | Trạng thái cuối | Vị trí cuối | Tác vụ còn mở |
|---|---|---|---|
| QAOU5007565 | IN_YARD | A-01-03-2 | 0 |
| QAOU5007570 | IN_YARD, còn Hold | A-01-01-2 | Giữ nguyên hồ sơ Hold/giám định cũ |
| QAOU6004067 (mới tạo cho lượt này) | IN_YARD | A-02-02-1 | 0 |
| QAOU5007550 / QAOU1882075 | EXITED | Không có | Không thay đổi |

## Kiểm tra mã

- Frontend/helpers/mappers/API error client: **62 tests pass**, [web-tests.txt](web-tests.txt).
- Backend: **7 suites / 36 tests pass**, gồm serialization, movement, assignment, inspection và recommendation hiện có.
- Web TypeScript và Vite build: pass, [web-build.txt](web-build.txt); build còn cảnh báo bundle lớn hơn 500 kB.
- Targeted ESLint các component/helper mới và shared API client: pass, [targeted-lint.txt](targeted-lint.txt). Chưa tuyên bố toàn bộ web đạt lint: các service/mapper/context cũ còn sử dụng `any`.
- Permission chỉ xem được kiểm thử bằng render fixture `yard.read`; không sửa tài khoản/quyền seed để tạo tài khoản test thực tế.
- Bảo trì/Block ngưng dùng được kiểm thử bằng regression mapper và palette; chưa đổi cấu hình bãi đang dùng để tạo fixture bảo trì trực tiếp.

## Phần chưa đáp ứng đầy đủ tài liệu

1. **ST-04 — Stripped:** Business Spec yêu cầu đổi trạng thái sau rút hàng, nhưng Database/API hiện chỉ có sáu trạng thái Visit, không có `STRIPPED`. Hoàn tất booking hiện cập nhật booking `COMPLETED`, kết quả thực tế và event; Visit giữ trạng thái backend. Legend có nhãn tương thích “Rút hàng xong” không chứng minh có transition này. Cần thống nhất contract nghiệp vụ trước khi thay lifecycle/schema.
2. **ST-05 — Bulk booking:** UI/API hiện tạo cho từng Visit; chưa có bulk booking.
3. **IN-03 — Upload PDF:** inspection schema/DTO hiện chưa có attachment; chưa hỗ trợ upload và lưu biên bản PDF.
4. **IN-04 — Thông báo:** suite backend kiểm tra notification trigger; lượt UI này không gửi/kiểm chứng email bên ngoài.
5. Thuật toán tối ưu vị trí đang tạm dừng theo yêu cầu. Bản đồ có tọa độ thật để tích hợp sau; không có điểm số/đề xuất demo.

## Tệp triển khai chính

- [YardView.tsx](</D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/YardView.tsx>) — điều hướng trang, danh sách, cấu hình.
- [YardSiteMap.tsx](</D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardSiteMap.tsx>) và [yard-model.ts](</D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/yard-model.ts>) — khung ICD, hình học tọa độ, palette/Legend.
- [YardAssignment.tsx](</D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardAssignment.tsx>) — kiểm tra và xếp thủ công.
- [YardOperations.tsx](</D:/Project/Đồ Án 4 +Mobile/icd-management/apps/web/src/components/yard/YardOperations.tsx>) — di chuyển, booking và giám định.
- Mapper/context/shared client đã sửa contract liên quan; các test regression nằm cạnh tệp triển khai.

Ảnh và snapshot giữ lại để người dùng kiểm tra; hồ sơ QA không bị xóa và không còn lệnh mới đang chờ/chạy ở cuối lượt.
