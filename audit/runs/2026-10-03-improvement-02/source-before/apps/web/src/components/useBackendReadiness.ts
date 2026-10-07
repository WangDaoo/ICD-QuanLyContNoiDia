import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadinessCheck } from '../types';

export function useBackendReadiness(visitId?: string | null) {
  const { checkReadiness, containerVisits, invoices, serviceOrders, holds, inspections, yardMovements, bookings, gatePasses } = useApp();
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [readinessError, setReadinessError] = useState('');
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setReadiness(null);
    setReadinessError('');
    if (!visitId) return;
    setIsCheckingReadiness(true);
    checkReadiness(visitId).then((result) => {
      if (isCurrent) setReadiness(result);
    }).catch((error: unknown) => {
      if (isCurrent) setReadinessError(error instanceof Error ? error.message : 'Không thể kiểm tra điều kiện ra cổng.');
    }).finally(() => {
      if (isCurrent) setIsCheckingReadiness(false);
    });
    return () => { isCurrent = false; };
  }, [visitId, containerVisits, invoices, serviceOrders, holds, inspections, yardMovements, bookings, gatePasses]);

  return { readiness, readinessError, isCheckingReadiness };
}
