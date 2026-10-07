import React from 'react';
import { useApp } from '../context/AppContext';
import { hasWebPermission } from '../services/permissions';

export function ReadOnlyNotice({ writePermissions }: { writePermissions: string[] }) {
  const { currentUser } = useApp();
  if (writePermissions.some(permission => hasWebPermission(currentUser, permission))) return null;
  return <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
    Chế độ chỉ đọc. Tài khoản hiện tại có thể xem dữ liệu và sử dụng bộ lọc; các thao tác cập nhật cần quyền tương ứng.
  </p>;
}
