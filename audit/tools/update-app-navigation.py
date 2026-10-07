from pathlib import Path
import re
p = Path('apps/web/src/App.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace("import React, { useState } from 'react';", "import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';\nimport { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';\nimport { makeDestination, parseDestination, type NavigationContext } from './navigation';")
s = re.sub(r"import \{ (\w+) \} from '(\./components/\w+View)';", lambda m: m.group(0) if m.group(1) == 'WebLoginView' else f"const {m.group(1)} = lazy(() => import('{m.group(2)}').then(module => ({{ default: module.{m.group(1)} }})));", s)
start = s.index("  const [activeTab,")
end = s.index("\n  if (!isAuthenticated)", start)
s = s[:start] + """  const location = useLocation();
  const navigate = useNavigate();
  const { tab: activeTab, context } = parseDestination(location.pathname, location.search);
  const [visited, setVisited] = useState<NavTabId[]>([]);
  const contexts = useRef(new Map<NavTabId, NavigationContext>());
  const scrolls = useRef(new Map<string, number>());
  const content = useRef<HTMLElement>(null);
  const previousUser = useRef<string>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  contexts.current.set(activeTab, context);
  useEffect(() => {
    if (previousUser.current && (!isAuthenticated || previousUser.current !== currentUser.id)) {
      setVisited([]); contexts.current.clear(); scrolls.current.clear();
      navigate('/app/dashboard', { replace: true });
    }
    previousUser.current = isAuthenticated ? currentUser.id : undefined;
  }, [isAuthenticated, currentUser.id, navigate]);
  useEffect(() => { setVisited(old => old.includes(activeTab) ? old : [...old, activeTab]); }, [activeTab]);
  useLayoutEffect(() => {
    if (content.current) content.current.scrollTop = scrolls.current.get(location.key) ?? 0;
    document.dispatchEvent(new CustomEvent('icd:route-changed'));
    const scrollKey = location.key;
    const element = content.current;
    return () => { if (element) scrolls.current.set(scrollKey, element.scrollTop); };
  }, [location.key]);
  const handleNavigate = (tab: NavTabId, contextId?: string, explicit?: NavigationContext) => {
    const request = new CustomEvent('icd:navigation-request', { cancelable: true });
    if (!document.dispatchEvent(request)) return;
    if (content.current) scrolls.current.set(location.key, content.current.scrollTop);
    navigate(makeDestination(tab, contextId, explicit));
    setIsSidebarOpen(false);
  };
""" + s[end:]
s = s.replace('const renderContent = () => {', 'const renderContent = (tab: NavTabId, target: NavigationContext) => {\n    const activeContextId = target.visitId;')
s = s.replace('canAccessWebTab(currentUser,activeTab)', 'canAccessWebTab(currentUser,tab)').replace('switch (activeTab)', 'switch (tab)')
s = s.replace('<TruckVisitsView onNavigate={handleNavigate} />', '<TruckVisitsView onNavigate={handleNavigate} targetVisitId={target.visitId} />')
s = s.replace('<GatePassView onNavigate={handleNavigate} targetVisitId={activeContextId} />', '<GatePassView onNavigate={handleNavigate} targetVisitId={target.visitId} targetGatePassId={target.gatePassId} />')
s = s.replace('targetHandoverId={activeContextId}', 'targetHandoverId={target.handoverId}')
s = s.replace('currentTab={activeTab}', 'currentTab={`${activeTab}:${location.search}`}')
s = s.replace('<main className=', '<main ref={content} id="main-content" tabIndex={-1} className=')
start = s.index('            <ViewErrorBoundary key=')
end = s.index('            </ViewErrorBoundary>', start) + len('            </ViewErrorBoundary>')
s = s[:start] + """            {[...new Set([...visited, activeTab])].map(tab => <div key={`${currentUser.id}:${tab}`} className="app-view" hidden={tab !== activeTab}>
              <ViewErrorBoundary onRecover={() => handleNavigate('dashboard')}>
                <Suspense fallback={<div role="status" className="rounded-xl bg-slate-200 p-6 text-slate-700">Đang mở màn nghiệp vụ…</div>}>
                  {renderContent(tab, contexts.current.get(tab) ?? {})}
                </Suspense>
              </ViewErrorBoundary>
            </div>)}""" + s[end:]
s = s.replace('<AppProvider><MainLayout /></AppProvider>', '<AppProvider><BrowserRouter><MainLayout /></BrowserRouter></AppProvider>')
p.write_text(s, encoding='utf-8')
