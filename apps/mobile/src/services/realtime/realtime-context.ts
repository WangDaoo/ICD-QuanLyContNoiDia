import { createContext, useContext } from 'react';

import type { RealtimeChangeMessage } from './realtime-change';
import type { RealtimeStatus } from './realtime-stream';

export type RealtimeListener = (change: RealtimeChangeMessage) => void;

export interface RealtimeContextValue {
  status: RealtimeStatus;
  /** Nhận sự kiện thay đổi (đã bỏ sự kiện do chính thiết bị này tạo). Trả về hàm hủy. */
  subscribe(listener: RealtimeListener): () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** Trạng thái kênh cập nhật trực tiếp; `offline` khi chưa đăng nhập hoặc ứng dụng chạy nền. */
export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeContext)?.status ?? 'offline';
}
