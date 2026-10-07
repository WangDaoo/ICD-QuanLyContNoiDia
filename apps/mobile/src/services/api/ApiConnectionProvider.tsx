import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { checkApiConnection } from './api-connection';
import { connectionGate, type ConnectionSnapshot } from './connection-gate';

const ConnectionContext = createContext<ConnectionSnapshot & { checking: boolean; checkedAt: Date | null; retry: () => Promise<void> }>({ ...connectionGate.snapshot(), checking: false, checkedAt: null, retry: async () => {} });
export function ApiConnectionProvider({ children }: PropsWithChildren) {
  const [connection, setConnection] = useState(connectionGate.snapshot);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const retry = useCallback(async () => {
    if (pending.current) return;
    pending.current = true; setChecking(true);
    const available = await checkApiConnection(process.env.EXPO_PUBLIC_API_BASE_URL || '');
    pending.current = false;
    if (mounted.current) { connectionGate.reportHealth(available); setChecking(false); setCheckedAt(new Date()); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    connectionGate.activate();
    const unsubscribe = connectionGate.subscribe(setConnection);
    void retry();
    const interval = setInterval(() => { if (!AppState.currentState || AppState.currentState === 'active') void retry(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void retry(); });
    return () => { mounted.current = false; clearInterval(interval); listener.remove(); unsubscribe(); };
  }, [retry]);
  return <ConnectionContext.Provider value={{ ...connection, checking, checkedAt, retry }}>{children}</ConnectionContext.Provider>;
}
export const useApiConnection = () => useContext(ConnectionContext);
