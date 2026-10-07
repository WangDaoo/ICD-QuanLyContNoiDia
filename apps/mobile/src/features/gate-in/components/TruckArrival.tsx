import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionDialog } from '../../../components/ActionDialog';
import { Field, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useApiConnection } from '../../../services/api/ApiConnectionProvider';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { gateInApi, type TruckVisitSummary } from '../api/gate-in.api';

export function TruckArrival({ onArrived }: { onArrived: () => void }) {
  const { user } = useAuth();
  const { online } = useApiConnection();
  const styles = useFieldStyles();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lane, setLane] = useState('');
  const [trucks, setTrucks] = useState<TruckVisitSummary[]>([]);
  const [selected, setSelected] = useState<TruckVisitSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  if (
    !hasAnyPermission(user, ['truck_visit.read']) ||
    !hasAnyPermission(user, ['truck_visit.arrive'])
  )
    return null;
  const search = async () => {
    if (!query.trim()) {
      setMessage('Nhập biển số hoặc mã chuyến xe cần tiếp nhận.');
      setSuccess(false);
      return;
    }
    setBusy(true);
    setMessage('');
    setSuccess(false);
    setTrucks([]);
    try {
      const result = await gateInApi.searchScheduledTrucks(query.trim());
      setTrucks(result.data);
      if (!result.data.length) setMessage('Không tìm thấy chuyến xe đang chờ đến cổng.');
      else if (result.meta.total > result.data.length)
        setMessage('Hiển thị 20 kết quả đầu. Nhập biển số đầy đủ để thu hẹp.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không tải được chuyến xe.');
    } finally {
      setBusy(false);
    }
  };
  const arrive = async () => {
    if (!selected || busy || online === false) return;
    setBusy(true);
    setMessage('');
    setSuccess(false);
    try {
      await gateInApi.arriveTruck(selected.id, lane);
      setTrucks((rows) => rows.filter((row) => row.id !== selected.id));
      setSelected(null);
      setSuccess(true);
      setMessage('Đã ghi nhận xe đến cổng. Có thể tiếp nhận container thuộc chuyến xe.');
      onArrived();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể ghi nhận xe đến cổng.');
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <PrimaryButton
        variant="secondary"
        title={open ? 'Ẩn tiếp nhận chuyến xe' : 'Ghi nhận xe đến cổng'}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          <Field
            label="Biển số / mã chuyến xe"
            value={query}
            onChangeText={setQuery}
            editable={!busy}
            placeholder="Tìm chuyến xe đã lên lịch"
          />
          <PrimaryButton title="Tìm chuyến xe" onPress={() => void search()} loading={busy} />
          <Field
            label="Làn cổng (không bắt buộc)"
            value={lane}
            onChangeText={setLane}
            editable={!busy}
            maxLength={50}
          />
          {trucks.map((truck) => (
            <View key={truck.id} style={{ gap: 4 }}>
              <Text style={styles.value}>
                {truck.vehiclePlate} · {truck.driverName}
              </Text>
              <Text style={styles.muted}>{truck.visitCode} · Chờ đến cổng</Text>
              <PrimaryButton
                variant="secondary"
                title={`Xe ${truck.vehiclePlate} đã đến`}
                disabled={busy}
                onPress={() => setSelected(truck)}
              />
            </View>
          ))}
          {message ? <Notice message={message} success={success} /> : null}
        </>
      ) : null}
      <ActionDialog
        requiresOnline
        visible={!!selected}
        title="Xác nhận xe đã đến cổng"
        message={`${selected?.vehiclePlate || ''} · ${selected?.driverName || ''}\nChỉ xác nhận khi xe đã có mặt tại cổng.`}
        confirmLabel="Ghi nhận đã đến"
        busy={busy}
        onConfirm={() => void arrive()}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}
