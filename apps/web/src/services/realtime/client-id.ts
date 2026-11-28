/**
 * Mã định danh của tab trình duyệt này, gửi kèm mọi request qua header `X-Client-Id`.
 *
 * Server ghi lại mã này vào sự kiện realtime (`origin`) để tab tự bỏ qua thay đổi
 * do chính mình tạo ra (tab đó đã tải lại ngay sau thao tác). Mã chỉ sống trong
 * bộ nhớ: tải lại trang hoặc nhân bản tab đều nhận mã mới.
 */
function createClientId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return `web-${cryptoApi.randomUUID()}`;
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const REALTIME_CLIENT_ID = createClientId();
