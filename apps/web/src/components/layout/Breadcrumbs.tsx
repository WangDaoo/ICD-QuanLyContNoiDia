import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { theme } from '../../theme/theme';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'work-queue': 'Work Queue',
  'manifests': 'Manifest',
  'movement-orders': 'Movement Orders',
  'truck-visits': 'Truck Visits',
  'containers': 'Containers',
  'gate-in': 'Gate-in',
  'yard': 'Yard Management',
  'billing': 'Billing & Invoicing',
  'gate-pass': 'Gate Pass',
  'edi': 'EDI Integration',
  'handovers': 'Transport Handover',
  'partner-clients': 'Partner API',
  'reports': 'Reports',
  'audit': 'Audit Logs',
  'admin': 'Quản trị',
  'users': 'Users',
  'roles': 'Roles & Permissions',
  'master-data': 'Master Data',
  'tariffs': 'Tariffs',
  'settings': 'Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return (
      <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.textPrimary }}>
        Tổng quan / Dashboard
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.colors.textSecondary }}>
      <Link to="/" style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
        Trang chủ
      </Link>
      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const label = ROUTE_LABELS[segment] || segment;

        return (
          <React.Fragment key={path}>
            <span style={{ color: theme.colors.textMuted }}>/</span>
            {isLast ? (
              <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{label}</span>
            ) : (
              <Link to={path} style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
