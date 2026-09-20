import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { WorkQueuePage } from '../features/work-queue/pages/WorkQueuePage';
import { ContainerListPage } from '../features/containers/pages/ContainerListPage';
import { ContainerDetailPage } from '../features/containers/pages/ContainerDetailPage';
import { ManifestListPage } from '../features/manifests/pages/ManifestListPage';
import { ManifestDetailPage } from '../features/manifests/pages/ManifestDetailPage';
import { MovementOrderPage } from '../features/movement-orders/pages/MovementOrderPage';
import { TruckVisitListPage } from '../features/truck-visits/pages/TruckVisitListPage';
import { TruckVisitCreatePage } from '../features/truck-visits/pages/TruckVisitCreatePage';
import { TruckVisitDetailPage } from '../features/truck-visits/pages/TruckVisitDetailPage';
import { GateInPage } from '../features/gate-in/pages/GateInPage';
import YardOverviewPage from '../features/yard/pages/YardOverviewPage';
import YardAssignmentPage from '../features/yard/pages/YardAssignmentPage';
import YardOperationsPage from '../features/yard/pages/YardOperationsPage';
import { BillingListPage } from '../features/billing/pages/BillingListPage';
import { BillingDetailPage } from '../features/billing/pages/BillingDetailPage';
import { ServiceOrderCreatePage } from '../features/billing/pages/ServiceOrderCreatePage';
import { InvoiceDetailPage } from '../features/billing/pages/InvoiceDetailPage';
import GatePassPage from '../features/gate-pass/pages/GatePassPage';
import GateOutPage from '../features/gate-pass/pages/GateOutPage';
import EdiOperationsPage from '../features/edi/pages/EdiOperationsPage';
import HandoverListPage from '../features/partner-handover/pages/HandoverListPage';
import HandoverCreatePage from '../features/partner-handover/pages/HandoverCreatePage';
import HandoverDetailPage from '../features/partner-handover/pages/HandoverDetailPage';
import { PartnerClientListPage } from '../features/admin/partner-clients/pages/PartnerClientListPage';
import { PartnerClientDetailPage } from '../features/admin/partner-clients/pages/PartnerClientDetailPage';
import { PartnerApiLogListPage } from '../features/admin/partner-api-logs/pages/PartnerApiLogListPage';
import { PartnerApiLogDetailPage } from '../features/admin/partner-api-logs/pages/PartnerApiLogDetailPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import AdminUsersPage from '../features/admin/access/pages/AdminUsersPage';
import AccessMatrixPage from '../features/admin/access/pages/AccessMatrixPage';
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
          <Route path="/manifests" element={<ManifestListPage />} />
          <Route path="/manifests/:manifestId" element={<ManifestDetailPage />} />
          <Route path="/movement-orders" element={<MovementOrderPage />} />
          <Route path="/truck-visits" element={<TruckVisitListPage />} />
          <Route path="/truck-visits/new" element={<TruckVisitCreatePage />} />
          <Route path="/truck-visits/:truckVisitId" element={<TruckVisitDetailPage />} />
          <Route path="/containers" element={<ContainerListPage />} />
          <Route path="/containers/:visitId" element={<ContainerDetailPage />} />
          <Route path="/gate-in" element={<GateInPage />} />
          <Route path="/gate-in/:visitId" element={<GateInPage />} />
          <Route path="/yard" element={<YardOverviewPage />} />
          <Route path="/yard/:visitId/assign" element={<YardAssignmentPage />} />
          <Route path="/yard/assign" element={<YardAssignmentPage />} />
          <Route path="/yard/:visitId/operations" element={<YardOperationsPage />} />
          <Route path="/yard/operations" element={<YardOperationsPage />} />
          <Route path="/billing" element={<BillingListPage />} />
          <Route path="/billing/:visitId" element={<BillingDetailPage />} />
          <Route path="/billing/:visitId/service-order/new" element={<ServiceOrderCreatePage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/gate-pass" element={<GatePassPage />} />
          <Route path="/gate-pass/:visitId" element={<GatePassPage />} />
          <Route path="/gate-out" element={<GateOutPage />} />
          <Route path="/edi" element={<EdiOperationsPage />} />
          <Route path="/handovers" element={<HandoverListPage />} />
          <Route path="/handovers/new" element={<HandoverCreatePage />} />
          <Route path="/handovers/:handoverId" element={<HandoverDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin/partner-clients" element={<PartnerClientListPage />} />
          <Route path="/admin/partner-clients/:id" element={<PartnerClientDetailPage />} />
          <Route path="/admin/partner-api-logs" element={<PartnerApiLogListPage />} />
          <Route path="/admin/partner-api-logs/:id" element={<PartnerApiLogDetailPage />} />
          <Route path="/partner-clients" element={<Navigate to="/admin/partner-clients" replace />} />
          <Route path="/audit" element={<PlaceholderPage title="Audit Logs" description="Nhật ký kiểm toán toàn bộ thao tác hệ thống." />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/roles" element={<AccessMatrixPage />} />
          <Route path="/admin/master-data" element={<PlaceholderPage title="Master Data" description="Danh mục hãng tàu, khách hàng, biểu cước, mã ISO." />} />
          <Route path="/admin/tariffs" element={<PlaceholderPage title="Tariff Management" description="Cấu hình bảng giá dịch vụ cảng cạn." />} />
          <Route path="/admin/settings" element={<PlaceholderPage title="System Settings" description="Cấu hình tham số hệ thống." />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
