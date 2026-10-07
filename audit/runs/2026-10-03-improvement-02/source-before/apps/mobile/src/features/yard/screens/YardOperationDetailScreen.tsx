import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ScreenLayout, Card, Field, Notice, DetailRow, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionDialog } from '../../../components/ActionDialog';
import { yardApi } from '../api/yard.api';
import type { YardStackParamList } from '../../../navigation/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { mergeInspectionCompletionNotes } from '../api/inspection-notes';
export function YardOperationDetailScreen() {
  const { params } = useRoute<RouteProp<YardStackParamList, 'YardOperationDetail'>>();
  return <YardOperationDetail key={`${params?.operationType}:${params?.operationId}`} />;
}

function YardOperationDetail() {
  const fieldStyles = useFieldStyles();
  const navigation = useNavigation();
  const {params} = useRoute<RouteProp<YardStackParamList,'YardOperationDetail'>>();
    const {user} = useAuth();const [record,setRecord] = useState<Awaited<ReturnType<typeof yardApi.getOperation>> | null>(null);const [loading,setLoading] = useState(true);const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');const [success,setSuccess] = useState('');const [notes,setNotes] = useState('');const [result,setResult] = useState('PASS');
  const [packages,setPackages] = useState('');const [weight,setWeight] = useState('');
  const [action,setAction] = useState<'start'|'complete'|'cancel'|null>(null);
  const [reason,setReason] = useState('');
  const [dialogError,setDialogError] = useState('');
  const load = useCallback(async () => {
    if (!params?.operationId || !params.operationType) {setError('Chọn lệnh tác nghiệp từ danh sách công việc.');setLoading(false);return;}
    setLoading(true);setError('');
    try {setRecord(await yardApi.getOperation(params.operationId,params.operationType));}
    catch(err) {setError(err instanceof Error ? err.message : 'Không tải được lệnh tác nghiệp.');} finally {setLoading(false);}
  },[params?.operationId,params?.operationType]);
  useEffect(() => {void load();},[load]);
  const allowed = hasAnyPermission(user,[params?.operationType === 'MOVEMENT' ? 'yard.move' : params?.operationType === 'INSPECTION' ? 'yard.inspect' : 'yard.booking']);
  const review = (next:'start'|'complete'|'cancel') => {
    setError('');setDialogError('');
    if (next === 'complete' && params.operationType === 'INSPECTION' && result !== 'PASS' && !notes.trim()) {setError('Nhập lý do kết luận Không đạt / Giữ để hoàn tất kiểm định.');return;}
    if (next === 'complete' && params.operationType === 'BOOKING' && ((weight && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) || (packages && (!Number.isInteger(Number(packages)) || Number(packages) < 0)))) {setError('Trọng lượng phải không âm và số kiện phải là số nguyên không âm.');return;}
    setAction(next);
  };
  const execute = async () => {
    if (!params?.operationId || !params.operationType || busy || !allowed || !action || !record) return;
    if (action === 'cancel' && !reason.trim()) {setDialogError('Nhập lý do hủy tác nghiệp.');return;}
    setBusy(true);setError('');setSuccess('');
    try {
      if (action === 'cancel') await yardApi.cancel(params.operationId,params.operationType,reason.trim());
      else if (action === 'complete') {
        if (params.operationType === 'INSPECTION') await yardApi.complete(params.operationId,params.operationType,{result,notes:mergeInspectionCompletionNotes(record.notes,notes)});
        else if (params.operationType === 'BOOKING') {
          await yardApi.complete(params.operationId,params.operationType,{actualPackageCount:packages ? Number(packages) : undefined,actualWeight:weight ? Number(weight) : undefined,conditionNotes:notes.trim() || undefined});
        } else await yardApi.complete(params.operationId,params.operationType);
      } else await yardApi.start(params.operationId,params.operationType);
      const completedAction = action;setAction(null);setReason('');
      await load();setSuccess(completedAction === 'cancel' ? 'Đã hủy tác nghiệp.' : completedAction === 'complete' ? 'Backend đã xác nhận hoàn tất tác nghiệp.' : 'Đã bắt đầu tác nghiệp.');
    } catch(err) {setDialogError(err instanceof Error ? err.message : 'Không thực hiện được tác nghiệp.');} finally {setBusy(false);}
  };
  return <ScreenLayout title={params?.operationType === 'INSPECTION' ? 'Giám định hiện trường' : 'Tác nghiệp bãi'} subtitle={record?.containerVisit?.container?.containerNumber} onBack={() => navigation.goBack()}>
    {loading ? <LoadingState /> : !record ? <ErrorState message={error} onRetry={() => void load()} /> : <>
      <Card title={record.containerVisit?.container?.containerNumber}><StatusBadge label={record.status} variant="info" /><DetailRow label="Loại lệnh" value={record.inspectionType === 'DAMAGE_SURVEY' ? 'Giám định hư hỏng' : record.inspectionType || record.bookingType || 'Đảo chuyển'} />{params?.operationType === 'MOVEMENT' ? <><DetailRow label="Vị trí đi" value={record.fromSlot?.slotCode} /><DetailRow label="Vị trí đến" value={record.toSlot?.slotCode} /></> : null}<DetailRow label="Ghi chú" value={record.notes || record.conditionNotes || record.reason} /></Card>
      {error ? <Notice message={error} /> : null}{success ? <Notice message={success} success /> : null}
      {record.result ? <Card title="Kết quả đã ghi nhận"><DetailRow label="Kết luận" value={record.result === 'PASS' ? 'Đạt' : record.result === 'FAIL' ? 'Không đạt' : 'Giữ (HOLD)'} />{record.result === 'HOLD' ? <Notice message="Container đang bị chặn cấp phiếu ra cổng do kết quả HOLD. Liên hệ điều hành để xử lý." /> : null}</Card> : null}
      {params.operationType === 'BOOKING' ? <Card title="Thông tin lịch tác nghiệp"><DetailRow label="Lịch thực hiện" value={record.scheduledAt ? new Date(record.scheduledAt).toLocaleString('vi-VN') : undefined} /><DetailRow label="Số kiện thực tế" value={record.actualPackageCount} /><DetailRow label="Trọng lượng thực tế (kg)" value={record.actualWeight} /></Card> : null}
      {allowed && record.status === 'PENDING' ? <PrimaryButton requiresOnline title="Bắt đầu tác nghiệp" onPress={() => review('start')} loading={busy} /> : null}
      {allowed && record.status === 'IN_PROGRESS' ? <>
        {params?.operationType === 'INSPECTION' ? <Card title="Kết quả kiểm định"><View style={{flexDirection:'row',gap:8}}>{[['PASS','Đạt'],['FAIL','Không đạt'],['HOLD','Giữ']] .map(([code,label]) => <TouchableOpacity key={code} accessibilityRole="button" onPress={() => setResult(code)} style={[fieldStyles.chip,{flex:1}]}><Text style={fieldStyles.value}>{result === code ? '✓ ' : ''}{label}</Text></TouchableOpacity>)}</View><Field label="Ghi chú kiểm định" value={notes} onChangeText={setNotes} multiline /></Card> : null}
        {params?.operationType === 'BOOKING' ? <Card title="Kết quả thực tế"><Field label="Số kiện" value={packages} onChangeText={setPackages} keyboardType="numeric" /><Field label="Trọng lượng (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" /><Field label="Ghi chú" value={notes} onChangeText={setNotes} multiline /></Card> : null}
        <PrimaryButton requiresOnline title="Xác nhận hoàn tất" onPress={() => review('complete')} loading={busy} />
      </> : null}
      {allowed && ['PENDING','IN_PROGRESS'].includes(record.status) ? <PrimaryButton requiresOnline title="Hủy tác nghiệp" variant="danger" onPress={() => review('cancel')} disabled={busy} /> : null}
      <ActionDialog requiresOnline visible={!!action} title={action === 'cancel' ? 'Hủy tác nghiệp' : action === 'complete' ? 'Xác nhận hoàn tất' : 'Bắt đầu tác nghiệp'} message={record.containerVisit?.container.containerNumber} danger={action === 'cancel' || (action === 'complete' && result === 'HOLD' && params.operationType === 'INSPECTION')} busy={busy} confirmLabel={action === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận'} onClose={() => setAction(null)} onConfirm={() => void execute()}>
        {action === 'cancel' ? <Field label="Lý do hủy*" value={reason} onChangeText={setReason} multiline editable={!busy} /> : <Text style={fieldStyles.value}>{action === 'start' ? 'Xác nhận bắt đầu thực hiện lệnh này?' : params.operationType === 'MOVEMENT' ? 'Container đã đến đúng vị trí '+record.toSlot?.slotCode+'?' : params.operationType === 'INSPECTION' ? 'Kết luận: '+({PASS:'Đạt',FAIL:'Không đạt',HOLD:'Giữ — chặn cấp phiếu ra cổng'}[result] || result)+'\n'+notes : 'Số kiện: '+(packages || 'Chưa ghi nhận')+' · Trọng lượng: '+(weight || 'Chưa ghi nhận')+' kg\n'+notes}</Text>}
        {dialogError ? <Notice message={dialogError} /> : null}
      </ActionDialog>
    </>}
  </ScreenLayout>;
}
