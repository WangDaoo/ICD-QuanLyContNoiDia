# RULES — yard

## Trách nhiệm module
Quản lý vị trí bãi, xếp vị trí, di chuyển, kiểm định, booking và recommendation.

## Ownership
Yard slot/location/movement/inspection/booking.

## Quy tắc
- Public method phải dùng động từ rõ nghĩa.
- Không expose `updateStatus`.
- Query không thay đổi dữ liệu.
- Command thay đổi dữ liệu phải validate state/business rule.
- Action quan trọng phải audit.
- Không bypass ownership của module khác bằng Prisma trực tiếp.
- DTO chỉ validate input.
- Controller không chứa transaction.
- Nếu có side effect external, commit core trước trừ khi đặc tả nói khác.
