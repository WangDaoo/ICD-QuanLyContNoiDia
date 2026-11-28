# RULES — realtime

## Trách nhiệm module

Báo cho Web và Mobile biết nhóm dữ liệu nào vừa thay đổi để client tự tải lại.

## Ownership

Không sở hữu dữ liệu nghiệp vụ. Chỉ giữ bus sự kiện trong bộ nhớ và kết nối SSE `GET /api/realtime/events`.

## Quy tắc

- Sự kiện chỉ mang `topics`, thời điểm, nguồn và mã client gửi (`X-Client-Id`); không mang bản ghi nghiệp vụ.
- Client đọc lại dữ liệu qua API thường, nên quyền đọc vẫn do module nguồn kiểm soát.
- Sự kiện HTTP chỉ phát sau khi handler trả về thành công (transaction đã commit).
- Sự kiện chỉ tới người dùng cùng ICD; sự kiện `audience = user` chỉ tới chính người dùng đó.
- Luồng đóng khi access token hết hạn hoặc phiên bị thu hồi; client làm mới token rồi kết nối lại.
- Route ghi mới cần khai báo topic trong `realtime-topics.ts` nếu không khớp quy tắc theo tiền tố.
- Bus chạy trong một tiến trình. Khi chạy nhiều instance API phải thay bằng kênh dùng chung (Redis Pub/Sub hoặc tương tự).
