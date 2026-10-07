# Kiểm thử giao diện quét QR trên Expo Go

Thực hiện 02–03/10/2026 (Asia/Saigon). Hoàn thành giao diện dùng chung cho mã container và QR phiếu ra cổng, chạy và thao tác trực tiếp trong Expo Go trên Android Emulator Pixel. Người dùng đã cho phép dùng Android SDK/ADB để kiểm thử.

## Kết quả

| Hạng mục | Kết quả / bằng chứng |
| --- | --- |
| Giao diện camera sau, nền che, 4 góc căn mã, đường căn, hướng dẫn, đóng/đèn/nhập tay | Đạt — [ảnh cuối](47-final-native-scanner.png) |
| QR container đọc qua camera thật của emulator | Đạt — QAOU4835930 được nhận, giữ trong ô nhập; backend tìm hồ sơ và từ chối vì không có lượt PENDING/AUTHORIZED — [ảnh](45-final-container-backend.png) |
| QR sai loại trong chế độ phiếu ra | Đạt — QR container giữ màn quét mở và hướng dẫn dùng QR phiếu — [ảnh](32-native-wrong-qr-result.png) |
| QR có tiền tố gp1. nhưng chữ ký không hợp lệ | Đạt — camera đọc fixture gp1.invalid.signature; backend trả lỗi thật; phiên ADMIN vẫn đăng nhập — [ảnh](46-final-gatepass-backend.png) |
| Quyền camera | Đạt — trạng thái chưa có quyền, dialog Android, từ chối, liên kết Cài đặt, cấp lại và quay về camera — ảnh 35–39 |
| Camera xuống nền | Đạt sau sửa — Android camera service báo Active Camera Clients: [] — [log](background-camera-fixed.txt) |
| Nhập tay / đóng camera | Đạt sau sửa — trở về form, camera service không còn client hoạt động — [log](manual-fallback-camera-fixed.txt) |
| Nút đèn | Đạt trạng thái bật/tắt, bị khóa khi chưa sẵn sàng; emulator không chứng minh được độ sáng flash vật lý — [ảnh](06-native-torch.png) |
| Cỡ chữ hệ thống 140% | Đạt — hướng dẫn và nút không bị cắt — [ảnh](41-native-font140.png) |
| Màn hình thấp khoảng 320×480 dp | Đạt — có thể cuộn tới nút và thao tác nhập tay — [ảnh](44-native-small-controls.png) |
| Quét lặp, callback cũ, sai mã, lỗi mount/retry, web fallback | Kiểm thử hồi quy TSX thực tế đạt; lỗi mount được mô phỏng ở biên native |
| Bộ kiểm thử mobile | 125/125, fail 0 — [log](mobile-tests.txt) |
| TypeScript / ESLint các file thay đổi | Exit 0 — [typecheck](typecheck.txt), [lint](lint.txt) |
| Expo Android export / Hermes | Exit 0, bundle 4.3 MB — [log](android-export.txt) |

## Lỗi tìm được và sửa

- Callback sẵn sàng của camera đầu tiên bị vô hiệu do tăng generation trong passive effect: chuyển invalidation trước khi tạo callback và thêm regression.
- Cấp camera lại từ Cài đặt không cập nhật hook quyền: dùng getter khi màn hoạt động trở lại.
- Khung tối nhưng thanh trạng thái chữ tối: chuyển sang light-content trong modal.
- Màn hình thấp/cỡ chữ lớn có thể mất nút cuối: cho nội dung cuộn; đã thử native với thay đổi display/font rồi khôi phục.
- Quét container thất bại trông như không có kết quả: giữ số vừa quét và đưa lỗi tìm hồ sơ ngay cạnh ô container.
- Backend GATE_PASS_TOKEN_INVALID trả HTTP 401 khiến app refresh rồi đăng xuất: nhận diện riêng mã lỗi nghiệp vụ này; vẫn giữ xử lý refresh/đăng xuất đối với 401 xác thực tài khoản thông thường.
- Android có thể trì hoãn React render khi nhấn Home: dừng preview native ngay qua camera ref trên AppState/blur, đóng/nhập tay và khi đã nhận mã hợp lệ; sau sửa camera service xác nhận không còn camera hoạt động.

Đã có rà soát độc lập component, tích hợp và xử lý phiên. Các phát hiện về quyền và màn hình thấp đã sửa; không còn phát hiện quan trọng chưa xử lý trong phạm vi này.

## Môi trường và phạm vi

Pixel AVD, emulator-5554, Android API 37, Expo Go 57.0.9, Expo SDK 57. Metro có sẵn tại 8081 được mở bằng exp://10.0.2.2:8081. Backend thật tại cổng 3000; adb reverse tcp:3000 tcp:3000 đã thiết lập sau khi người dùng cho phép SDK/ADB. Không đổi backend/schema, reseed hoặc xác nhận Gate-In/Gate-Out.

QR được tạo cục bộ rồi đưa vào camera VirtualScene, điều khiển vị trí bằng SDK; camera decoder thật đọc mã và app gọi API thật. Ảnh fixture không chứa mật khẩu, access token hoặc phiếu có chữ ký thật. Chức năng nhập ảnh QR vào camera mô phỏng được Android mô tả trong [Camera support](https://developer.android.com/studio/run/emulator-use-camera).

Đã khôi phục display về 1080×1920, font_scale 1.0, pose camera và ảnh scene mặc định. Expo Go được để mở tại màn quét phiếu ra cổng. Các tab browser và dịch vụ đang chạy được giữ nguyên.

## Giới hạn / lưu ý vận hành

Chưa chứng minh flash vật lý, độ nét/quét trong môi trường cảng thực tế, máy iOS, Code128/Code39 qua camera hoặc toàn bộ luồng phiếu hợp lệ đến xác nhận Gate-Out. Phiếu sai chữ ký và container đã ở bãi chỉ kiểm tra phản hồi từ chối; không tạo giao dịch cổng để kiểm thử giao diện.

Automatic approval review đã chặn lệnh khởi động Metro riêng và lệnh cấu hình chuyển tiếp Metro 8081, không cung cấp lý do cụ thể. Công cụ Windows từ chối điều khiển qemu-system-x86_64; người dùng sau đó cho phép SDK/ADB và việc kiểm thử native đã được thực hiện theo cách này. Expo Go đôi lúc báo Cannot connect to Expo CLI sau khi trở lại app; bundle tải được và app/API vẫn hoạt động, nhưng kết nối công cụ phát triển chưa được xác nhận ổn định. Không coi cảnh báo đó là lỗi xác thực hay thành công giả của nghiệp vụ.

Tên một số ảnh 02–29 là mốc điều tra, có thể chứa lỗi trước sửa hoặc chụp trong lúc chuyển màn. Dùng các ảnh 32, 35–37, 41, 44–47 và các log có hậu tố fixed để đánh giá kết quả cuối.
