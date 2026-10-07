# Operational Holds Module Rules

- Module sở hữu vòng đời operational hold.
- Tạo hold qua `create`; giải phóng hold qua `release`.
- Không cho module khác cập nhật trực tiếp trạng thái hold bằng Prisma.
- Action thay đổi hold phải kiểm tra container visit thuộc đúng ICD và ghi audit khi cần.
- Query chỉ đọc dữ liệu, không làm thay đổi trạng thái.
