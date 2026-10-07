import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../auth/hooks/useAuth';
import { getWorkQueueDestination } from '../work-queue-target';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../../../services/api/api-client';
import { mapWorkQueueItem } from '../api/work-queue.mapper';
import type { ApiWorkQueueItem } from '../api/work-queue.mapper';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useTheme } from '../../../theme/ThemeProvider';
import { PrimaryButton } from '../../../components/PrimaryButton';
import type { MainTabParamList, RootStackParamList, WorkQueueTask } from '../../../navigation/types';

export function WorkQueueScreen() {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [items, setItems] = useState<WorkQueueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [urgency, setUrgency] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [feedback, setFeedback] = useState('');
  const request = useRef(0);
  const [stats, setStats] = useState<{ total: number; overdue: number } | null>(null);

  const fetchData = useCallback(async () => {
    const ticket = ++request.current;
    setError(null); setLoading(true);
    try {
      const response = await apiClient.get<{ data: ApiWorkQueueItem[]; meta: { totalPages: number }; summary?: { total: number; overdue: number } }>(`/containers/work-queue?pageSize=20&page=${page}${filter ? '&type=' + filter : ''}${urgency ? '&urgency=' + urgency : ''}`);
      if (ticket !== request.current) return;
      setPages(response.meta.totalPages);
      const tasks = response.data.map(mapWorkQueueItem).filter((task): task is WorkQueueTask => !!task);
      setItems(tasks);
      setStats(response.summary ?? { total: tasks.length, overdue: tasks.filter(t => t.urgency === 'OVERDUE').length });
    } catch (err) { if (ticket === request.current) setError(err instanceof Error ? err.message : 'Không thể tải công việc.'); }
    finally { if (ticket === request.current) { setLoading(false); setRefreshing(false); } }
  }, [page, filter, urgency]);
  useFocusEffect(useCallback(() => { void fetchData(); return () => { request.current++; }; }, [fetchData]));

  const handleOpenTask = (task: WorkQueueTask) => {
    const destination = getWorkQueueDestination(user, task);
    if (destination) {
      setFeedback('');
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Main', destination);
    } else setFeedback('Tác vụ này chưa có màn hình phù hợp hoặc tài khoản chưa được cấp quyền. Vui lòng xử lý trên web hoặc liên hệ điều phối.');
  };
  const visibleItems = items;

  return <ScreenLayout title="Công việc trong ca" subtitle={user?.name} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchData(); }}>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={fieldStyles.value}>Việc ca trực: {stats?.total ?? '—'} tác vụ</Text>
      <Text style={[fieldStyles.muted, { color: stats?.overdue ? theme.colors.danger : theme.colors.textMuted }]}>Quá hạn: {stats?.overdue ?? '—'}</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['', 'Tất cả'], ['GATE_IN', 'Nhập cổng'], ['GATE_OUT', 'Xuất cổng'], ['YARD_ASSIGN', 'Xếp bãi'], ['YARD_OPERATIONS', 'Tác nghiệp bãi'], ['BILLING', 'Phí']] as const).map(([key, label]) =>
      <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }} onPress={() => { setFilter(key); setPage(1); }} style={[fieldStyles.chip, { alignItems: 'center', backgroundColor: filter === key ? theme.colors.infoBackground : theme.colors.surface }]}><Text style={fieldStyles.value}>{label}</Text></TouchableOpacity>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['', 'Mọi ưu tiên'], ['OVERDUE', 'Quá hạn'], ['CRITICAL', 'Sắp đến hạn'], ['HIGH', 'Ưu tiên cao'], ['NORMAL', 'Bình thường']] as const).map(([key,label]) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{selected:urgency === key}} style={fieldStyles.chip} onPress={() => {setUrgency(key);setPage(1);}}><Text style={fieldStyles.value}>{urgency === key ? '✓ ' : ''}{label}</Text></TouchableOpacity>)}</View>
    {feedback ? <Notice message={feedback} /> : null}
    {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void fetchData()} /> : visibleItems.length === 0 ? <Card><EmptyState title="Không có tác vụ cần xử lý" description="Không có việc phù hợp với bộ lọc và quyền trong ca trực." /></Card> : visibleItems.map(task =>
      <TouchableOpacity accessibilityRole="button" key={`${task.type}-${task.entityId}-${task.visitId ?? ''}`} onPress={() => handleOpenTask(task)}>
        <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><StatusBadge label={task.urgency === 'OVERDUE' ? 'QUÁ HẠN' : task.urgency === 'HIGH' ? 'ƯU TIÊN CAO' : 'CHỜ XỬ LÝ'} variant={task.urgency === 'OVERDUE' ? 'danger' : 'info'} /><Text style={fieldStyles.muted}>{task.timeInfo}</Text></View>
          <Text style={{ color: theme.colors.info, fontSize: 12, fontWeight: '700' }}>{task.containerNo}</Text>
          <Text style={fieldStyles.value}>{task.title}</Text>{task.licensePlate ? <Text style={fieldStyles.muted}>Xe: {task.licensePlate}</Text> : null}
          <Text style={fieldStyles.muted}>{task.subtitle}</Text><Text style={{ color: theme.colors.info }}>Mở công việc →</Text>
        </Card>
      </TouchableOpacity>)}
    {pages > 1 ? <View style={{gap:8}}><Text style={fieldStyles.muted}>Trang {page}/{pages}</Text><PrimaryButton title="Trang trước" variant="secondary" disabled={loading || page <= 1} onPress={() => setPage(value => value - 1)} /><PrimaryButton title="Trang sau" variant="secondary" disabled={loading || page >= pages} onPress={() => setPage(value => value + 1)} /></View> : null}
  </ScreenLayout>;
}
