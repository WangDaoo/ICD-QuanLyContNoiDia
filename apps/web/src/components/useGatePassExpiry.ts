import { useEffect, useState } from 'react';
import type { GatePass } from '../types';

export function useGatePassExpiry(passes: GatePass[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const current = Date.now();
    const expiries = passes
      .filter((pass) => pass.status === 'ACTIVE')
      .map((pass) => new Date(pass.expiresAt).getTime())
      .filter((expiry) => Number.isFinite(expiry) && expiry > current);
    if (!expiries.length) return;
    const delay = Math.min(Math.min(...expiries) - current + 1, 2147483647);
    const timer = setTimeout(() => setTick((value) => value + 1), delay);
    return () => clearTimeout(timer);
  }, [passes, tick]);
  return Date.now();
}
