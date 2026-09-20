import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { WorkQueuePage } from '../features/work-queue/pages/WorkQueuePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { useAuth } from '../features/auth/hooks/useAuth';
import { theme } from '../theme/theme';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
          fontFamily: 'sans-serif',
          color: theme.colors.textSecondary,
        }}
      >
        Đang tải hệ thống ICD...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
        {title}
      </h1>
      <p style={{ color: theme.colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
        {description}
      </p>
      <div
        style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          border: `1px dashed ${theme.colors.border}`,
          textAlign: 'center',
          color: theme.colors.textMuted,
        }}
      >
        Module đang được kết nối theo blueprint mới...
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected app routes inside AppLayout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/work-queue" element={<WorkQueuePage />} />
          <Route path="/manifests" element={<PlaceholderPage title="Manifest Management" description="Quản lý bản lược khai hàng hóa và vận đơn HBL." />} />
          <Route path="/movement-orders" element={<PlaceholderPage title="Movement Orders" description="Quản lý lệnh vận chuyển container ra/vào cảng." />} />
          <Route path="/truck-visits" element={<PlaceholderPage title="Truck Visits" description="Đăng ký và giám sát lượt xe vận tải ra vào cảng." />} />
          <Route path="/containers" element={<PlaceholderPage title="Containers" description="Danh mục container, vòng đời và tra cứu lịch sử." />} />
          <Route path="/gate-in" element={<PlaceholderPage title="Gate-in" description="Kiểm tra tiếp nhận xe và container vào cổng." />} />
          <Route path="/yard" element={<PlaceholderPage title="Yard Operations" description="Sơ đồ bãi, vị trí xếp dỡ và gợi ý vị trí hạ cont." />} />
          <Route path="/billing" element={<PlaceholderPage title="Billing & Invoicing" description="Tính cước phí nâng hạ, lưu bãi và phát hành hóa đơn." />} />
          <Route path="/gate-pass" element={<PlaceholderPage title="Gate Pass" description="Kiểm tra Gate Readiness và cấp phát phiếu ra cổng điện tử." />} />
          <Route path="/edi" element={<PlaceholderPage title="EDI Integration" description="Xử lý thông điệp EDI (CODECO, COARRI, BAPLIE)." />} />
          <Route path="/handovers" element={<PlaceholderPage title="Transport Handover" description="Biên bản bàn giao và đối soát liên kết đối tác." />} />
          <Route path="/partner-clients" element={<PlaceholderPage title="Partner API Clients" description="Quản lý API Key và phân quyền tích hợp hệ thống bên ngoài." />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" description="Báo cáo thống kê sản lượng, doanh thu và năng suất." />} />
          <Route path="/audit" element={<PlaceholderPage title="Audit Logs" description="Nhật ký kiểm toán toàn bộ thao tác hệ thống." />} />
          <Route path="/admin/users" element={<PlaceholderPage title="User Management" description="Quản lý tài khoản người dùng nội bộ." />} />
          <Route path="/admin/roles" element={<PlaceholderPage title="Roles & Permissions" description="Phân quyền vai trò và ma trận quyền hạn." />} />
          <Route path="/admin/master-data" element={<PlaceholderPage title="Master Data" description="Danh mục hãng tàu, khách hàng, biểu cước, mã ISO." />} />
          <Route path="/admin/tariffs" element={<PlaceholderPage title="Tariff Management" description="Cấu hình bảng giá dịch vụ cảng cạn." />} />
          <Route path="/admin/settings" element={<PlaceholderPage title="System Settings" description="Cấu hình tham số hệ thống." />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
