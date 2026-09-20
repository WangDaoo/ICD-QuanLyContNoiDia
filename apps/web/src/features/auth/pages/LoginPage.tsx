import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../../../theme/theme';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ username: username.trim(), password });
      window.location.href = '/';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: '36px',
          boxShadow: theme.shadows.lg,
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: theme.colors.primary,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
              marginBottom: '12px',
            }}
          >
            ⚓
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.textPrimary, margin: 0 }}>
            ICD HƯNG YÊN
          </h1>
          <p style={{ fontSize: '13px', color: theme.colors.textSecondary, marginTop: '4px' }}>
            Hệ thống Quản lý Điều hành Cảng Cạn
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: theme.colors.dangerBackground,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.danger,
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.colors.textSecondary,
                marginBottom: '6px',
              }}
            >
              Tài khoản
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: admin, gate_operator..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.colors.textSecondary,
                marginBottom: '6px',
              }}
            >
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: theme.colors.primary,
              color: '#fff',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
          </button>
        </form>
      </div>
    </div>
  );
}
