import React from 'react';
import { useApp } from '../context/AppContext';

export function ConfirmedResourceValue({
  resource,
  children,
  unavailable = 'Chưa xác nhận số lượng',
}: {
  resource: string | string[];
  children: React.ReactNode;
  unavailable?: React.ReactNode;
}) {
  const { resourceStatus = {}, isLoading } = useApp();
  const resources = Array.isArray(resource) ? resource : [resource];
  const states = resources.map((key) => resourceStatus[key] ?? (isLoading ? 'loading' : 'ready'));
  const confirmed = states.every((state) => state === 'ready' || state === 'stale');
  return <>{confirmed ? <>{children}{states.includes('stale') && ' (dữ liệu đã tải)'}</> : unavailable}</>;
}

export function ResourceContent({ resource, count, children }: { resource: string; count: number; children: React.ReactNode }) {
  const { resourceStatus = {}, isLoading } = useApp();
  const state = resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready');
  return <>
    <CollectionState resource={resource} count={count} />
    {(state === 'ready' || state === 'stale') && children}
  </>;
}

export function CollectionState({
  resource,
  count,
  total = count,
  filtered = false,
  onClear,
}: {
  resource: string;
  count: number;
  total?: number;
  filtered?: boolean;
  onClear?: () => void;
}) {
  const { resourceStatus = {}, isLoading, refreshData } = useApp();
  const state = resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready');
  if (state === 'ready' && count > 0) return null;
  const text =
    state === 'loading'
      ? 'Đang tải dữ liệu…'
      : state === 'forbidden'
        ? 'Bạn không có quyền xem dữ liệu này.'
        : state === 'error'
          ? 'Không thể tải dữ liệu. Chưa xác nhận danh sách hiện tại.'
          : state === 'stale'
            ? 'Chưa tải lại được dữ liệu. Danh sách đã tải trước chỉ để tham khảo.'
            : filtered && total > 0
              ? 'Không có kết quả khớp bộ lọc.'
              : 'Chưa có dữ liệu trong danh sách này.';
  return (
    <div
      role={state === 'error' || state === 'forbidden' ? 'alert' : 'status'}
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
    >
      <p>{text}</p>
      {(state === 'error' || state === 'stale') && (
        <button
          type="button"
          onClick={() => void refreshData()}
          className="mt-2 font-semibold text-blue-700 underline"
        >
          Tải lại dữ liệu
        </button>
      )}
      {state === 'ready' && filtered && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 font-semibold text-blue-700 underline"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}

export function DetailAvailability({
  resource,
  id,
}: {
  resource: 'manifests' | 'roles' | 'handovers';
  id: string;
}) {
  const { detailStatus, refreshData } = useApp();
  const state = detailStatus?.[resource]?.[id];
  if (!state || state === 'ready') return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p>
        {state === 'forbidden'
          ? 'Bạn không có quyền xem chi tiết này.'
          : state === 'loading'
            ? 'Đang tải chi tiết…'
            : 'Chi tiết chưa tải đầy đủ. Chưa xác nhận dữ liệu liên quan.'}
      </p>
      {state !== 'forbidden' && (
        <button
          type="button"
          onClick={() => void refreshData()}
          className="mt-2 underline font-semibold"
        >
          Tải lại chi tiết
        </button>
      )}
    </div>
  );
}
