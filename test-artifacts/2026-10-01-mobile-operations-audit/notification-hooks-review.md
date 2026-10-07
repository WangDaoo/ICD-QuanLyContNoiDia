# Rà soát hook thông báo nghiệp vụ

Ngày kiểm tra: 02/10/2026. Phần điều tra bên dưới ghi trạng thái trước sửa. Sau khi xác nhận nguyên nhân, đã nối hai hook theo nghiệp vụ; không thêm notification giả, không sửa tài khoản/quyền, không ghi fixture Prisma trực tiếp.

## Kết quả sửa và kiểm chứng mã

- Xe GATE_IN đến cổng commit thành công: lọc lại container AUTHORIZED chưa reception của chuyến xe; phát task tới GATE_STAFF active cùng ICD có gate_in.create hiệu lực.
- Giám định commit kết quả HOLD: phát tới OPERATOR active cùng ICD có yard.read hiệu lực. Dedupe bao gồm inspectionId và recipientId.
- Bộ lọc quyền theo hợp của các role active, đồng bộ với AuthService; quyền không bắt buộc nằm trong chính role được dùng chọn nhóm nhận.
- Thông báo task/HOLD dùng tiếng Việt. Detail giám định từ thông báo cho phép yard.read hoặc yard.inspect; quyền thao tác vẫn do màn detail và backend kiểm soát.
- Cả hai hook chạy sau commit và catch/log lỗi riêng; failure không đổi command đã thành công. Không thêm public API, channel hoặc lời gọi network gửi trực tiếp.
- TDD: test RED bắt việc không phát hook, không log lỗi và dedupe làm mất người nhận thứ hai; sau sửa 24/24 test backend tập trung, 44/44 test mobile, hai typecheck và lint file liên quan đạt. Cần restart API rồi thực hiện business QA để xác minh runtime mới.
- Sau restart API PID35684: arrival xe 51C-FQA2075 / container QAOU1882075 tạo notification WORK_QUEUE_GATE_IN thật cho gate@icd.local; deep link và containerVisitId của task queue khớp f6482365-ae79-4ae3-9dec-efecd8f04947. Notification Gate-out của QAOU5007550 cũng đã persisted cho gate@icd.local. Inspection HOLD mới được chuẩn bị PENDING cho mobile thao tác. Regression cuối đạt 15 suite / 71 test trong một run; không cộng số các run trước vì trùng nhau.

## Dữ liệu thực tế

`notifications-read` xác nhận `gate@icd.local` và `yard@icd.local` có total=0, unreadCount=0 trước kiểm thử Gate-out. API không có command tạo thông báo admin/internal. Các command hiện có chỉ đăng ký thiết bị, bỏ thiết bị, đánh dấu một thông báo và đánh dấu tất cả.

Notification record là dữ liệu cho trung tâm thông báo. Schema không có channel IN_APP: `NotificationChannel` chỉ dành cho các bản delivery EMAIL/PUSH. `emitNotification` luôn tạo record; nếu có recipientEmail sẽ thêm EMAIL delivery; nếu có recipientUserId sẽ thêm PUSH delivery cho mọi thiết bị active của user. Vì vậy không thể coi gọi helper với userId là bảo đảm chỉ nội bộ khi tài khoản đã có device active.

## Gate-in task

Helper `triggerGateInWorkQueueNotification` tồn tại nhưng không được nghiệp vụ gọi. Tên tham số `operatorUserId` dễ gây nhầm; đặc tả mobile mục 3.9 chỉ định người nhận task GATE_IN là GATE_STAFF.

Điểm phát đúng là sau `TruckVisitService.arrive` commit một chuyến GATE_IN với container AUTHORIZED, chưa reception. Lúc này nhân viên có thể mở `/tasks/gate-in/:visitId` và nhận container. Phát sau `GateInService.gateIn` sẽ quá muộn: container đã IN_YARD, form tiếp nhận đã hoàn tất.

Chưa có assignment user/ca cho task trong schema. Nếu bổ sung, cần chọn user nội bộ active cùng ICD, role active GATE_STAFF và quyền gate.in.create hợp lệ; không gán theo một seed email. Dedupe hiện tại `WORK_QUEUE_GATE_IN:<visitId>:<recipientId>` phù hợp gửi một record cho từng nhân viên. Chỉ truyền userId, không truyền email. Không đặt recommendation slot nếu nghiệp vụ chưa có kết quả hợp lệ.

Lỗi độc lập được phát hiện: `WorkQueueService.buildGateInTasks` chỉ đọc truck ARRIVED và container PENDING, trong khi nhận cổng thật cần AUTHORIZED và xe có thể IN_PROGRESS sau container đầu. Cần đồng bộ projection với GateInContext trước khi nối thông báo task.

## Inspection HOLD

Helper `triggerInspectionHoldNotification` tồn tại nhưng `ContainerInspectionService.completeInspection` không gọi nó. Đặc tả mobile chỉ định người nhận OPERATOR; helper hiện nhận `inspectorUserId`, nên nối đơn giản với `actor.id` sẽ gửi cho người giám định, chưa đúng yêu cầu.

Điểm phát đúng là sau transaction completeInspection commit và kết quả HOLD. PASS/FAIL/cancel và transaction rollback không được phát. Người nhận cần là OPERATOR active cùng ICD có quyền đọc chi tiết yard. Schema chưa có một operator được giao container cụ thể, nên cần chính sách nhóm nhận rõ ràng. Dedupe hiện tại `INSPECTION_HOLD:<inspectionId>` thiếu recipientId: nếu gửi nhiều operator, chỉ người đầu tiên có record. Phải thêm userId vào dedupe cho việc gửi theo từng người nhận.

Deep link `/inspections/:inspectionId` hiện có màn detail mobile nhưng bộ kiểm tra mở route yêu cầu yard.inspect. Người nhận OPERATOR có yard.read để xem mà thiếu yard.inspect sẽ bị UI chặn; không nên cấp quyền thao tác chỉ để mở thông báo.

## Phạm vi sửa nhỏ có thể thực hiện

Import `NotificationsModule` vào module sở hữu action, inject service điều phối notification, lấy kết quả transaction rồi gọi helper sau commit với catch/log riêng. `NotificationsModule` không phụ thuộc Gate/Yard nên không tạo vòng module. Không gọi helper hiện tại bên trong transaction: helper dùng Prisma riêng, không nhận TransactionClient và có thể đọc chưa thấy commit hoặc tạo notification dù action rollback.

Cách sau commit giữ command đã thành công khi tạo/delivery thông báo lỗi, giống Gate-out hiện tại. Tuy nhiên đây là best effort: process chết giữa commit và emit có thể mất thông báo. Muốn bảo đảm phát lại cần outbox/reconciler riêng; đó là phần lớn hơn hook nhỏ và push vẫn là roadmap trong contract MVP v1.7.

Gate-out hiện nối helper sau commit tới actor thực hiện Gate-out, không truyền consigneeEmail. Nó sẽ tạo record thực cho gate@icd.local khi account này thực hiện QA exit. Kịch bản này đủ kiểm tra popup/read/deeplink mà không tạo fixture thông báo giả.
