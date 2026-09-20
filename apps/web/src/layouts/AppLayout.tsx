import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { AppTopBar } from '../components/layout/AppTopBar';
import { theme } from '../theme/theme';

export function AppLayout() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.colors.background,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppTopBar />

        <main
          style={{
            flex: 1,
            padding: theme.spacing.lg,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
