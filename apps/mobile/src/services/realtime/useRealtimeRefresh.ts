import { useCallback, useContext, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { RealtimeContext } from './realtime-context';
import { changeMatchesTopics, type RealtimeChangeMessage, type RealtimeTopic } from './realtime-change';
import { createRefreshCoalescer } from './refresh-coalescer';

export interface RealtimeRefreshOptions {
  /** Nhóm dữ liệu màn hình đang hiển thị; bỏ trống để nhận mọi thay đổi. */
  topics?: readonly RealtimeTopic[];
  /** Trả `false` để bỏ qua sự kiện, ví dụ khi người dùng đang thao tác dở trên biểu mẫu. */
  accept?: (change: RealtimeChangeMessage) => boolean;
}

/**
 * Tải lại màn hình khi admin hoặc nhân viên khác thay đổi dữ liệu liên quan.
 *
 * Chỉ hoạt động khi màn hình đang được hiển thị (focus); khi quay lại màn hình,
 * `useFocusEffect` của màn hình đã tự tải lại nên không cần nhớ sự kiện lúc ẩn.
 * `refresh` nên là bản tải "êm": giữ dữ liệu đang hiển thị, không bật vòng xoay.
 */
export function useRealtimeRefresh(refresh: () => unknown, options: RealtimeRefreshOptions = {}): void {
  const subscribe = useContext(RealtimeContext)?.subscribe;
  const latest = useRef({ refresh, options });
  useEffect(() => {
    latest.current = { refresh, options };
  });

  useFocusEffect(
    useCallback(() => {
      if (typeof subscribe !== 'function') return undefined;
      const coalescer = createRefreshCoalescer({ run: () => latest.current.refresh() });
      const unsubscribe = subscribe((change) => {
        const { topics, accept } = latest.current.options;
        if (!changeMatchesTopics(change, topics)) return;
        if (accept && !accept(change)) return;
        coalescer.push();
      });
      return () => {
        unsubscribe();
        coalescer.dispose();
      };
    }, [subscribe]),
  );
}
