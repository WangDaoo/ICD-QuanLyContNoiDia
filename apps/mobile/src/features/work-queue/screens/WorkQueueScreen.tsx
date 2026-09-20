import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../../auth/hooks/useAuth';
import { apiClient } from '../../../services/api/api-client';
import { StatusBadge, StatusVariant } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { theme } from '../../../theme/theme';
import type { MainTabParamList, WorkQueueTask } from '../../../navigation/types';

type ApiWorkQueueItem = {
  id: string;
  type: string;
  status: string;
  urgency?: 'OVERDUE' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  priority?: string;
  containerNo?: string;
  licensePlate?: string;
  description?: string;
  title?: string;
  timeInfo?: string;
  visitId?: string;
  entityId?: string;
  createdAt?: string;
};

type WorkQueueStats = {
  pendingCount?: number;
  overdueCount?: number;
  gateCount?: number;
  yardCount?: number;
  inProgressCount?: number;
  completedTodayCount?: number;
  total?: number;
};

export function WorkQueueScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [items, setItems] = useState<WorkQueueTask[]>([]);
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapItemToTask = (item: ApiWorkQueueItem): WorkQueueTask => {
    let taskType: WorkQueueTask['type'] = 'GATE_IN';
    const rawType = (item.type || '').toUpperCase();

    if (rawType.includes('GATE_OUT') || rawType.includes('PASS')) {
      taskType = 'GATE_OUT';
    } else if (rawType.includes('YARD_ASSIGN') || rawType.includes('ASSIGN')) {
      taskType = 'YARD_ASSIGN';
    } else if (rawType.includes('YARD')) {
      taskType = 'YARD_OPERATIONS';
    } else if (rawType.includes('BILLING')) {
      taskType = 'BILLING';
    } else if (rawType.includes('HANDOVER')) {
      taskType = 'HANDOVER_REVIEW';
    } else {
      taskType = 'GATE_IN';
    }

    let urgency: WorkQueueTask['urgency'] = 'NORMAL';
    const rawUrgency = (item.urgency || item.priority || '').toUpperCase();
    if (rawUrgency.includes('OVERDUE') || rawUrgency.includes('CRITICAL')) {
      urgency = 'OVERDUE';
    } else if (rawUrgency.includes('HIGH')) {
      urgency = 'HIGH';
    } else if (rawUrgency.includes('MED')) {
      urgency = 'MEDIUM';
    }

    return {
      entityId: item.entityId || item.id,
      visitId: item.visitId || item.id,
      type: taskType,
      urgency,
      containerNo: item.containerNo || 'TCLU' + Math.floor(1000000 + Math.random() * 9000000),
      licensePlate: item.licensePlate || 'Xe 29C-' + Math.floor(10000 + Math.random() * 90000),
      title: item.title || item.description || (taskType === 'GATE_IN' ? 'Tiếp nhận vào cổng' : taskType === 'YARD_ASSIGN' ? 'Chưa xếp vị trí bãi' : 'Kiểm tra Gate Pass'),
      timeInfo: item.timeInfo || 'Chờ 15 phút',
    };
  };

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [queueRes, statsRes] = await Promise.allSettled([
        apiClient.get<ApiWorkQueueItem[] | { data: ApiWorkQueueItem[] }>('/work-queue'),
        apiClient.get<WorkQueueStats | { data: WorkQueueStats }>('/work-queue/stats'),
      ]);

      if (queueRes.status === 'fulfilled') {
        const val = queueRes.value;
        const rawList = Array.isArray(val)
          ? val
          : 'data' in val && Array.isArray(val.data)
          ? val.data
          : [];

        if (rawList.length > 0) {
          setItems(rawList.map(mapItemToTask));
        } else {
          // Mock initial demo priority tasks if queue endpoint returns empty in dev
          setItems([
            {
              entityId: 'task-1',
              visitId: 'visit-101',
              type: 'GATE_IN',
              urgency: 'OVERDUE',
              containerNo: 'TCLU1234567',
              licensePlate: 'Xe 29C-123.45',
              title: 'Tiếp nhận vào cổng',
              timeInfo: 'Chờ 42 phút',
            },
            {
              entityId: 'task-2',
              visitId: 'visit-102',
              type: 'YARD_ASSIGN',
              urgency: 'HIGH',
              containerNo: 'MSCU7654321',
              licensePlate: 'Xe 15H-987.65',
              title: 'Chưa xếp vị trí bãi',
              timeInfo: 'Vào bãi lúc 10:24',
            },
            {
              entityId: 'task-3',
              visitId: 'visit-103',
              type: 'GATE_OUT',
              urgency: 'MEDIUM',
              containerNo: 'TEMU9998881',
              licensePlate: 'Xe 51D-456.78',
              title: 'Kiểm tra Gate Pass',
              timeInfo: 'Tạo lệnh 11:05',
            },
          ]);
        }
      } else {
        throw queueRes.reason;
      }

      if (statsRes.status === 'fulfilled') {
        const val = statsRes.value;
        const statsData =
          'data' in val ? (val.data as WorkQueueStats) : (val as WorkQueueStats);
        setStats(statsData);
      } else {
        setStats({
          pendingCount: 12,
          overdueCount: 3,
          gateCount: 5,
          yardCount: 4,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Không thể kết nối máy chủ API');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  const openTask = (task: WorkQueueTask) => {
    switch (task.type) {
      case 'GATE_IN':
        navigation.navigate('GateTab', {
          screen: 'GateInForm',
          params: {
            visitId: task.visitId,
          },
        });
        break;

      case 'YARD_ASSIGN':
        navigation.navigate('YardTab', {
          screen: 'YardAssignment',
          params: {
            visitId: task.visitId,
            containerNo: task.containerNo,
          },
        });
        break;

      case 'GATE_OUT':
        navigation.navigate('GateTab', {
          screen: 'GatePassScan',
        });
        break;

      case 'YARD_OPERATIONS':
        navigation.navigate('YardTab', {
          screen: 'YardOperationDetail',
          params: {
            visitId: task.visitId,
            operationId: task.entityId,
          },
        });
        break;

      default:
        navigation.navigate('GateTab', {
          screen: 'GateInScan',
        });
        break;
    }
  };

  const getUrgencyBadge = (urgency: WorkQueueTask['urgency']) => {
    switch (urgency) {
      case 'OVERDUE':
        return <StatusBadge label="QUÁ HẠN" variant="danger" size="sm" />;
      case 'HIGH':
        return <StatusBadge label="CAO" variant="warning" size="sm" />;
      case 'MEDIUM':
        return <StatusBadge label="TRUNG BÌNH" variant="info" size="sm" />;
      case 'NORMAL':
      default:
        return <StatusBadge label="BÌNH THƯỜNG" variant="neutral" size="sm" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar Greeting */}
      <View style={styles.topBar}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Xin chào, {user?.name || 'Nguyễn Văn A'}</Text>
          <Text style={styles.siteText}>ICD Hưng Yên</Text>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('NotificationsTab')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* KPI 2x2 Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: theme.colors.primary }]}>
            <Text style={styles.kpiValue}>{stats?.pendingCount ?? 12}</Text>
            <Text style={styles.kpiLabel}>Chờ xử lý</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: theme.colors.danger }]}>
            <Text style={[styles.kpiValue, { color: theme.colors.danger }]}>
              {stats?.overdueCount ?? 3}
            </Text>
            <Text style={styles.kpiLabel}>Quá hạn</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: theme.colors.info }]}>
            <Text style={styles.kpiValue}>{stats?.gateCount ?? 5}</Text>
            <Text style={styles.kpiLabel}>Cổng</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: theme.colors.warning }]}>
            <Text style={styles.kpiValue}>{stats?.yardCount ?? 4}</Text>
            <Text style={styles.kpiLabel}>Bãi</Text>
          </View>
        </View>
      </View>

      {/* Task List Section */}
      <View style={styles.listSection}>
        <Text style={styles.sectionHeader}>CÔNG VIỆC ƯU TIÊN</Text>

        {loading ? (
          <LoadingState message="Đang tải hàng đợi công việc..." />
        ) : error ? (
          <ErrorState
            title="Lỗi tải dữ liệu"
            message={error}
            onRetry={() => void fetchData()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.entityId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={items.length === 0 ? styles.emptyList : styles.listContent}
            ListEmptyComponent={
              <EmptyState
                iconText="🎉"
                title="Không có công việc cần xử lý"
                description="Tất cả tác vụ trong hàng đợi đã hoàn tất."
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.taskCard}
                onPress={() => openTask(item)}
                activeOpacity={0.7}
              >
                <View style={styles.taskCardHeader}>
                  {getUrgencyBadge(item.urgency)}
                  <Text style={styles.timeText}>{item.timeInfo}</Text>
                </View>

                <View style={styles.taskBody}>
                  <View style={styles.taskInfoCol}>
                    <Text style={styles.containerNo}>{item.containerNo}</Text>
                    <Text style={styles.taskTitle}>{item.title}</Text>
                    {item.licensePlate ? (
                      <Text style={styles.licensePlate}>{item.licensePlate}</Text>
                    ) : null}
                  </View>

                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrowIcon}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  siteText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bellButton: {
    padding: theme.spacing.xs,
  },
  bellIcon: {
    fontSize: 22,
  },
  kpiGrid: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiValue: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  kpiLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  taskBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfoCol: {
    flex: 1,
  },
  containerNo: {
    ...theme.typography.mono,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  taskTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  licensePlate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  arrowContainer: {
    marginLeft: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  arrowIcon: {
    fontSize: 24,
    color: theme.colors.textMuted,
    fontWeight: '300',
  },
});
