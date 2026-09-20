import { NavLink } from 'react-router-dom';
import { navigationGroups } from '../../navigation/navigation.config';
import { theme } from '../../theme/theme';

export function AppSidebar() {
  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: theme.colors.sidebarBg,
        color: theme.colors.sidebarText,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        borderRight: `1px solid ${theme.colors.sidebarHover}`,
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: theme.shadows.md,
          }}
        >
          ⚓
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px', color: '#fff' }}>
            ICD HƯNG YÊN
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.sidebarTextMuted, fontWeight: 500 }}>
            Hệ thống Quản lý Cảng Cạn
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div style={{ flex: 1, padding: '16px 12px' }}>
        {navigationGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: theme.colors.sidebarTextMuted,
                padding: '0 12px 8px 12px',
              }}
            >
              {group.label}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: theme.borderRadius.md,
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#FFFFFF' : theme.colors.sidebarText,
                    backgroundColor: isActive ? theme.colors.sidebarActive : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon || '•'}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / System Status */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: theme.colors.sidebarTextMuted,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: theme.colors.success,
              display: 'inline-block',
            }}
          />
          Hệ thống Online
        </span>
        <span style={{ fontWeight: 600 }}>v1.0.0</span>
      </div>
    </aside>
  );
}
