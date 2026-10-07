import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadinessCheck } from '../types';

export function useBackendReadiness(visitId?: string | null) {
  const {
    checkReadiness,
    containerVisits,
    invoices,
    serviceOrders,
    holds,
    inspections,
    yardMovements,
    bookings,
    gatePasses,
  } = useApp();
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [readinessError, setReadinessError] = useState('');
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [revision, setRevision] = useState(0);
  const [evaluatedVisitId, setEvaluatedVisitId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setReadiness(null);
    setReadinessError('');
    setEvaluatedVisitId(null);
    if (!visitId) {
      setIsCheckingReadiness(false);
      return;
    }
    setIsCheckingReadiness(true);
    checkReadiness(visitId)
      .then((result) => {
        if (isCurrent) {
          setReadiness(result);
          setEvaluatedVisitId(visitId);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setReadinessError(
            error instanceof Error ? error.message : 'Không thể kiểm tra điều kiện ra cổng.',
          );
          setEvaluatedVisitId(visitId);
        }
      })
      .finally(() => {
        if (isCurrent) setIsCheckingReadiness(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [
    visitId,
    containerVisits,
    invoices,
    serviceOrders,
    holds,
    inspections,
    yardMovements,
    bookings,
    gatePasses,
    revision,
  ]);

  const current = evaluatedVisitId === visitId;
  const confirmed =
    readiness &&
    [
      readiness.isContainerInYard,
      readiness.hasYardPosition,
      readiness.isBillingCompleted,
      readiness.hasNoUnbilledServices,
      readiness.hasNoActiveYardOps,
      readiness.hasNoInspectionHold,
      readiness.hasNoOperationalHold,
    ].every((value) => value === true);
  const status = !visitId
    ? 'unavailable'
    : !current || isCheckingReadiness
      ? 'checking'
      : readinessError
        ? 'error'
        : !readiness
          ? 'unavailable'
          : readiness.blockers.length
            ? 'blocked'
            : confirmed
              ? 'ready'
              : 'unavailable';
  return {
    readiness: current ? readiness : null,
    readinessError: current ? readinessError : '',
    isCheckingReadiness: status === 'checking',
    status,
    retryReadiness: () => setRevision((value) => value + 1),
  };
}
