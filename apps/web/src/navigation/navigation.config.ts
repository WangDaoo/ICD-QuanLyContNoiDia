export type NavigationItem = {
  key: string;
  label: string;
  path: string;
  icon?: string;
  permission?: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        path: '/',
        icon: '📊',
      },
      {
        key: 'work-queue',
        label: 'Work Queue',
        path: '/work-queue',
        icon: '📋',
      },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      {
        key: 'manifests',
        label: 'Manifest',
        path: '/manifests',
        icon: '📄',
      },
      {
        key: 'movement-orders',
        label: 'Movement Orders',
        path: '/movement-orders',
        icon: '🚛',
      },
      {
        key: 'truck-visits',
        label: 'Truck Visits',
        path: '/truck-visits',
        icon: '🚚',
      },
      {
        key: 'containers',
        label: 'Containers',
        path: '/containers',
        icon: '📦',
      },
      {
        key: 'gate-in',
        label: 'Gate-in',
        path: '/gate-in',
        icon: '🚪',
      },
      {
        key: 'yard',
        label: 'Yard',
        path: '/yard',
        icon: '🏗️',
      },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      {
        key: 'billing',
        label: 'Billing',
        path: '/billing',
        icon: '💳',
      },
      {
        key: 'gate-pass',
        label: 'Gate Pass',
        path: '/gate-pass',
        icon: '🎫',
      },
    ],
  },
  {
    label: 'Tích hợp',
    items: [
      {
        key: 'edi',
        label: 'EDI',
        path: '/edi',
        icon: '🔄',
      },
      {
        key: 'handover',
        label: 'Transport Handover',
        path: '/handovers',
        icon: '🤝',
      },
      {
        key: 'partner-api',
        label: 'Partner API',
        path: '/partner-clients',
        icon: '🔌',
      },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: '📈',
      },
      {
        key: 'audit',
        label: 'Audit Logs',
        path: '/audit',
        icon: '📜',
      },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      {
        key: 'users',
        label: 'Users',
        path: '/admin/users',
        icon: '👥',
      },
      {
        key: 'roles',
        label: 'Roles & Permissions',
        path: '/admin/roles',
        icon: '🛡️',
      },
      {
        key: 'master-data',
        label: 'Master Data',
        path: '/admin/master-data',
        icon: '🗄️',
      },
      {
        key: 'tariffs',
        label: 'Tariffs',
        path: '/admin/tariffs',
        icon: '💰',
      },
      {
        key: 'settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: '⚙️',
      },
    ],
  },
];
