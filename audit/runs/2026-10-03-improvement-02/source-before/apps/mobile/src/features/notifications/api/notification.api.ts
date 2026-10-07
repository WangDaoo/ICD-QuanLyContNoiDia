export type NotificationRecord = { id: string; type: string; title: string; body: string; deepLink?: string | null; readAt?: string | null; createdAt: string };
export type NotificationHistory = { data: NotificationRecord[]; meta: { total: number; totalPages: number; unreadCount: number } };
type Client = { get<T>(path: string): Promise<T>; patch<T>(path: string): Promise<T>; post<T>(path: string): Promise<T> };
export const NOTIFICATION_TYPES = [
  ['INVOICE_EMAIL', 'Hóa đơn'], ['GATE_OUT_COMPLETED', 'Đã ra cổng'], ['GATE_PASS_EXPIRING', 'Phiếu sắp hết hạn'],
  ['FREE_STORAGE_EXPIRING', 'Sắp hết miễn lưu bãi'], ['INSPECTION_HOLD', 'Giám định giữ hàng'], ['WORK_QUEUE_GATE_IN', 'Tiếp nhận cổng'],
] as const;
export function createNotificationApi(client: Client) {
  return {
    history: ({ page, type = '', unreadOnly = false }: { page: number; type?: string; unreadOnly?: boolean }) => client.get<NotificationHistory>(`/notifications/history?page=${page}&pageSize=20${type ? '&type=' + encodeURIComponent(type) : ''}${unreadOnly ? '&unreadOnly=true' : ''}`),
    read: (id: string) => client.patch('/notifications/' + encodeURIComponent(id) + '/read'),
    readAll: () => client.post('/notifications/read-all'),
  };
}
