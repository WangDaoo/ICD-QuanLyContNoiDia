import { theme } from '../../../theme/theme';

export function DashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
          Tổng quan Cảng Cạn ICD
        </h1>
        <p style={{ color: theme.colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
          Theo dõi lưu lượng cổng, tồn bãi, vận chuyển và chỉ số vận hành thời gian thực.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted }}>
            CONTAINER TRONG BÃI
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.primary, marginTop: '8px' }}>
            1,248 <span style={{ fontSize: '14px', fontWeight: 500, color: theme.colors.textSecondary }}>TEU</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted }}>
            GATE-IN HÔM NAY
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.success, marginTop: '8px' }}>
            86 <span style={{ fontSize: '14px', fontWeight: 500, color: theme.colors.textSecondary }}>xe</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted }}>
            GATE-OUT HÔM NAY
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.info, marginTop: '8px' }}>
            72 <span style={{ fontSize: '14px', fontWeight: 500, color: theme.colors.textSecondary }}>xe</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted }}>
            CÔNG VIỆC CHỜ XỬ LÝ
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: theme.colors.warning, marginTop: '8px' }}>
            14 <span style={{ fontSize: '14px', fontWeight: 500, color: theme.colors.textSecondary }}>tác vụ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
