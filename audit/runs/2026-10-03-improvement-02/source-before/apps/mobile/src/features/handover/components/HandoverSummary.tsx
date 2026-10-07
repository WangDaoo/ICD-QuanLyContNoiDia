import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, DetailRow, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ActionDialog } from '../../../components/ActionDialog';
import { handoverApi } from '../api/handover.api';
import type { HandoverRecord, HandoverDetail } from '../api/handover.api';
export function HandoverSummary({ handover }: { handover: HandoverRecord | null }) {
  const styles = useFieldStyles();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<HandoverDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function showDetail() {
    if (!handover) return;
    setOpen(true); setBusy(true); setError(''); setDetail(null);
    try { setDetail(await handoverApi.detail(handover.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tải được lịch sử bàn giao.'); }
    finally { setBusy(false); }
  }
  return <Card title="Bàn giao vận tải">
    {handover ? <><DetailRow label="Mã vận tải" value={handover.transportCode} /><DetailRow label="Trạng thái" value={handover.status} /><DetailRow label="Đối tác" value={handover.partnerName} /><DetailRow label="Dự kiến giao" value={handover.expectedDeliveryAt ? new Date(handover.expectedDeliveryAt).toLocaleString('vi-VN') : undefined} /><PrimaryButton title="Xem lịch sử bàn giao" variant="secondary" onPress={() => void showDetail()} /></> : <Text style={styles.muted}>Chưa có hồ sơ bàn giao.</Text>}
    <ActionDialog visible={open} title="Lịch sử bàn giao" confirmLabel="Đóng" onConfirm={() => setOpen(false)} onClose={() => setOpen(false)}>
      {busy ? <Text style={styles.muted}>Đang tải lịch sử…</Text> : error ? <><Notice message={error} /><PrimaryButton title="Thử lại" onPress={() => void showDetail()} /></> : detail ? <>
        <DetailRow label="Kho nhận" value={detail.warehouse?.name} /><DetailRow label="Địa chỉ" value={detail.warehouse?.address} />
        {detail.confirmations.length ? detail.confirmations.map(item => <View key={item.id} style={{ gap: 6 }}><Text style={styles.value}>{item.confirmationType}</Text><Text style={styles.muted}>{new Date(item.confirmedAt).toLocaleString('vi-VN')}</Text><DetailRow label="Người nhận" value={item.receiverName} /><DetailRow label="Tình trạng" value={item.condition} />{item.note ? <Text style={styles.value}>{item.note}</Text> : null}</View>) : <Text style={styles.muted}>Chưa có xác nhận từ đối tác.</Text>}
      </> : null}
    </ActionDialog>
  </Card>;
}
