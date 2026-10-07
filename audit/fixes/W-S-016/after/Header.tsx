import React, { useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, LogOut, Menu, RefreshCw, UserCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { areSafetyReadsReady } from '../services/visit-safety-data';

interface HeaderProps { currentTab: string; onMenuClick: () => void; }

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, containerVisits, holds, visitSafetyStatus = {}, notifications, markNotificationRead, markAllNotificationsRead, logout, isLoading, apiReady, refreshData } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const activeHoldCount = holds.filter((hold) => hold.status === 'ACTIVE').length;
  const holdsIncomplete = !areSafetyReadsReady(containerVisits.map(v => v.id), visitSafetyStatus, 'holds');

  const handleLogout = async () => {
    setIsSigningOut(true);
    try { await logout(); } finally { setIsSigningOut(false); }
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between gap-3 z-40">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Mở menu điều hướng" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"><Menu className="h-5 w-5" /></button>
        <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">ICD</div>
        <div className="min-w-0"><h1 className="truncate text-sm sm:text-base font-bold tracking-tight text-slate-800">ICD Management System</h1><p className="hidden sm:block text-xs text-slate-500">Cảng cạn & kho bãi container nội địa</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden xl:flex items-center gap-2 text-xs">
          {(holdsIncomplete || activeHoldCount > 0) && <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />{holdsIncomplete ? 'Holds chưa kiểm tra đủ' : `${activeHoldCount} lệnh giữ`}</span>}
          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${apiReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><CheckCircle2 className="h-3.5 w-3.5" />{apiReady ? 'Đã kết nối' : 'Chưa kết nối'}</span>
        </div>
        <button type="button" onClick={() => void refreshData()} disabled={isLoading} aria-label="Tải lại dữ liệu" title="Tải lại dữ liệu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
        <div className="relative">
          <button type="button" onClick={() => setShowNotifs((show) => !show)} aria-label={`Thông báo (${unreadCount} chưa đọc)`} aria-expanded={showNotifs} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />}</button>
          {showNotifs && <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-xl text-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="font-bold text-slate-800">Thông báo</span>{unreadCount > 0 && <button type="button" onClick={async () => { const result = await markAllNotificationsRead(); if (result && !result.success) alert(result.message); }} className="font-semibold text-blue-600">Đọc tất cả</button>}</div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">{notifications.length === 0 && <p className="p-5 text-center text-slate-400">Không có thông báo.</p>}{notifications.map((notification) => <button type="button" key={notification.id} onClick={async () => { const result = await markNotificationRead(notification.id); if (result && !result.success) alert(result.message); }} className={`block w-full text-left px-4 py-3 hover:bg-slate-50 ${!notification.read ? 'bg-blue-50/40' : ''}`}><span className="block font-bold text-slate-800">{notification.title}</span><span className="block mt-1 text-slate-500">{notification.body}</span><span className="block mt-1 text-slate-400">{new Date(notification.createdAt).toLocaleString('vi-VN')}</span></button>)}</div>
          </div>}
        </div>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3"><UserCircle className="h-7 w-7 text-slate-400 hidden sm:block" /><div className="hidden lg:block text-right"><div className="text-xs font-semibold text-slate-800">{currentUser.name}</div><div className="text-[10px] text-slate-500">{currentUser.role}</div></div><button type="button" onClick={() => void handleLogout()} disabled={isSigningOut} aria-label="Đăng xuất" title="Đăng xuất" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><LogOut className="h-4 w-4" /></button></div>
      </div>
    </header>
  );
};
