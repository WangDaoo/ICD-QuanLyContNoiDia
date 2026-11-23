import React from 'react';
import { canAccessWebTab } from '../services/permissions';
import { useApp } from '../context/AppContext';
import { businessLabel } from '../lib/business-labels';
import {
  LayoutDashboard,
  ListTodo,
  FileText,
  Boxes,
  Truck,
  LogIn,
  Warehouse,
  Receipt,
  QrCode,
  Radio,
  TruckIcon,
  KeyRound,
  FileCode,
  BarChart3,
  History,
  Route,
  Database,
  Users,
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'work-queue'
  | 'manifests'
  | 'containers'
  | 'movement-orders'
  | 'truck-visits'
  | 'gate-in'
  | 'yard'
  | 'billing'
  | 'gate-pass'
  | 'edi'
  | 'handovers'
  | 'partner-clients'
  | 'partner-api-logs'
  | 'master-data'
  | 'users-roles'
  | 'admin'
  | 'activity';

interface SidebarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false }) => {
  const { currentUser, workQueue, handovers, roles } = useApp();
  const roleName = roles.find((role) => role.code === currentUser.role)?.name || businessLabel('role', currentUser.role);

  const workQueueCount = workQueue.length;
  const pendingHandoverReviewCount = handovers.filter((h) => h.status === 'PARTNER_CONFIRMED').length;

  // Grouped in the order a container moves through the ICD (spec end-to-end flow).
  const navItems = [
    {
      group: 'Việc hôm nay',
      items: [
        { id: 'dashboard', label: 'Tổng quan vận hành', icon: LayoutDashboard },
        {
          id: 'work-queue',
          label: 'Việc cần xử lý',
          icon: ListTodo,
          badge: workQueueCount > 0 ? workQueueCount : undefined,
          badgeColor: 'bg-rose-700 text-white',
        },
      ],
    },
    {
      group: '1. Hồ sơ hàng đến',
      items: [
        { id: 'manifests', label: 'Bản lược khai (Manifest)', icon: FileText },
        { id: 'containers', label: 'Hồ sơ container', icon: Boxes },
        { id: 'movement-orders', label: 'Lệnh cho phép vào cổng', icon: Route },
      ],
    },
    {
      group: '2. Cổng vào & Bãi',
      items: [
        { id: 'truck-visits', label: 'Lịch xe ra/vào', icon: Truck },
        { id: 'gate-in', label: 'Tiếp nhận vào cổng', icon: LogIn },
        { id: 'yard', label: 'Vận hành bãi', icon: Warehouse },
      ],
    },
    {
      group: '3. Thu phí & Ra cổng',
      items: [
        { id: 'billing', label: 'Dịch vụ & Thanh toán', icon: Receipt },
        { id: 'gate-pass', label: 'Phiếu ra cổng & Xác nhận ra', icon: QrCode },
        {
          id: 'handovers',
          label: 'Bàn giao vận chuyển',
          icon: TruckIcon,
          badge: pendingHandoverReviewCount > 0 ? `${pendingHandoverReviewCount} chờ duyệt` : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
      ],
    },
    {
      group: 'Giám sát & Báo cáo',
      items: [
        { id: 'admin', label: 'Báo cáo vận hành', icon: BarChart3 },
        { id: 'edi', label: 'Điện EDI gửi hãng tàu', icon: Radio },
        { id: 'activity', label: 'Nhật ký thao tác', icon: History },
      ],
    },
    {
      group: 'Quản trị hệ thống',
      items: [
        { id: 'master-data', label: 'Danh mục dùng chung', icon: Database },
        { id: 'users-roles', label: 'Người dùng & Phân quyền', icon: Users },
        { id: 'partner-clients', label: 'Đối tác kết nối API', icon: KeyRound },
        { id: 'partner-api-logs', label: 'Nhật ký API đối tác', icon: FileCode },
      ],
    },
  ];

  return (
    <aside aria-label="Điều hướng nghiệp vụ" className={`${isOpen ? 'flex' : 'hidden'} fixed left-0 top-16 bottom-0 z-40 w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 select-none md:static md:flex`}>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 text-xs">
        {navItems.map(group => ({...group,items:group.items.filter(item => canAccessWebTab(currentUser,item.id))})).filter(group => group.items.length).map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-caption font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavTabId)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-1 text-caption font-bold rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-caption text-slate-400 space-y-1">
        <div className="font-semibold text-slate-200 truncate">{currentUser.name}</div>
        <div className="truncate">{currentUser.email}</div>
        <div className="text-blue-300">{roleName}</div>
      </div>
    </aside>
  );
};
