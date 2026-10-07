# Kiểm thử và sửa bãi mobile — 02/10/2026

Đã hoàn tất phạm vi được chấp thuận: xếp bãi thủ công hoạt động độc lập với đề xuất, sơ đồ mobile theo tọa độ thật, Legend thống nhất với web và phân biệt kết quả giám định. Giữ khung terminal 5 tab Cổng / Bãi / Giám định / Tra cứu / Việc ca và nền sáng/tối.

## Các lỗi đã sửa

| Vấn đề | Kết quả |
|---|---|
| Lỗi hoặc chậm API đề xuất khiến phần xếp tay không dùng được | Catalog và đề xuất tải, báo lỗi, thử lại độc lập. Xếp tay vẫn kiểm tra điều kiện thật và ghi nguồn `MANUAL`. |
| Grid phẳng khó xác định tọa độ | Chọn Block và Tier, xem Row × Bay, vuốt ngang để xem các bay; chỉ hiển thị slot thật. Tọa độ thiếu được nêu rõ, không tạo ô bãi giả. |
| Màu khác Legend/web | Legend và ô dùng chung bảng màu: trống trắng, có container xanh, bảo trì xám, lạnh trống cyan, Hold đỏ, giám định đang thực hiện vàng. |
| Thiếu ngữ cảnh Hold/giám định | Popup hiển thị đúng Visit, lý do Hold, trạng thái/kết quả giám định và dữ liệu slot từ backend. Chỉ tải Hold khi có quyền. |
| Kết quả giám định chỉ hiện trạng thái hoàn tất | Danh sách thể hiện riêng PASS / FAIL / HOLD, với giải thích và màu phù hợp. |
| Đổi màn hình khi tra vị trí gây phản hồi cũ xóa lựa chọn mới hoặc cho xếp khi vị trí chưa rõ | Chặn phản hồi cũ theo thế hệ yêu cầu; chỉ cho thao tác khi vị trí của Visit đã được xác định. Refresh tra vị trí độc lập với catalog. |
| Kết quả đề xuất/kiểm tra cũ có thể phục hồi sau đổi màn hình/đích | Hủy hiệu lực kiểm tra, đề xuất và dialog cũ; chỉ nhận kết quả cho lựa chọn hiện tại. |
| Nhấn xác nhận nhanh hai lần gửi hai lệnh | Khóa đồng bộ trước khi chờ backend, áp dụng cho xếp tay, xếp theo đề xuất và tạo lệnh đảo chuyển. |

Chạm slot luôn mở chi tiết. Chọn ô trống làm đích là nút riêng; thao tác này chỉ điền form. Backend vẫn kiểm tra điều kiện khi ghi. Slot có container chỉ mở đúng hồ sơ Visit khi tài khoản có quyền xem container. Monitor dùng cùng sơ đồ và popup để xem.

## Kiểm thử mã

- `pnpm --filter @icd/mobile test`: **104/104 đạt**, 0 lỗi, 0 bỏ qua — `mobile-tests.txt`.
- Mobile TypeScript: đạt — `typecheck.txt`.
- ESLint các source/test thay đổi trong phạm vi: đạt — `lint.txt`.
- Expo export Web của mã cuối: đạt — `mobile-export.txt`, output `apps/mobile/dist-qa`.
- Rà soát độc lập các phần xếp bãi, grid/Legend, giám định và tích hợp: các lỗi trọng yếu phát hiện đã sửa; kiểm tra cuối Home/snapshot **17/17 đạt**.

Các regression dùng screen TSX thật qua harness hook/JSX, cùng API giả lập có Promise trì hoãn hoặc lỗi. Bao gồm đề xuất lỗi/chậm, catalog lỗi, thử lại độc lập, tuple Visit/slot, offline/quyền, phản hồi cũ, kiểm tra đích, lỗi backend và chống gửi trùng. Snapshot có kiểm tra không đọc ngữ cảnh thiếu quyền và cảnh báo khi enrichment thất bại. Màu bảo trì/ưu tiên trạng thái và tọa độ thưa/chữ được kiểm tra bằng dữ liệu regression; fixture trực tiếp hiện có 48 slot đều khả dụng hoặc có container.

## Kiểm thử trực tiếp frontend–backend

API `http://127.0.0.1:3000/api`; mobile Expo preview `http://127.0.0.1:8081/`; dữ liệu MySQL cục bộ đang chạy. Không migration/reseed/reset dữ liệu.

