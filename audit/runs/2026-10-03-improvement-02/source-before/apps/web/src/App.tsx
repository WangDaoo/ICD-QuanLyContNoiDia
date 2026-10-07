import React, { useState } from 'react';
import { canAccessWebTab } from './services/permissions';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar, NavTabId } from './components/Sidebar';
import { WebLoginView } from './components/WebLoginView';
import { DashboardView } from './components/DashboardView';
import { WorkQueueView } from './components/WorkQueueView';
import { ManifestsView } from './components/ManifestsView';
import { ContainersView } from './components/ContainersView';
import { TruckVisitsView } from './components/TruckVisitsView';
import { GateInView } from './components/GateInView';
import { YardView } from './components/YardView';
import { BillingView } from './components/BillingView';
import { GatePassView } from './components/GatePassView';
import { HandoversView } from './components/HandoversView';
import { PartnerManagementView } from './components/PartnerManagementView';
import { EDIView } from './components/EDIView';
import { AuditsView } from './components/AuditsView';
import { ReportsView } from './components/ReportsView';
import { MovementOrdersView } from './components/MovementOrdersView';
import { MasterDataView } from './components/MasterDataView';
import { UsersRolesView } from './components/UsersRolesView';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { AlertCircle, RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading, apiError, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [activeContextId, setActiveContextId] = useState<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = (tab: NavTabId, contextId?: string) => {
    setActiveTab(tab);
    setActiveContextId(contextId);
    setIsSidebarOpen(false);
  };

  if (!isAuthenticated) return <WebLoginView />;

  const renderContent = () => {
    if (!canAccessWebTab(currentUser,activeTab)) return <p role="alert">Tài khoản không có quyền truy cập nghiệp vụ này.</p>;
    switch (activeTab) {
      case 'dashboard': return <DashboardView onNavigate={handleNavigate} />;
      case 'work-queue': return <WorkQueueView onNavigate={handleNavigate} />;
      case 'manifests': return <ManifestsView />;
      case 'containers': return <ContainersView onNavigate={handleNavigate} selectedVisitId={activeContextId} />;
      case 'movement-orders': return <MovementOrdersView onNavigate={handleNavigate} targetVisitId={activeContextId} />;
      case 'truck-visits': return <TruckVisitsView onNavigate={handleNavigate} />;
      case 'gate-in': return <GateInView onNavigate={handleNavigate} defaultVisitId={activeContextId} />;
      case 'yard': return <YardView onNavigate={handleNavigate} targetAssignVisitId={activeContextId} />;
      case 'billing': return <BillingView onNavigate={handleNavigate} targetVisitId={activeContextId} />;
      case 'gate-pass': return <GatePassView onNavigate={handleNavigate} targetVisitId={activeContextId} />;
      case 'handovers': return <HandoversView onNavigate={handleNavigate} targetHandoverId={activeContextId} />;
      case 'partner-clients': return <PartnerManagementView mode="CLIENTS" />;
      case 'partner-api-logs': return <PartnerManagementView mode="LOGS" />;
      case 'edi': return <EDIView />;
      case 'master-data': return <MasterDataView />;
      case 'users-roles': return <UsersRolesView />;
      case 'admin': return <ReportsView />;
      case 'activity': return <AuditsView />;
    }
  };

  return (
    <div className="app-shell bg-slate-100 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Header currentTab={activeTab} onMenuClick={() => setIsSidebarOpen((open) => !open)} />
      <div className="flex min-h-0 flex-1">
        {isSidebarOpen && <button type="button" aria-label="Đóng menu điều hướng" className="fixed inset-0 top-16 z-30 bg-slate-950/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <Sidebar activeTab={activeTab} setActiveTab={handleNavigate} isOpen={isSidebarOpen} />
        <main className="app-content min-w-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" aria-busy={isLoading}>
          <div className="mx-auto max-w-[1440px] space-y-5">
            {apiError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{apiError}</span>
              <button type="button" disabled={isLoading} onClick={() => void refreshData()} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Tải lại</button>
            </div>}
            {isLoading && <div role="status" className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Đang tải dữ liệu vận hành…</div>}
            <ViewErrorBoundary key={`${activeTab}:${activeContextId ?? ''}`} onRecover={() => handleNavigate('dashboard')}>
              {renderContent()}
            </ViewErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return <AppProvider><MainLayout /></AppProvider>;
}
