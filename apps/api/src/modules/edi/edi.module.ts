/**
 * edi / edi.module.ts
 *
 * Mục đích:
 * File dự kiến triển khai cho module edi. Tạo/dispatch EDI message, theo dõi retry, ACK và failure.
 *
 * Quy tắc khi triển khai:
 * - Ownership module: EDI outbox/message/ack; lỗi EDI không rollback core Gate nếu đặc tả không yêu cầu.
 * - Tuân thủ pattern chung trong docs/development/OPERATION_PATTERNS.md.
 * - Chưa có logic; chỉ thêm code khi bắt đầu triển khai module này.
 *
 * Lưu ý:
 * - File hiện tại chỉ là khung, chưa có logic thực thi.
 * - Không tự ý mở rộng trách nhiệm của file nếu chưa cập nhật RULES.md của module.
 */
