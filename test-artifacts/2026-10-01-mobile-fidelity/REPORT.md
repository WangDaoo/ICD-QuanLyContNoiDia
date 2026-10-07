# Đối chiếu giao diện mobile — 01/10/2026

Mẫu người dùng chọn: `dựng (2)/src/components/MobileTerminalView.tsx`. Đã chuyển khung giao diện này sang React Native TSX trong `apps/mobile`, với nền sáng mặc định và nút đổi sáng/tối.

## Kết quả giao diện

- Header TOS-MOBILE, vai trò, Quét, thông báo, tài khoản; thẻ phiên đăng nhập thật.
- Năm tab Cổng, Bãi, Giám định, Tra cứu, Việc ca, lọc theo quyền backend. Điều độ có Việc ca, Tra cứu, Monitor; các tác nghiệp được phép vẫn mở được từ nút/tác vụ.
- Form Gate-In có các cặp biển số/seal và tài xế/cân gross, trạng thái vỏ, ghi chú; Gate-In/Gate-Out dạng chuyển chế độ.
- Bãi có chọn container, vị trí thật, gợi ý từ backend và sơ đồ 4 cột. Di chuyển container đã xếp tạo lệnh đảo chuyển thật.
- Giám định có mô tả, mức độ và danh sách biên bản thật; hoàn tất giữ nguyên mô tả hư hỏng ban đầu.
- Đã sửa lỗi phản hồi vị trí/context chậm cập nhật nhầm lựa chọn, dữ liệu form giữ lại giữa các hồ sơ, và danh mục bãi chỉ đọc trang đầu.

Đã kiểm tra cả năm tab ở 360×800 và các form Cổng/Bãi/Giám định ở 390×844. Không tràn ngang ở 360px. Ảnh được chụp từ Expo web preview của ứng dụng React Native, không phải ảnh thiết kế dựng lại.

| Ảnh | Nội dung |
| --- | --- |
| [gate-light-390.jpg](gate-light-390.jpg) | Gate-In sáng, dữ liệu hồ sơ kiểm thử thật |
| [gate-light-360.jpg](gate-light-360.jpg) | Form sáng 360px |
| [gate-dark-360.jpg](gate-dark-360.jpg) | Form tối 360px |
| [yard-dark-360.jpg](yard-dark-360.jpg) | Vị trí container sau đảo chuyển |
| [survey-dark-360.jpg](survey-dark-360.jpg) | Form và biên bản hoàn tất |
| [lookup-dark-360.jpg](lookup-dark-360.jpg) | Tra cứu trả trạng thái IN_YARD |
| [tasks-dark-360.jpg](tasks-dark-360.jpg) | Việc ca, dữ liệu rỗng thực tế |
| [operator-gate-dark-360.jpg](operator-gate-dark-360.jpg) | Điều độ mở Cổng từ nút Quét, ba tab đúng vai trò |
| [movement-completed.jpg](movement-completed.jpg) | Lệnh đảo chuyển COMPLETED |

## Đồng bộ backend

Container kiểm thử `QAMU6102765`, visit `1b09f42d-a027-4522-928c-999ba655c3fe`:

1. Tiếp nhận Gate-In bằng form với xe ARRIVED thật.
2. Xếp bãi bằng gợi ý/context backend vào `A-01-01-2`.
3. Tạo, bắt đầu, hoàn tất đảo chuyển sang `A-01-02-2`.
4. Gửi biên bản DAMAGE_SURVEY mức Nhẹ, bắt đầu và hoàn tất PASS.
5. Tra cứu trả IN_YARD, Bãi hiển thị `A-01-02-2`; API đọc lại xác nhận lệnh đảo chuyển và giám định đều COMPLETED.

[workflow-verify.json](workflow-verify.json) lưu kết quả 5 kiểm tra API. Script `mobile-ui-workflow.mjs verify` chỉ đăng nhập và đọc xác minh; pha `prepare` tạo thêm hồ sơ kiểm thử, không chạy lại nếu không cần.

## Kiểm tra mã

- `pnpm --filter @icd/mobile typecheck`: đạt.
- `pnpm --filter @icd/mobile test`: 20/20 đạt.
- `pnpm --filter @icd/mobile exec expo export --platform web --output-dir dist-qa`: đạt sau chỉnh sửa cuối.
- Rà soát mã độc lập: các lỗi được phát hiện đã xử lý; không còn phát hiện lỗi đáng kể trong phần sửa.

## Giới hạn và khác biệt có chủ đích

Không khôi phục đổi nhân vật demo, ảnh/GPS giả hay thành công giả. Đăng nhập và quyền dùng backend thật. Backend hiện chưa có luồng tải ảnh giám định, nên chưa hiển thị nút giả lập ảnh như mẫu. Quét camera native cần kiểm tra thêm trên thiết bị Android/iOS; lần này kiểm thử bằng Expo web và nhập mã. Gate-Out không chạy lại toàn bộ luồng xuất trong lượt sửa giao diện này.

Runtime local đang dùng API `http://127.0.0.1:3000/api`, web `http://127.0.0.1:5173`, mobile preview `http://127.0.0.1:8081`. Không sửa/xóa dữ liệu cũ; hồ sơ trên được tạo riêng cho kiểm thử.
