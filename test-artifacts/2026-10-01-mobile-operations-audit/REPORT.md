# Báo cáo kiểm tra nghiệp vụ Mobile ICD

Ngày kiểm tra: **02/10/2026**, giờ Việt Nam. Phạm vi: tác nghiệp nhân viên trên **Expo Web**, API thật và hồ sơ QA riêng. Thư mục giữ tên phiên `2026-10-01-mobile-operations-audit`.

[Bộ ảnh theo nhóm nghiệp vụ](gallery.html) chứa **100 ảnh JPG**, có tìm kiếm, bộ lọc và liên kết mở ảnh gốc. Bộ ảnh bao gồm các luồng cổng, bãi, giám định, booking, hàng đợi, thông báo, Operator, popup và năm tab sáng/tối cuối. Ảnh có `before` trong tên giữ bằng chứng trước sửa. Ảnh 80 giữ nhãn phiên trước sửa cuối nhưng bố cục Monitor còn hợp lệ; ảnh 89–98 dùng nhãn cuối **ĐÃ ĐĂNG NHẬP**.

## Nguồn giao diện và phạm vi

Mẫu được chọn là [MobileTerminalView.tsx trong dựng (2)](<../../../dựng (2)/src/components/MobileTerminalView.tsx>), gồm năm tab Cổng, Bãi, Giám định, Tra cứu, Việc ca và hai theme sáng/tối; Operator có bộ tab theo vai trò. Ứng dụng chạy thật là Expo React Native/TypeScript tại `apps/mobile`, với [App.tsx](../../apps/mobile/App.tsx), [MainTabNavigator.tsx](../../apps/mobile/src/navigation/MainTabNavigator.tsx) và các màn TSX trong `apps/mobile/src/features`. Mẫu tham chiếu không thay cho API tác nghiệp. `apps/web` là ứng dụng web riêng; ảnh 99 chỉ bổ sung dashboard đọc dữ liệu backend, không xác nhận đã audit toàn bộ web.

## Kết quả xác nhận

| Hạng mục | Kết quả | Bằng chứng / phạm vi |
|---|---|---|
| Backend regression trong phạm vi sửa | **16/16 bộ, 78/78 bài đạt** | [Aggregate cuối](api-regression-final.json), exit 0; đã gồm 7 bài payment, không cộng các lượt trùng |
| API TypeScript / lint billing thay đổi | **Đạt** | Typecheck API và targeted lint exit 0 trong aggregate cuối |
| Mobile regression | **50/50 bài đạt** | [Xác minh mobile cuối](mobile-verification-final.json): suite đầy đủ đã chạy sau reset Gate-out và keyed state xếp bãi; không chạy lại sau hai sửa chữ cuối |
| Mobile TypeScript / lint TypeScript đầy đủ | **Đạt sau sửa chữ cuối** | Typecheck, lint `App.tsx` và toàn bộ `src/**/*.{ts,tsx}` exit 0; các test CJS được ghi trong artifact |
| Expo Web export cuối / diff check | **Đạt sau sửa chữ cuối** | Main bundle `f623b1e749aff82a7b2aef74e64072eb`; export và diff check exit 0 |
| Durable state sau restart | **57 invariants đạt qua 45 API checks** | [Verify durable cuối](fixture-verify-durable-result.json): bốn visit, ba truck, state/slot/operation/pass/history đúng hồ sơ |
| Runtime cuối | **Build/restart exit 0, readiness HTTP 200** | [Runtime sau restart](runtime-final.json), kiểm tra độc lập lúc 08:55:24; durable comparison dùng runtime này |
| Giao diện thực tế | **100 ảnh** | Expo Web tác nghiệp với API thật và dashboard web bổ sung; bộ cuối năm tab 390px: sáng 89–93, tối 94–98 |
| Gallery cục bộ | **JavaScript và đường dẫn được kiểm tra** | Preview trình duyệt ở cổng 5176 bị từ chối; máy chủ đã dừng. Không khẳng định đã kiểm thử bộ lọc gallery bằng UI |
| Android/iOS / camera vật lý | **Chưa kiểm thử** | Expo Web và export không xác nhận nghiệm thu thiết bị native |

Hai thay đổi chữ cuối là badge phiên **ĐÃ ĐĂNG NHẬP** và đơn vị Monitor **ô bãi** sau khi tổng hợp mọi trang slot. Kết quả 50 bài mobile là lượt suite trước hai sửa chữ này; typecheck, lint và export trong artifact là lượt sau sửa.

