import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import { theme } from '../../theme/theme';

export function AppTopBar() {
  return (
    <header
      style={{
        height: '60px',
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Breadcrumbs />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          style={{
            background: 'none',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            color: theme.colors.textSecondary,
          }}
          title="Thông báo"
        >
          🔔
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
