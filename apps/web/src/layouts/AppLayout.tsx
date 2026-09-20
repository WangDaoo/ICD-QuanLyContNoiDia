import {
  useMemo,
  useState,
} from 'react';

import {
  Outlet,
  useLocation,
} from 'react-router-dom';

import { AppSidebar } from '../components/layout/AppSidebar';
import { AppTopBar } from '../components/layout/AppTopBar';
import type {
  ShellUser,
} from '../components/layout/UserMenu';
import { useAuth } from '../features/auth/hooks/useAuth';

import './AppLayout.css';

type AuthShape = {
  user?: ShellUser | null;

  logout?: () =>
    | void
    | Promise<void>;
};

function getPageTitle(
  pathname: string,
): string {
  const mappings: Array<{
    prefix: string;
    title: string;
  }> = [
    {
      prefix: '/work-queue',
      title: 'Work Queue',
    },
    {
      prefix: '/manifests',
      title: 'Manifest',
    },
    {
      prefix: '/movement-orders',
      title: 'Movement Orders',
    },
    {
      prefix: '/truck-visits',
      title: 'Truck Visits',
    },
    {
      prefix: '/containers',
      title: 'Containers',
    },
    {
      prefix: '/gate-in',
      title: 'Gate-in',
    },
    {
      prefix: '/yard',
      title: 'Yard Operations',
    },
    {
      prefix: '/billing',
      title: 'Billing',
    },
    {
      prefix: '/gate-pass',
      title: 'Gate Pass',
    },
    {
      prefix: '/edi',
      title: 'EDI Operations',
    },
    {
      prefix: '/handovers',
      title: 'Transport Handover',
    },
    {
      prefix: '/partner-clients',
      title: 'Partner API',
    },
    {
      prefix: '/reports',
      title: 'Reports',
    },
    {
      prefix: '/audit',
      title: 'Audit Logs',
    },
    {
      prefix: '/admin/users',
      title: 'Quản lý người dùng',
    },
    {
      prefix: '/admin/roles',
      title: 'Roles & Permissions',
    },
    {
      prefix: '/admin/master-data',
      title: 'Master Data',
    },
    {
      prefix: '/admin/tariffs',
      title: 'Tariffs',
    },
    {
      prefix: '/admin/settings',
      title: 'Operational Settings',
    },
  ];

  if (pathname === '/') {
    return 'Dashboard';
  }

  return (
    mappings.find(
      ({ prefix }) =>
        pathname.startsWith(prefix),
    )?.title ?? 'ICD Management'
  );
}

export function AppLayout() {
  const location =
    useLocation();

  const auth =
    useAuth() as AuthShape;

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const pageTitle =
    useMemo(
      () =>
        getPageTitle(
          location.pathname,
        ),
      [location.pathname],
    );

  const permissionCodes =
    auth.user?.permissionCodes ?? [];

  async function handleLogout() {
    if (auth.logout) {
      await auth.logout();
    }
  }

  return (
    <div className="icd-shell">
      <AppSidebar
        collapsed={
          sidebarCollapsed
        }
        permissionCodes={
          permissionCodes
        }
      />

      <div
        className={[
          'icd-shell__main',
          sidebarCollapsed
            ? 'icd-shell__main--sidebar-collapsed'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <AppTopBar
          user={auth.user ?? null}
          sidebarCollapsed={
            sidebarCollapsed
          }
          onToggleSidebar={() =>
            setSidebarCollapsed(
              (value) => !value,
            )
          }
          onLogout={
            handleLogout
          }
        />

        <main className="icd-content">
          <div className="icd-page-heading">
            <div>
              <span className="icd-page-heading__eyebrow">
                ICD MANAGEMENT
              </span>

              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="icd-page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
