import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenLayout, Card, Field, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { SelectField } from '../../../components/SelectField';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ActionDialog } from '../../../components/ActionDialog';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import type { YardStackParamList } from '../../../navigation/types';
import { yardApi, type OperationType, type YardOperation, type BookingType } from '../api/yard.api';
import type { ContainerRecord } from '../../containers/api/container.api';

export function YardOperationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const {params} = useRoute<RouteProp<YardStackParamList,'YardOperations'>>();
  const {user} = useAuth(); const styles = useFieldStyles();
  const request = useRef(0);
  const [type,setType] = useState<OperationType>('MOVEMENT');
  const [status,setStatus] = useState('ALL');
  const [rows,setRows] = useState<YardOperation[]>([]);
  const [containers,setContainers] = useState<ContainerRecord[]>([]);
  const [visitId,setVisitId] = useState(params?.visitId || '');
  const [bookingType,setBookingType] = useState<BookingType>('STRIPPING');
  const [scheduledAt,setScheduledAt] = useState(''); const [notes,setNotes] = useState('');
  const [loading,setLoading] = useState(false);const [busy,setBusy] = useState(false);const [error,setError] = useState('');
  const [confirm,setConfirm] = useState(false);
  const canBook = hasAnyPermission(user,['yard.booking']) && hasAnyPermission(user,['container.read']);
  const load = useCallback(async () => {
    if (!hasAnyPermission(user,['yard.read'])) return;
    const ticket = ++request.current;
    setLoading(true);setError('');
    try {
      const [operations, visits] = await Promise.all([yardApi.operations(type,params?.visitId), canBook ? yardApi.containers() : Promise.resolve({data:[]})]);
      if (ticket !== request.current) return;
      setRows(operations.data);setContainers(visits.data);
    }
    catch(err) {if (ticket === request.current) setError(err instanceof Error ? err.message : 'Không tải được lệnh tác nghiệp.');}
    finally {if (ticket === request.current) setLoading(false);}
  },[type,params?.visitId,user,canBook]);
  useFocusEffect(useCallback(() => {void load();return () => {request.current++;};},[load]));
  const parsedDate = () => {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(scheduledAt)) return null;
    const date = new Date(scheduledAt.replace(' ','T')+':00+07:00');
    if (!Number.isFinite(date.getTime())) return null;
    const local = new Date(date.getTime()+7*3600000).toISOString().slice(0,16).replace('T',' ');
    return local === scheduledAt ? date : null;
  };
  const review = () => {
    setError('');
    if (!visitId || !parsedDate()) {setError('Chọn container và nhập lịch đúng dạng YYYY-MM-DD HH:mm (giờ Việt Nam).');return;}
    setConfirm(true);
  };
  const create = async () => {
    const date = parsedDate();if (!canBook || busy || !visitId || !date) return;
    setBusy(true);setError('');
    try {const operation = await yardApi.createBooking(visitId,{bookingType,scheduledAt:date.toISOString(),conditionNotes:notes.trim() || undefined});setConfirm(false);setNotes('');navigation.navigate('YardOperationDetail',{operationId:operation.id,operationType:'BOOKING',visitId});}
    catch(err) {setError(err instanceof Error ? err.message : 'Không tạo được lịch tác nghiệp.');}
    finally {setBusy(false);}
  };
  return <ScreenLayout title="Danh sách tác nghiệp bãi" subtitle={params?.containerNo} onBack={() => navigation.goBack()} onRefresh={() => void load()} refreshing={loading}>
    <Card title="Tra cứu lệnh">
      <SelectField label="Loại tác nghiệp" value={type} options={[{value:'MOVEMENT',label:'Đảo chuyển'},{value:'INSPECTION',label:'Giám định'},{value:'BOOKING',label:'Dịch vụ tại bãi'}]} onChange={value => {request.current++;setRows([]);setType(value as OperationType);}} />
      <SelectField label="Trạng thái" value={status} options={[{value:'ALL',label:'Tất cả'},{value:'PENDING',label:'Chờ thực hiện'},{value:'IN_PROGRESS',label:'Đang thực hiện'},{value:'COMPLETED',label:'Hoàn tất'},{value:'CANCELLED',label:'Đã hủy'}]} onChange={setStatus} />
      {error && !confirm ? <Notice message={error} /> : null}
      {!loading && !rows.some(row => status === 'ALL' || row.status === status) ? <Text style={styles.muted}>Không có tác nghiệp phù hợp.</Text> : null}
      {rows.filter(row => status === 'ALL' || row.status === status).map(row => <TouchableOpacity key={row.id} accessibilityRole="button" onPress={() => navigation.navigate('YardOperationDetail',{operationId:row.id,operationType:type,visitId:row.containerVisitId})} style={{paddingVertical:12,gap:6}}><Text style={styles.value}>{row.containerVisit?.container.containerNumber || row.id}</Text><StatusBadge label={row.status} /><Text style={styles.muted}>{row.inspectionType || row.bookingType || `${row.fromSlot?.slotCode || '—'} → ${row.toSlot?.slotCode || '—'}`}</Text></TouchableOpacity>)}
    </Card>
    {canBook ? <Card title="Đặt lịch dịch vụ tại bãi">
      <SelectField label="Container đang ở bãi*" value={visitId} options={containers.map(row => ({value:row.id,label:row.container.containerNumber}))} onChange={setVisitId} disabled={busy} />
      <SelectField label="Dịch vụ*" value={bookingType} options={[{value:'STRIPPING',label:'Rút hàng'},{value:'STUFFING',label:'Đóng hàng'},{value:'INSPECTION',label:'Kiểm tra'}]} onChange={value => setBookingType(value as BookingType)} disabled={busy} />
      <Field label="Lịch thực hiện (giờ Việt Nam)*" placeholder="2026-10-02 09:30" value={scheduledAt} onChangeText={setScheduledAt} editable={!busy} />
      <Field label="Ghi chú điều kiện" value={notes} onChangeText={setNotes} multiline editable={!busy} />
      <PrimaryButton requiresOnline title="Tạo lịch tác nghiệp" onPress={review} disabled={!visitId || busy} />
    </Card> : null}
    <ActionDialog requiresOnline visible={confirm} title="Xác nhận lịch tác nghiệp" busy={busy} onClose={() => setConfirm(false)} onConfirm={() => void create()} confirmLabel="Tạo lịch"><Text style={styles.value}>{containers.find(row => row.id === visitId)?.container.containerNumber} · {bookingType}{'\n'}{scheduledAt} (UTC+7){'\n'}{notes}</Text>{error ? <Notice message={error} /> : null}</ActionDialog>
  </ScreenLayout>;
}