## Sửa lỗi và hoàn thiện tác nghiệp

- **Gate-in/Gate-out:** tiếp nhận nhiều container cùng xe `IN_PROGRESS`; container cuối hoàn tất chuyến xe. Nút tiếp theo ở cả hai luồng reset stack, bỏ form, token và kết quả cũ. Gate-out giữ kết quả command đã commit, kiểm tra lại phiếu/readiness và không báo command thất bại chỉ vì lần đọc sau commit lỗi.
- **Ngữ cảnh màn hình:** operation detail key theo loại/ID; yard assignment key theo visit. Đổi hồ sơ không giữ nhầm record, kết quả hoặc vị trí của container trước. Yard Operations bỏ response cũ khi đổi loại/rời màn. Container Detail có loading ban đầu, từng section tải độc lập và Gate-in context đúng hồ sơ. YardHome có lối mở nhanh tác nghiệp.
- **Bãi và giám định:** manual slot check trả lý do từ chối; recommendation/context token được giữ khi xác nhận. Có list/filter, booking và popup start/complete/cancel; lý do hủy bắt buộc; kiểm tra ngày lịch và số kiện/trọng lượng. Ghi chú inspection được giữ; FAIL/HOLD yêu cầu lý do.
- **Tính nhất quán backend:** movement, inspection và booking khóa visit thuộc đúng ICD rồi đọc lại sau khóa; transaction dùng `ReadCommitted` theo luồng. State và event cùng transaction; completion/HOLD không bị cancellation ghi đè, tạo tác nghiệp và cấp Gate Pass không vượt qua nhau.
- **Hàng đợi và Monitor:** có open booking, visit ID đúng cho movement/inspection/booking và điều hướng theo quyền. Gate-in dùng visit `AUTHORIZED`, chưa reception, xe `ARRIVED/IN_PROGRESS`. Nhãn và urgency được sửa. Monitor tổng hợp mọi trang: 48 ô bãi thực tế, không dùng tổng một trang.
- **Phiên và kết nối:** restore gặp lỗi mạng/503 giữ credential để retry; 401 xóa phiên. Lỗi mạng đăng nhập có nội dung tiếng Việt. Dialog/select theo theme, cuộn và xử lý bàn phím; command bị chặn khi đã biết offline.
- **Thông báo:** hook xe đến và inspection HOLD chạy sau commit; delivery lỗi không đảo ngược command. Recipient là nhân viên nội bộ cùng ICD theo role/quyền; dedupe có recipient ID. Popup, read, read-all và deep link dùng record thật.
- **Quyền và tài chính:** read Gate Pass dùng `container.read`; issue/cancel/QR và scan/Gate-out giữ CREATE/USE riêng. Readiness bỏ ID/số chứng từ và số tiền với người thiếu `billing.read/manage`, giữ flags, counts, trạng thái và blocker. Live fixture có financial rows đã chứng minh staff không lộ dữ liệu trong khi admin vẫn đọc được. External chưa có company binding nhận 403 cho container/queue; binding được bỏ qua theo yêu cầu.
- **Payment duplicate:** lỗi unique `payment_payment_ref_key` từng gây 500 nay được ánh xạ hẹp sang 409 `PAYMENT_REFERENCE_DUPLICATE`; các lỗi khác tiếp tục propagate. Regression có 4 bài đỏ trước sửa, 7/7 xanh sau sửa; không thay billing evaluator, allocation hoặc số tiền. [Probe API sau restart](fixture-verify-payment-duplicate-result.json) nhận 400 `PAYMENT_INVOICE_INVALID_STATE` trên invoice đã PAID, payment IDs và invoice amounts không đổi. Nhánh 409 được chứng minh bằng regression, chưa được chứng minh live vì state guard chạy trước unique constraint. [Rà soát payment](payment-duplicate-review.md) ghi nguyên nhân, phạm vi và giới hạn probe thực tế.

## Màn hình, popup và trạng thái đã kiểm chứng

“Ảnh UI” là giao diện đã mở trong trình duyệt. Kết quả API độc lập xác nhận state sau command. Regression cạnh tranh không thay cho stress test trên nhiều thiết bị thật.

