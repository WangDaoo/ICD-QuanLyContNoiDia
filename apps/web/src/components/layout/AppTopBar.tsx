import type {
  ShellUser,
} from './UserMenu';

import {
  UserMenu,
} from './UserMenu';

type AppTopBarProps = {
  user: ShellUser | null;
  sidebarCollapsed: boolean;

  onToggleSidebar: () => void;

  onLogout: () =>
    | void
    | Promise<void>;
};

export function AppTopBar({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  onLogout,
}: AppTopBarProps) {
  return (
    <header className="icd-topbar">
      <div className="icd-topbar__left">
        <button
          type="button"
          className="icd-topbar__menu-button"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed
              ? 'Mở sidebar'
              : 'Thu gọn sidebar'
          }
        >
          ☰
        </button>

        <div className="icd-topbar__site">
          <span className="icd-topbar__site-label">
            ICD SITE
          </span>

          <strong>
            {user?.icdId ??
              'ICD01'}
          </strong>
        </div>
      </div>

      <div className="icd-topbar__right">
        <div className="icd-topbar__status">
          <span className="icd-topbar__status-dot" />

          <span>
            Hệ thống hoạt động
          </span>
        </div>

        <button
          type="button"
          className="icd-topbar__notification"
          aria-label="Thông báo"
          title="Thông báo"
        >
          ♢

          <span className="icd-topbar__notification-dot" />
        </button>

        <UserMenu
          user={user}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
