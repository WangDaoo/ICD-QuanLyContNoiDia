export type NavigationItem = {
  key: string;
  label: string;
  path: string;
  icon: string;
  permission?: string;
  end?: boolean;
};

export type NavigationGroup = {
  key: string;
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    key: 'overview',
    label: 'TỔNG QUAN',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        path: '/',
        icon: '◫',
        end: true,
      },
      {
        key: 'work-queue',
        label: 'Work Queue',
        path: '/work-queue',
        icon: '☷',
      },
    ],
  },

  {
    key: 'operations',
    label: 'VẬN HÀNH',
    items: [
      {
        key: 'manifests',
        label: 'Manifest',
        path: '/manifests',
        icon: '▤',
      },
      {
        key: 'movement-orders',
        label: 'Movement Orders',
        path: '/movement-orders',
        icon: '⇄',
      },
      {
        key: 'truck-visits',
        label: 'Truck Visits',
        path: '/truck-visits',
        icon: '▰',
      },
      {
        key: 'containers',
        label: 'Containers',
        path: '/containers',
        icon: '▣',
      },
      {
        key: 'gate-in',
        label: 'Gate-in',
        path: '/gate-in',
        icon: '⇥',
      },
      {
        key: 'yard',
        label: 'Yard',
        path: '/yard',
        icon: '▦',
      },
    ],
  },

  {
    key: 'finance',
    label: 'TÀI CHÍNH',
    items: [
      {
        key: 'billing',
        label: 'Billing',
        path: '/billing',
        icon: '₫',
      },
      {
        key: 'gate-pass',
        label: 'Gate Pass',
        path: '/gate-pass',
        icon: '⌁',
      },
    ],
  },

  {
    key: 'integration',
    label: 'TÍCH HỢP',
    items: [
      {
        key: 'edi',
        label: 'EDI',
        path: '/edi',
        icon: '⇆',
      },
      {
        key: 'handovers',
        label: 'Transport Handover',
        path: '/handovers',
        icon: '◇',
      },
      {
        key: 'partner-api',
        label: 'Partner API',
        path: '/partner-clients',
        icon: '⌘',
      },
    ],
  },

  {
    key: 'analytics',
    label: 'PHÂN TÍCH',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: '▥',
      },
      {
        key: 'audit',
        label: 'Audit Logs',
        path: '/audit',
        icon: '◎',
      },
    ],
  },

  {
    key: 'administration',
    label: 'QUẢN TRỊ',
    items: [
      {
        key: 'users',
        label: 'Users',
        path: '/admin/users',
        icon: '♙',
      },
      {
        key: 'roles',
        label: 'Roles & Permissions',
        path: '/admin/roles',
        icon: '♢',
      },
      {
        key: 'master-data',
        label: 'Master Data',
        path: '/admin/master-data',
        icon: '⊞',
      },
      {
        key: 'tariffs',
        label: 'Tariffs',
        path: '/admin/tariffs',
        icon: '₫',
      },
    ],
  },
];
