# Kiểm chứng W-N-022–026 / 2026-10-04

Giữ thiết kế, enum/contract backend và nghiệp vụ hiện có. Không tạo giao dịch trong các browser case dưới đây. Các snapshot/diff liền kề nằm tại `fixes/dependency-detail-2026-10-04/manifest.json`; diff toàn đợt từ source-before được ghi riêng là shared-file review diff.

| ID | Nguyên nhân và sửa | Regression và runtime |
|---|---|---|
| W-N-022 / P1 | Field liên kết chỉ được cập nhật khi mọi read hoàn tất. Provider reconcile khi dependency hoàn tất; vị trí chưa xác minh có copy trung tính, cache bị cấm đọc bị bỏ. | Provider RED/GREEN và location fixtures; actual read shipping-lines chậm5s: trước sửa container đã xếp báo Chưa xếp; sau sửa hiện đúng vị trí canonical khi global pending=true. Holds vẫn chưa xác minh, không bật giao dịch từ dữ liệu chưa xác nhận. |
| W-N-023 / P1 | Detail invoices/MO/handover dùng array trống như absence thành công. Availability và count theo resource; tạo lệnh chỉ khi xác nhận absence, handover.create kiểm riêng. | RED:14 thất bại thực; GREEN:31 location/derived/permission cases. GATE_STAFF thật: invoices403 có alert, count trung tính, không false-zero/empty hoặc dữ liệu tiền. |
| W-N-024 / P2 | Backend MovementOrder không có orderCode/orderNumber; mapper làm mất identity. | Contract RED/GREEN; dùng canonical id backend. Container360 thực tế hiện UUID của đúng lệnh, không invent mã hoặc đổi schema. |
| W-N-025 / P2 | Header flex co heading; tab label bị co và wrap nhiều dòng tại320px. Header wrap badge, nút đóng shrink0, tab nowrap trong thanh cuộn hiện có. | Đo trước/sau native browser actual320/375/768/1440px, identifier11ký tự cao25px=line-height25px, không document/body overflow. Đây là reflow test, không phải zoom200%. Không viết test chỉ mirror utility class. |
| W-N-026 / P2 | Selected tab chỉ thể hiện qua màu. Sáu native button có aria-pressed theo state thực. | RED thiếu aria-pressed; GREEN32/32 bao gồm31 case cũ. Native browser Enter vào mỗi tab: đúng một pressed=true; focus-visible solid2px. Không suy luận lời đọc screen reader. |

## Giới hạn bằng chứng

- `container-dialog-requested320-invalid-actual1440-oct04.json` là EXCLUDED: viewport handle cũ không đổi innerWidth. Đã đo lại bằng capability mới xác nhận320px thực.
- `progressive-containers-catalog5s-series-2026-10-04.json` giữ nguyên FAIL trước sửa; artifact sau sửa riêng, không ghi đè failure.
- Timestamp CUA là thời điểm quan sát host, không đo input→paint p95 hoặc INP.
- Một role hoặc một section progressive không đủ để nâng toàn observation loading lên PASS.
- Android nguồn mới, screen-reader speech, zoom200%, hover/pressed và performance route có auth còn UNKNOWN.
