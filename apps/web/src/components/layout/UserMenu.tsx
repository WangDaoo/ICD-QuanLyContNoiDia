import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { theme } from '../../theme/theme';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fullName = user?.fullName || user?.username || 'Nhân viên';
  const roleDisplay = user?.roleCodes?.join(', ') || 'STAFF';
  const initials = fullName.slice(0, 2).toUpperCase();

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: theme.borderRadius.md,
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.surfaceSubtle)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primaryLight,
            color: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          {initials}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.textPrimary }}>
            {fullName}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontWeight: 500 }}>
            {roleDisplay}
          </div>
        </div>
        <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '220px',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.lg,
            border: `1px solid ${theme.colors.border}`,
            padding: '8px 0',
            zIndex: 1000,
          }}
        >
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.textPrimary }}>
              {fullName}
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
              {user?.username || 'user'}
            </div>
            <div
              style={{
                marginTop: '4px',
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: theme.colors.primaryLight,
                color: theme.colors.primary,
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {roleDisplay}
            </div>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              color: theme.colors.danger,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.dangerBackground)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
