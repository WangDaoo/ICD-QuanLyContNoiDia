# Yard Map Color Design Spec

## Mục Tiêu

Chuẩn hóa khu vực `Sơ đồ Bãi` tab `MAP` theo phong cách TOS/Yard Management chuyên nghiệp như Navis N4, CyberLogitec OPUS: ít trang trí, đọc trạng thái nhanh, màu sắc phục vụ vận hành.

## Hướng Thiết Kế Chốt

Sử dụng hướng **Industrial Light + Status Color**.

- Nền sáng, trung tính, phù hợp màn vận hành cả ngày.
- Màu mạnh chỉ dùng cho trạng thái container, slot, cảnh báo và command chính.
- Không dùng gradient, bokeh, nền tím/xanh đậm một màu, hoặc hiệu ứng marketing.
- Không tô block bằng màu mạnh; block giữ trung tính, slot/container mang tín hiệu.

## Tỉ Lệ Màu Toàn Trang

- 70% nền và khung UI: `#F3F6F8`, `#E5EAF0`, `#CBD5E1`
- 15% line/grid/map: `#94A3B8`, `#64748B`
- 10% màu trạng thái slot/container
- 5% màu cảnh báo và command chính

## Palette MAP

| Thành phần | Màu |
|---|---|
| Nền bãi | `#EEF2F6` |
| Block yard | `#DCE3EA` |
| Đường nội bộ | `#FFFFFF` |
| Viền block | `#94A3B8` |
| Text block lớn | `#334155` |
| Slot trống | `#F8FAFC` |
| Slot có container | `#2563EB` |
| Slot đã reserve | `#F59E0B` |
| Slot khóa/không dùng | `#64748B` |
| Slot reefer | `#06B6D4` |
| Slot overweight/danger | `#DC2626` |
| Slot đang thao tác | `#7C3AED` |

## Màu Container Theo Trạng Thái

| Trạng thái | Màu |
|---|---|
| `PRE_ADVISED` | `#94A3B8` |
| `GATED_IN` | `#2563EB` |
| `IN_YARD` | `#16A34A` |
| `ON_HOLD` | `#DC2626` |
| `READY_FOR_GATE_OUT` | `#0D9488` |
| `GATE_PASS_ISSUED` | `#7C3AED` |
| `GATED_OUT` | `#475569` |
| `CANCELLED` | `#9CA3AF` |

## Overlay Nghiệp Vụ

| Overlay | Màu |
|---|---|
| Customs hold | `#DC2626` |
| Billing hold | `#F97316` |
| Damage/inspection | `#EAB308` |
| Handover pending | `#7C3AED` |
| Yard recommendation | viền `#22C55E` |
| Đường di chuyển xe nâng/RTG | nét đứt `#2563EB` |

## Toolbar MAP

| Thành phần | Màu |
|---|---|
| Toolbar background | `#FFFFFF` |
| Button thường | nền `#F8FAFC`, border `#CBD5E1` |
| Button active | nền `#1E293B`, text `#FFFFFF` |
| Action chính `Assign slot` | `#2563EB` |
| Action nguy hiểm `Lock/Cancel` | `#DC2626` |

## Interaction Rules

- Hover slot: nền `#DBEAFE`, không đổi kích thước.
- Selected slot: viền `#111827`, shadow nhẹ, không đổi layout.
- Recommendation slot: dùng viền xanh lá, không tô kín.
- Cảnh báo: ưu tiên badge/icon/viền; chỉ tô nền đỏ khi lỗi nghiêm trọng.
- Legend đặt bên phải hoặc dưới toolbar, luôn nhìn thấy trong tab `MAP`.
- Text trong slot phải ngắn, không tràn: container number, size/type, hold badge.

## Tiêu Chí Đạt

- MAP nhìn như màn vận hành TOS, không giống landing page.
- Người dùng nhìn trong 3 giây biết: slot trống, có container, hold, reserved, reefer, dangerous, selected.
- UI không lộ màu trang trí dư thừa.
- Palette không lệch khỏi phong cách hiện tại của app.

