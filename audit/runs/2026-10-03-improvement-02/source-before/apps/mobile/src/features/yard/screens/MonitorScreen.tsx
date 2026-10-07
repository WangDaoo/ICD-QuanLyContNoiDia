import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { loadYardSnapshot, type YardSnapshot } from '../api/yard-snapshot';
import { YardSlotGrid } from '../components/YardSlotGrid';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { LoadingState } from '../../../components/LoadingState';

export function MonitorScreen() {
  const styles = useFieldStyles();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<YardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!hasAnyPermission(user, ['yard.read'])) return;
    const ticket = ++request.current;
    setLoading(true);
    setError('');
    try {
      const response = await loadYardSnapshot({
        canReadInspections: true,
        canReadHolds: hasAnyPermission(user, ['operational_hold.read']),
      });
      if (ticket === request.current) setSnapshot(response);
    } catch (err) {
      if (ticket === request.current)
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
  return (
    <ScreenLayout
      title="Monitor & Điều phối ca trực"
      onRefresh={() => void load()}
      refreshing={loading}
    >
      <Card title="Bảng Monitor & Điều phối Ca trực Thực địa">
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
