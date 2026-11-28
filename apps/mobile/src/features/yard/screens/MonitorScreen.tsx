import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { loadYardSnapshot, type YardSnapshot } from '../api/yard-snapshot';
import { YardSlotGrid } from '../components/YardSlotGrid';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { LoadingState } from '../../../components/LoadingState';
import { useRealtimeRefresh } from '../../../services/realtime/useRealtimeRefresh';

export function MonitorScreen() {
  const styles = useFieldStyles();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<YardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!hasAnyPermission(user, ['yard.read'])) return;
    // `silent`: tải lại do realtime, giữ sơ đồ đang hiển thị và không bật vòng xoay.
    const silent = options.silent === true;
    const ticket = ++request.current;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await loadYardSnapshot({
        canReadInspections: true,
        canReadHolds: hasAnyPermission(user, ['operational_hold.read']),
      });
      if (ticket === request.current) {
        setSnapshot(response);
        setError('');
      }
    } catch (err) {
      if (ticket === request.current && !silent)
        setError(err instanceof Error ? err.message : 'Không tải được trạng thái bãi.');
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );
  useRealtimeRefresh(() => load({ silent: true }), {
    topics: ['yard', 'containers', 'gate', 'inspections', 'holds', 'movement-orders'],
  });
  return (
    <ScreenLayout
      title="Điều phối ca trực"
      onRefresh={() => void load()}
      refreshing={loading}
    >
      <Card title="Công việc hiện trường">
        <Text style={styles.muted}>Theo dõi hiện trường · {snapshot?.slots.length ?? 0} ô bãi</Text>
        {error ? <Notice message={error} /> : null}
        {snapshot?.warnings.map((message) => (
          <Notice key={message} message={message} />
        ))}
        {loading ? (
          <LoadingState />
        ) : (
          <YardSlotGrid
            slots={snapshot?.slots ?? []}
            holds={snapshot?.holds}
            inspections={snapshot?.inspections}
          />
        )}
      </Card>
    </ScreenLayout>
  );
}