| Luồng / route | Trạng thái và tương tác đã kiểm chứng | Bằng chứng | Chưa kiểm chứng / giới hạn |
|---|---|---|---|
| Login / Account / phiên | Invalid login; account/permission/logout popup; offline restore/retry; phiên restored; viewport 360px | 01, 03–06, 13–14, 58, 100; mobile regression | Reset/quên/đổi mật khẩu; mạng native |
| GateInScan / GateInForm / GateInSuccess | Container sai; xe đến; seal bắt buộc; tình trạng; review; hai container cùng xe; arrival deep link; reset next item | 02, 07–12, 15–16, 59, 69; [verify Gate-in](fixture-verify-gate-result.json) | Camera/barcode vật lý; mọi tổ hợp nhiều xe hợp lệ |
| ContainerSearch / ContainerDetail | Empty/results; gate-role detail; hold/readiness; loading và context đã sửa | 17–20, 84, 92, 95; regression | Handover populated/timeline và preview tài liệu |
| YardHome / YardAssignment | Occupied refusal; manual check/confirm/success; recommendation; theme tối và mở rộng; follow-up được xếp `A-02-01-1` | 22–25, 33–35, 74–77; [verify tại thời điểm xếp bãi](fixture-verify-followup-result.json) | Mọi tổ hợp reefer/weight/block bị khóa; nhiều client thật |
| YardOperationDetail — movement | Create/PENDING; cancel thiếu lý do; start/IN_PROGRESS; complete/COMPLETED; hủy thành công với lý do lưu | 26–32, 87–88; serialization regression | Stress concurrency trên thiết bị thật |
| SurveyHome / inspection | Validation/type/create; pending; HOLD thiếu lý do; PASS và notes; CUSTOMS COMPLETED/HOLD có lý do | 36–43, 78–79; [verify HOLD](fixture-verify-hold-notifications-result.json) | Commit FAIL thật; API release inspection HOLD chưa có |
| YardOperations / booking | List; type/status filter; ngày sai; service; create; mở từ queue; số âm; completion/result; cancel thành công | 44–57; regression | 50 giữ nhãn queue trước sửa |
| WorkQueue | Booking routing; visit AUTHORIZED; priority empty; queue yard tối; routing theo quyền | 50–51, 70–73, 93–94; backend/mobile queue regression | Chưa chụp mọi lỗi/SLA |
| GatePassScan / GateOutConfirm | 360px; QR invalid; readiness; review; EXITED; USED refusal; follow-up EXITED và quét phiếu tiếp theo xóa QR/results | 60–65, 85–86; backend/mobile regression | Camera và giữ 2 giây native; ảnh mọi pass expired/cancelled |
| Notifications | Empty/filter; arrival/Gate-out record; popup; mark read/read-all; Gate-in deep link; Operator HOLD popup/read-only deep link | 21, 66–69, 72, 81–83; [verify thông báo](fixture-notifications-read-result.json) | Push/email delivery trên thiết bị |
| Monitor / Operator | Monitor 390px tổng 48 ô; nhận HOLD; popup; inspection đúng ID chỉ đọc; readiness có INSPECTION_HOLD + OPERATIONAL_HOLD | 80–84; [verify HOLD recipients](fixture-verify-hold-notifications-result.json) | 80 giữ nhãn phiên trước sửa chữ cuối; không đại diện badge cuối |
| Permission / external scope | Staff đọc readiness và cùng blockers với admin; không lộ financial rows, không đọc invoice; Agent/Consignee auth/me 200, containers/queue 403 | [verify quyền](fixture-verify-permissions-result.json); guard/controller regression | Company binding/scoped external lookup ngoài phạm vi |
| Shared dialog / SelectField / connection | Close; dropdown; validation; create/start/complete/cancel confirm; sáng/tối; known-offline | 04–05, 08, 10–11, 13, 22–24, 29, 31, 34–35, 38–39, 42, 45–49, 53, 56, 63, 67, 76, 78, 82, 87 | Screen reader và mọi bàn phím/native device |
| Năm tab theo mẫu duyệt | Cổng, Bãi, Giám định, Tra cứu, Việc ca; tất cả sáng/tối, 390px; badge phiên cuối | 89–98 | Không suy ra native từ viewport trình duyệt |
| Web dashboard bổ sung | API thật: 1 HOLD, 12/48 ô có container, 0 việc trong queue tại thời điểm chụp | 99 | Không phải audit toàn bộ `apps/web` |

## Kết quả trên hồ sơ QA

Run `OPS-QA-1790901500518` dùng bốn container `QAOU5007550`, `QAOU5007565`, `QAOU5007570` và follow-up `QAOU1882075`. Không dùng kết quả mô phỏng thay command.

