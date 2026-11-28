/**
 * ResponseInterceptor bọc mọi phản hồi thành công trong `{ data, meta? }`.
 * Hàm này lấy phần `data` để bài kiểm thử đọc đúng nội dung; nếu phản hồi
 * không có khóa `data` (ví dụ tệp nhị phân) thì trả nguyên body.
 */
export function unwrapData<T>(body: unknown): T {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * Endpoint danh sách trả `{ data: T[], meta }` ở cấp ngoài cùng (ResponseInterceptor
 * giữ nguyên vì body đã có khóa `data`). Hàm này trả đúng cặp `data` + `meta` đó.
 */
export function unwrapList<T, M = { total: number }>(body: unknown): { data: T[]; meta: M } {
  const outer = body as { data?: unknown; meta?: M };
  if (Array.isArray(outer?.data)) {
    return outer as { data: T[]; meta: M };
  }
  return unwrapData<{ data: T[]; meta: M }>(body);
}
