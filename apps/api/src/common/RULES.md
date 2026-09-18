# RULES — Common Backend

Chỉ đặt thành phần thật sự dùng chung nhiều module.

Được phép:
- decorators
- guards dùng chung
- exception/filter
- response interceptor
- pagination types
- request context
- generic utilities không chứa business rule

Không được:
- business rule của Gate/Yard/Billing/Handover
- service nghiệp vụ "common"
- helper mơ hồ chỉ để tránh đặt đúng module
