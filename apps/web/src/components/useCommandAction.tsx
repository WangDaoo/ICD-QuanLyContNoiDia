import React, { useRef, useState } from 'react';
import type { CommandResult } from '../services/api/operation';

export function useCommandAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<CommandResult | null>(null);
  const run = async <T,>(write: () => Promise<CommandResult<T>>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    try {
      const result = await write();
      setNotice(result);
      return result;
    } catch (error) {
      const result: CommandResult<T> = {
        success: false,
        message: `${error instanceof Error ? error.message : 'Mất kết nối.'} Chưa xác định kết quả lưu. Kiểm tra dữ liệu trước khi gửi lại.`,
      };
      setNotice(result);
      return result;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return { pending, notice, run, isPending: () => inFlight.current, clear: () => setNotice(null) };
}

export function CommandNotice({ notice }: { notice: CommandResult | null }) {
  if (!notice) return null;
  return (
    <p
      role={notice.success ? 'status' : 'alert'}
      className={`rounded-lg border p-3 text-sm ${notice.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
    >
      {notice.message}
    </p>
  );
}