Container QA riêng **QAOU4835930**, Visit `8296f2ae-da88-4f0e-bb0d-2835d2d7dc7c`:

1. Tra cứu đúng hồ sơ chưa có vị trí. Nhập ô đã có container `A-01-01-2`: backend báo không đủ điều kiện, xác nhận vẫn bị chặn.
2. Kiểm tra ô `A-02-03-1`: đủ điều kiện. Đổi sang ô khác làm mất kết quả kiểm tra; phải kiểm tra lại trước xác nhận.
3. Xếp tay qua popup: backend ghi `YARD_ASSIGNED`, `source=MANUAL`, `recommendationId=null`, vị trí `A-02-03-1`.
4. Yêu cầu/bắt đầu giám định tình trạng: slot chuyển vàng khi `IN_PROGRESS`, popup có đúng biên bản. Hoàn tất PASS: slot trở lại xanh và popup hiện kết quả đạt.
5. Chọn `A-02-01-2` qua map: chỉ điền đích. Tạo lệnh PENDING và bắt đầu IN_PROGRESS: vị trí vẫn là `A-02-03-1`. Xác nhận hoàn tất mới đổi sang `A-02-01-2`.
6. Tạo/bắt đầu/hoàn tất lệnh chuyển về `A-02-03-1`. Map, selector, hồ sơ container và API khớp; ô tạm trống lại.
7. Reload bản cuối, chọn lại Visit và kiểm tra popup tạo lệnh; đóng popup không tạo thêm lệnh. Bảo toàn 5 tab và xác định vị trí đúng sau refresh.

Cuối đợt: QA có đúng **2 lệnh đảo chuyển COMPLETED**, **1 giám định COMPLETED/PASS**, không còn tác nghiệp PENDING/IN_PROGRESS; trạng thái container vẫn `IN_YARD`. Catalog gồm **48 slot: 14 OCCUPIED, 34 AVAILABLE**.

Hold cũ của QAOU5007570 vẫn `ACTIVE`, lý do và kết quả HOLD hiện đúng, readiness vẫn `false`. Không giải phóng Hold để lấy trạng thái xanh. Các kiểm tra cũ trong helper cũng xác nhận lượt QAOU5007565 giữ vị trí/kết quả đã hoàn tất.

`verify-api.json` lưu 43 lần kiểm tra API của lần xác minh cuối. `verification-summary.json` chứa **16 điều kiện backend đạt**, bao gồm bằng chứng vị trí chỉ đổi sau hoàn tất. Chạy lại `node test-artifacts/2026-10-02-mobile-yard-alignment/mobile-yard-qa.mjs verify` để đọc xác minh, rồi `write-evidence.mjs` để cập nhật tổng hợp/gallery. Không chạy lại phase `prepare` khi chỉ cần xác minh.

## Ảnh và giới hạn kiểm tra

**36 ảnh** trong `gallery.html`: trước sửa, các Block A/B/C/D và hai tầng, nền sáng/tối, chiều rộng 360/390/430px, slot Hold/lạnh, xếp tay, popup, giám định và đảo chuyển. Các ảnh rõ nhất:

- `30-final-map-hold.jpg`: sơ đồ cuối, Legend và Hold đỏ, ô tạm đã trống lại.
- `03-hold-detail.jpg`: dữ liệu Hold/giám định thật.
- `06-reefer-popup-360.jpg`: popup nền tối 360px.
- `09-target-change-invalidates.jpg`, `10-manual-confirm-popup.jpg`, `11-manual-assigned.jpg`: kiểm tra và xếp tay.
- `15-inspection-yellow-popup.jpg`, `18-inspection-pass-blue-popup.jpg`: chuyển màu giám định theo backend.
- `24-movement-complete-popup.jpg`, `27-return-movement-completed.jpg`: xác nhận/hoàn tất đảo chuyển.
- `29-final-confirm-smoke.jpg`: popup bản cuối sau sửa chống gửi trùng.

Kiểm tra trực tiếp dùng Expo Web trong trình duyệt với viewport điện thoại; chưa chạy trên thiết bị Android/iOS thật. Tình huống mạng/đề xuất lỗi và race condition được kiểm tra bằng harness, không gây lỗi mạng của phiên backend đang chạy. Gợi ý vị trí mobile vẫn theo Mobile Spec; thông báo thuật toán đang phát triển của web không tự áp sang mobile. Không mở rộng enum lifecycle, thuật toán tối ưu, PDF/bulk hoặc nghiệp vụ ngoài phạm vi này.