| Hồ sơ | Kết quả đã xác nhận | Bằng chứng |
|---|---|---|
| Xe `51C-QA0755` | Giữa hai Gate-in: `IN_PROGRESS`. Container cuối: xe `COMPLETED`, cả hai visit đã vào bãi với reception cùng truck | [Lần đọc giữa](fixture-read-result.json), [verify Gate-in](fixture-verify-gate-result.json), ảnh 12 và 16 |
| `QAOU5007550` | Visit cuối `EXITED`, slot null, Gate Pass `USED`; movement `COMPLETED`, DAMAGE_SURVEY `PASS`, booking `COMPLETED` đã lưu trước exit; quét lại bị từ chối | [Durable cuối](fixture-verify-durable-result.json), 26–32, 36–43, 54–55, 64–65 |
| `QAOU1882075` | Đã xếp `A-02-01-1`, arrival được đánh dấu đọc và deep link đúng visit. Sau đó state cuối `EXITED`, slot null / pass `USED`; next-pass bỏ QR/results cũ | [Durable cuối](fixture-verify-durable-result.json), [API tại thời điểm xếp bãi](fixture-verify-followup-result.json), 74–77, 85–86 |
| `QAOU5007565` | State cuối `IN_YARD`, `A-01-03-2`; movement `CANCELLED` đúng lý do, giữ slot nguồn; đích `A-02-01-2` AVAILABLE/null; booking `CANCELLED` | [Durable cuối](fixture-verify-durable-result.json), 56–57, 87–88 |
| `QAOU5007570` | CUSTOMS inspection `cd79419f-3f37-49b3-9e49-b0b53a445b86` là `COMPLETED/HOLD`; cuối `IN_YARD`, `A-01-01-2`, CUSTOMS operational hold `ACTIVE`; readiness false, cả hai blocker HOLD | [Durable cuối](fixture-verify-durable-result.json), [Verify HOLD](fixture-verify-hold-notifications-result.json), 78–84 |
| Readiness có financial rows | Gate/yard đọc được readiness, không lộ financial fields; blockers khớp admin; admin còn financial detail; external 403 | [Verify quyền](fixture-verify-permissions-result.json), regression redaction |

[Durable cuối](fixture-verify-durable-result.json) xác nhận không còn operation pending/in-progress trên cả bốn visit, ba truck đều `COMPLETED`, event history gắn đúng record. Ảnh 100 xác nhận phiên Admin đã kết nối lại backend sau restart lúc 08:54:51. [Hồ sơ QA](operational-fixtures.json) giữ IDs và observation. Tệp request fixture hoặc popup review riêng lẻ không được coi là chứng cứ state đã commit. Kết quả Gate-in/xếp bãi ở thời điểm trước không được coi là state cuối sau Gate-out. [Notifications cuối](fixture-notifications-read-result.json) xác nhận arrival và Gate-out đầu đã đọc, Operator HOLD đã đọc, Docs HOLD chưa đọc; Gate-out follow-up mới phát sinh vẫn chưa đọc. Read-all trong ảnh 72 thuộc thời điểm trước thông báo follow-up mới.

## Giới hạn còn lại

- **Native:** chưa nghiệm thu Android/iOS thật, camera/barcode, quyền camera, giữ 2 giây và khả năng tiếp cận trên thiết bị.
- **Attachment:** backend chưa có API đầy đủ để lưu ảnh seal/vỏ/exit hoặc biên bản inspection; không thêm thành công giả.
- **Inspection HOLD release:** chưa có endpoint release; HOLD thực vẫn chặn Gate Pass và chưa có luồng mobile giải phóng.
- **External binding:** bỏ qua theo yêu cầu; đã chứng minh fail-closed 403, chưa triển khai/kiểm chứng company-scoped lookup của Agent/Consignee.
- **Notification delivery:** record/deep link/read đã được kiểm chứng; chưa kiểm thử push/email trên thiết bị hoặc đảm bảo phát lại khi process chết. Hook sau commit là best effort. [Rà soát hook ban đầu](notification-hooks-review.md) giữ lịch sử phát hiện; gap nối hook/dedupe đã được sửa.

Gallery là tài liệu cục bộ cùng 100 ảnh gốc. Quyền preview trình duyệt gallery bị từ chối và máy chủ đã dừng; chỉ xác nhận cú pháp JavaScript và liên kết tệp, không tuyên bố đã kiểm thử trực quan bộ lọc. UI app Expo Web dùng trong bộ ảnh đã được kiểm tra thực tế. Các trạng thái chưa chạy được ghi rõ theo route ở bảng trên.


