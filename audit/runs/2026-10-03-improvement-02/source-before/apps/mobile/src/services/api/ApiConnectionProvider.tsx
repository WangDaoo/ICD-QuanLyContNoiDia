import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { checkApiConnection } from './api-connection';

const ConnectionContext = createContext<{ online: boolean | null; checking: boolean; checkedAt: Date | null; retry: () => Promise<void> }>({ online: null, checking: false, checkedAt: null, retry: async () => {} });
export function ApiConnectionProvider({ children }: PropsWithChildren) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const retry = useCallback(async () => {
    if (pending.current) return;
    pending.current = true; setChecking(true);
    const available = await checkApiConnection(process.env.EXPO_PUBLIC_API_BASE_URL || '');
    pending.current = false;
    if (mounted.current) { setOnline(available); setChecking(false); setCheckedAt(new Date()); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void retry();
    const interval = setInterval(() => { if (!AppState.currentState || AppState.currentState === 'active') void retry(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void retry(); });
    return () => { mounted.current = false; clearInterval(interval); listener.remove(); };
  }, [retry]);
  return <ConnectionContext.Provider value={{ online, checking, checkedAt, retry }}>{children}</ConnectionContext.Provider>;
}
export const useApiConnection = () => useContext(ConnectionContext);
