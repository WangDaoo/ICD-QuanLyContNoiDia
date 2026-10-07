import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingState } from '../../../components/LoadingState';
import { ActionDialog } from '../../../components/ActionDialog';
import { apiClient } from '../../../services/api/api-client';
import type { RootStackParamList } from '../../../navigation/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { canOpenNotificationTarget, getNotificationTarget } from '../notification-target';
import { createNotificationApi, NOTIFICATION_TYPES } from '../api/notification.api';
import type { NotificationRecord } from '../api/notification.api';
import { presentNotification } from '../notification-presentation';
const api = createNotificationApi(apiClient);
export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const styles = useFieldStyles();
  const request = useRef(0);
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<NotificationRecord | null>(null);
  const [targetMessage, setTargetMessage] = useState('');
  const load = useCallback(async () => {
    const ticket = ++request.current;
    setLoading(true); setError(''); setUnreadCount(null); setRows([]); setPages(0);
    try {
      const response = await api.history({page, type, unreadOnly});
      if (ticket !== request.current) return;
      if (page > Math.max(1, response.meta.totalPages)) { setPage(Math.max(1, response.meta.totalPages)); return; }
      setRows(response.data); setPages(response.meta.totalPages); setUnreadCount(response.meta.unreadCount);
    } catch (err) { if (ticket === request.current) setError(err instanceof Error ? err.message : 'Không tải được thông báo.'); }
    finally { if (ticket === request.current) setLoading(false); }
  }, [page, type, unreadOnly]);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const markRead = async (row?: NotificationRecord) => {
    setBusy(row?.id ?? 'all'); setError('');
    try {
      if (row) { await api.read(row.id); setSelected(current => current?.id === row.id ? {...current, readAt: new Date().toISOString()} : current); }
      else { await api.readAll(); setSelected(current => current ? {...current, readAt: new Date().toISOString()} : current); }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa đánh dấu đã đọc.'); }
    finally { setBusy(''); }
  };
  const openTarget = () => {
    const target = selected ? getNotificationTarget(selected) : null;
    const canOpen = target ? canOpenNotificationTarget(target, user?.permissionCodes ?? []) : false;
    if (target?.kind === 'container' && canOpen) { setSelected(null); navigation.navigate('Main', {screen:'LookupTab',params:{screen:'ContainerDetail',params:{visitId:target.id}}}); return; }
    if (target?.kind === 'gate-in' && canOpen) { setSelected(null); navigation.navigate('Main',{screen:'GateTab',params:{screen:'GateInForm',params:{visitId:target.id}}}); return; }
    if (target?.kind === 'inspection' && canOpen) { setSelected(null); navigation.navigate('Main',{screen:'YardTab',params:{screen:'YardOperationDetail',params:{operationId:target.id,operationType:'INSPECTION'}}}); return; }
    setTargetMessage(target ? 'Tài khoản chưa có quyền mở tác nghiệp này.' : 'Thông báo này chưa có màn hình tác nghiệp phù hợp trên mobile.');
  };
  const selectedPresentation = selected ? presentNotification(selected) : null;
  return <ScreenLayout title="Thông báo" onBack={() => navigation.goBack()} onRefresh={() => void load()} refreshing={loading}>
    <Text accessibilityLiveRegion="polite" style={styles.value}>{unreadCount === null ? (loading ? 'Đang tải số thông báo chưa đọc...' : 'Chưa tải được số thông báo chưa đọc') : `Chưa đọc: ${unreadCount}`}</Text>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>{([['', 'Tất cả loại'], ...NOTIFICATION_TYPES] as const).map(([value,label]) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{selected:type === value}} style={styles.chip} onPress={() => {setType(value);setPage(1);}}><Text style={styles.value}>{type === value ? '✓ ' : ''}{label}</Text></TouchableOpacity>)}</View>
    <PrimaryButton title={unreadOnly ? '✓ Chỉ chưa đọc' : 'Chỉ chưa đọc'} variant="secondary" onPress={() => {setUnreadOnly(value => !value);setPage(1);}} />
    <PrimaryButton requiresOnline title="Đánh dấu tất cả đã đọc" variant="secondary" disabled={!!busy || loading || unreadCount === null || unreadCount === 0} loading={busy === 'all'} onPress={() => void markRead()} />
    {error ? <><Notice message={error} /><PrimaryButton title="Thử lại" onPress={() => void load()} /></> : null}
    {loading ? <LoadingState /> : !error && rows.length === 0 ? <EmptyState title="Không có thông báo phù hợp" description="Thử thay đổi bộ lọc hoặc tải lại." /> : rows.map(row => <Card key={row.id} title={presentNotification(row).title}>
      <Text style={styles.value}>{presentNotification(row).body}</Text><Text style={styles.muted}>{new Date(row.createdAt).toLocaleString('vi-VN')} · {row.readAt ? 'Đã đọc' : 'Chưa đọc'}</Text>
      <PrimaryButton title="Xem chi tiết thông báo" variant="secondary" onPress={() => {setSelected(row);setTargetMessage('');}} />
    </Card>)}
    {pages > 1 ? <View style={{gap:8}}><Text style={styles.muted}>Trang {page}/{pages}</Text><PrimaryButton title="Trang trước" variant="secondary" disabled={loading || page <= 1} onPress={() => setPage(value => value - 1)} /><PrimaryButton title="Trang sau" variant="secondary" disabled={loading || page >= pages} onPress={() => setPage(value => value + 1)} /></View> : null}
    <ActionDialog visible={!!selected} title={selectedPresentation?.title ?? 'Chi tiết thông báo'} onClose={() => setSelected(null)}>
      {selected ? <><Text style={styles.value}>{selectedPresentation?.body}</Text><Text style={styles.muted}>{new Date(selected.createdAt).toLocaleString('vi-VN')}</Text>{targetMessage ? <Notice message={targetMessage} /> : null}{error ? <Notice message={error} /> : null}{!selected.readAt ? <PrimaryButton requiresOnline title="Đánh dấu đã đọc" disabled={!!busy} loading={busy === selected.id} onPress={() => void markRead(selected)} /> : <Text style={styles.muted}>Đã đọc</Text>}<PrimaryButton title="Mở tác nghiệp liên quan" variant="secondary" onPress={openTarget} /></> : null}
    </ActionDialog>
  </ScreenLayout>;
}
