import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { loadYardSnapshot, type YardSnapshot } from '../api/yard-snapshot';
import { YardSlotGrid } from '../components/YardSlotGrid';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { LoadingState } from '../../../components/LoadingState';
import { getYardSlotAppearance } from '../api/yard-map';
import { useTheme } from '../../../theme/ThemeProvider';

export function MonitorScreen() {
  const styles = useFieldStyles();
  const { theme } = useTheme();
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

  // Compute summary stats from snapshot
  const totalSlots = snapshot?.total ?? 0;
  const occupiedSlots = snapshot?.slots.filter((s) => s.currentContainer).length ?? 0;
  const freeSlots = snapshot?.slots.filter((s) => !s.currentContainer && s.status === 'AVAILABLE').length ?? 0;
  const holdSlots = snapshot
    ? snapshot.slots.filter((s) => {
        if (!s.currentContainer) return false;
        const app = getYardSlotAppearance(s, snapshot.holds, snapshot.inspections);
        return app.key === 'hold';
      }).length
    : 0;

  // Containers needing attention: hold or inspection in-progress
  const needsAttention: Array<{ key: string; displayName: string; label: string }> = snapshot
    ? [
        ...snapshot.holds
          .filter((h) => h.status === 'ACTIVE')
          .map((h) => ({
            key: h.id,
            displayName:
              snapshot.slots.find(
                (s) => s.currentContainer?.containerVisitId === h.containerVisitId,
              )?.currentContainer?.containerNumber ?? 'Lệnh chưa gắn container',
            label: 'Đang giữ',
          })),
        ...snapshot.inspections
          .filter((i) => i.status === 'IN_PROGRESS')
          .map((i) => ({
            key: i.id,
            displayName: i.containerVisit?.container.containerNumber ?? i.containerVisitId,
            label: 'Đang kiểm định',
          })),
      ].slice(0, 5)
    : [];

  return (
    <ScreenLayout
      title="Giám sát & Điều phối ca trực"
      onRefresh={() => void load()}
      refreshing={loading}
    >
      <Card title="Tóm tắt bãi">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary }}>
              {totalSlots}
            </Text>
            <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>Tổng ô</Text>
          </View>
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary }}>
              {occupiedSlots}
            </Text>
            <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>Có container</Text>
          </View>
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary }}>
              {freeSlots}
            </Text>
            <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>Trống</Text>
          </View>
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary }}>
              {holdSlots}
            </Text>
            <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>Đang giữ</Text>
          </View>
        </View>
        {error ? <Notice message={error} /> : null}
      </Card>

      {needsAttention.length > 0 ? (
        <Card title="Cần chú ý">
          {needsAttention.map((item) => (
            <View
              key={item.key}
              style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text style={[styles.value, { flex: 1 }]}>
                {item.displayName}
              </Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>{item.label}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card title="Bảng giám sát hiện trường">
        <Text style={styles.muted}>Theo dõi hiện trường · {snapshot?.slots.length ?? 0} ô bãi</Text>
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
