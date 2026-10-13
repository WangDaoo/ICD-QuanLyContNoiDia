# Hợp đồng biên soạn báo cáo Mobile ICD

- Ngày biên soạn: 08/10/2026, Asia/Saigon.
- Mẫu: `DoAn3-mobile-reference.docx`; SHA256 `FA00C74F131462DDC97D675DE8087F82F84EF4F54ABB2EBEDF11B4164FB148EA`; 108 trang, 2 section, 54 ảnh inline.
- File gốc trong Downloads giữ nguyên. Bản đầu ra là báo cáo đồ án Mobile ICD, không phải báo cáo tuần ngắn.
- Giữ bìa, logo trường và khung học thuật của mẫu. Theo yêu cầu người dùng, thay danh tính thành Đào Minh Quang / 10123264, học phần Phát triển ứng dụng mobile đa nền tảng, giảng viên hướng dẫn Vũ Xuân Thắng và đề tài Xây dựng hệ thống quản lý kho bãi container nội địa (ICD).
- Hình học trang: A4 dọc. Bìa lề trên/dưới/phải 2 cm, trái 3 cm. Nội dung lề trên/dưới 3 cm, trái 3,5 cm, phải 2 cm. Header 1,27 cm; footer 1,2 cm ở phần nội dung.
- Giữ 2 section, cover paragraph border/logo/style Bìa. Các phần bài cũ về bán thiết bị âm thanh, ảnh sản phẩm, danh mục cũ và nội dung kết quả cũ được thay toàn bộ.
- Nội dung Times New Roman 13 pt, line spacing 1,5 như Normal của mẫu. Heading chính 14 pt bold centered, mục 13 pt bold, tiểu mục 13 pt bold italic. Đánh số chương/mục hiển thị tường minh; bỏ auto numbering cũ để không lặp số. Bản chỉnh theo mẫu khôi phục đường kẻ dưới header và footer chỉ có số trang.
- Dùng Heading 1–3 cho mục lục Word; caption style HinhVe/Bang có outline body, danh mục hình/bảng riêng qua field TOC. Header đề tài Mobile, footer PAGE. Cập nhật field bằng Word COM.
- Nguồn chính: README bản 04/10/2026, system-inventory.json, Mobile/Business/Database specs v1.7, API callers/mobile navigation và package.json. Đặc tả là yêu cầu; README/mã nguồn quyết định stack và trạng thái đã triển khai.
- Giữ cấu trúc học thuật 4 chương: Tổng quan; Cơ sở lý thuyết và công nghệ; Phân tích thiết kế; Triển khai kiểm thử. Có phần đầu, danh mục, kết luận, tài liệu tham khảo, phụ lục API/DTO/dữ liệu/ảnh/test. Chương 1 theo nhịp Lý do/Mục tiêu/Phạm vi/Nội dung/Phương pháp của mẫu; phần Use Case dùng tác nhân/mục đích, điều kiện, luồng chính, mở rộng và kết thúc; Chương 4 có thuyết minh chi tiết sau mỗi ảnh.
- Có sơ đồ kiến trúc, use case, navigation, trạng thái, activity, sequence, ERD, boundary-control-entity và deployment. Sơ đồ là mô hình hóa từ source, không chứng nhận runtime. Danh mục đặc tả từng sơ đồ giúp vẽ lại chi tiết.
- Ảnh audit Expo Web được chú thích đúng môi trường/ngày. Ảnh lịch sử giữ giá trị minh họa tại thời điểm chụp. Không dùng ảnh recommendation cũ để quảng bá thuật toán tối ưu đã nghiệm thu.
- Kết quả test chỉ từ audit có bằng chứng. Native/Camera/TalkBack/iOS chưa chạy ghi chưa kiểm chứng; ma trận test đề xuất để trống kết quả. Không bịa tỷ lệ PASS, số liệu thực tế hoặc điểm 100.
- Bảng dùng cột có độ rộng rõ, 10,5–11 pt, header xanh/ chữ trắng như bảng của mẫu, không split row; caption đi cùng bảng. Biểu đồ và ảnh có caption, alt description, tránh mất chữ. Elip Use Case màu xanh nhạt như tài liệu tham chiếu.
- Giọng viết theo yêu cầu người dùng: câu cụ thể, không phô trương, không lặp nhịp đối xứng, không chồng ba tính từ, không viện uy quyền thiếu nguồn.
- Render packaged thất bại vì thiếu bundled soffice.exe. Fallback QA dùng Word PDF export và bundled Poppler, không sửa mẫu. Kiểm tra toàn bộ trang đầu ra, TOC/caption/page numbers, không còn nội dung bán hàng.
