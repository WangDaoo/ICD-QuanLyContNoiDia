import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Camera, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScreenLayout,
  Card,
  Field,
  Notice,
  useFieldStyles,
} from '../../../components/ScreenLayout';
import { SelectField } from '../../../components/SelectField';
import { ActionDialog } from '../../../components/ActionDialog';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { displayCode } from '../../../presentation/labels';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { containerApi } from '../../containers/api/container.api';
import { yardApi, type InspectionRecord } from '../api/yard.api';
import { getInspectionDisplay } from '../inspection-display';
import type { YardStackParamList } from '../../../navigation/types';

export function SurveyHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useFieldStyles();
  const [containerNo, setContainerNo] = useState('');
  const [notes, setNotes] = useState('');
  const [inspectionType, setInspectionType] = useState('DAMAGE_SURVEY');
  const [confirm, setConfirm] = useState(false);
  const [severity, setSeverity] = useState('Nhẹ');
  const [rows, setRows] = useState<InspectionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRequest = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ containerNo?: string; notes?: string }>({});
  const [success, setSuccess] = useState('');
  const canInspect = hasAnyPermission(user, ['yard.inspect']);
  const load = useCallback(async () => {
    if (!hasAnyPermission(user, ['yard.read'])) { setRows([]); setHistoryLoading(false); return; }
    const ticket = ++historyRequest.current;
    setHistoryLoading(true); setHistoryError('');
    try {
      const data = await yardApi.inspections();
      if (ticket !== historyRequest.current) return;
      setRows(data); setHistoryLoaded(true);
    } catch (err) {
      if (ticket === historyRequest.current) setHistoryError(err instanceof Error ? err.message : 'Không tải được biên bản.');
    } finally { if (ticket === historyRequest.current) setHistoryLoading(false); }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => { historyRequest.current++; };
    }, [load]),
  );
  const validateFields = () => {
    const next = { containerNo: containerNo.trim() ? undefined : 'Nhập số container.', notes: notes.trim() ? undefined : 'Nhập nội dung ghi nhận.' };
    setFieldErrors(next);
    return !next.containerNo && !next.notes;
  };
  const submit = async () => {
    if (busy || !canInspect) return;
    setError('');
    setSuccess('');
    if (!validateFields()) return;
    setBusy(true);
    try {
      const response = await containerApi.search(containerNo.trim().toUpperCase());
      const matches = response.data.filter(
        (row) =>
          row.container.containerNumber === containerNo.trim().toUpperCase() &&
          row.state === 'IN_YARD',
      );
      if (matches.length !== 1)
        throw new Error('Cần một lượt container đang ở bãi để ghi nhận giám định.');
      await yardApi.requestInspection(matches[0].id, {
        inspectionType,
        notes:
          (inspectionType === 'DAMAGE_SURVEY' ? 'Mức độ: ' + severity + '. ' : '') + notes.trim(),
      });
      setConfirm(false);
      setSuccess('Đã gửi yêu cầu giám định. Mở biên bản bên dưới để bắt đầu và xác nhận kết quả.');
      setNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được biên bản.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenLayout title="Giám định hiện trường" onRefresh={() => void load()} refreshing={historyLoading}>
      <Card title="Biên bản giám định hiện trường">
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Camera size={16} color={theme.colors.warning} />
          <Text style={styles.muted}>Ghi nhận tình trạng thực tế của container và seal</Text>
        </View>
        <SelectField
          label="Loại giám định"
          value={inspectionType}
          options={[
            { value: 'DAMAGE_SURVEY', label: 'Giám định hư hỏng' },
            { value: 'SEAL_CHECK', label: 'Kiểm tra seal' },
            { value: 'CONDITION_SURVEY', label: 'Kiểm tra tình trạng' },
          ]}
          onChange={setInspectionType}
          disabled={busy}
        />
        <Field
          label="Số Container*"
          value={containerNo}
          onChangeText={value => { setContainerNo(value); setFieldErrors(current => ({ ...current, containerNo: value.trim() ? undefined : current.containerNo })); }}
          error={fieldErrors.containerNo}
          autoCapitalize="characters"
          placeholder="VD: MSCU6639870"
          editable={!busy}
        />
        <Field
          label="Nội dung ghi nhận*"
          value={notes}
          onChangeText={value => { setNotes(value); setFieldErrors(current => ({ ...current, notes: value.trim() ? undefined : current.notes })); }}
          error={fieldErrors.notes}
          multiline
          placeholder="Nhập nội dung ghi nhận thực tế..."
          editable={!busy}
        />
        {inspectionType === 'DAMAGE_SURVEY' ? <><Text style={styles.label}>Mức độ hư hỏng</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {['Nhẹ', 'Trung bình', 'Nặng'].map((label) => (
            <TouchableOpacity
              key={label}
              accessibilityRole="radio"
              accessibilityLabel={'Mức độ hư hỏng: ' + label}
              accessibilityState={{ checked: severity === label }}
              disabled={busy}
              onPress={() => setSeverity(label)}
              style={[
                styles.chip,
                {
                  flex: 1,
                  minWidth: 80,
                  alignItems: 'center',
                  borderColor: severity === label ? theme.colors.warning : theme.colors.borderDark,
                  backgroundColor:
                    severity === label
                      ? theme.colors.warningBackground
                      : theme.colors.surfaceSubtle,
                },
              ]}
            >
              <Text style={styles.value}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View></> : null}
        {error ? <Notice message={error} /> : null}
        {success ? <Notice message={success} success /> : null}
        <PrimaryButton
          requiresOnline
          title="Gửi biên bản Giám định"
          onPress={() => {
            setError('');
            if (!validateFields()) return;
            setConfirm(true);
          }}
          loading={busy}
          disabled={!canInspect || !hasAnyPermission(user, ['container.read'])}
        />
      </Card>
      <ActionDialog
        requiresOnline
        visible={confirm}
        title="Xác nhận yêu cầu giám định"
        message={containerNo.toUpperCase() + ' · ' + displayCode(inspectionType)}
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={() => void submit()}
        confirmLabel="Gửi yêu cầu"
      >
        <Text style={styles.value}>{notes}</Text>
        {error ? <Notice message={error} /> : null}
      </ActionDialog>
      <Card title="Biên bản giám định trong ICD">
        {historyLoading ? <LoadingState message="Đang tải biên bản giám định..." /> : null}
        {historyError ? <ErrorState title="Chưa tải được lịch sử giám định" message={historyError} onRetry={() => void load()} /> : null}
        {historyError && rows.length ? <Text accessibilityLiveRegion="polite" style={styles.muted}>Dữ liệu từ lần tải trước có thể đã cũ. Tải lại để xem kết quả mới nhất.</Text> : null}
        {!hasAnyPermission(user, ['yard.read']) ? <Text style={styles.muted}>Tài khoản chưa có quyền xem lịch sử giám định.</Text> : !historyLoading && !historyError && historyLoaded && !rows.length ? (
          <Text style={styles.muted}>Chưa có biên bản giám định.</Text>
        ) : (
          rows.map((row) => {
            const display = getInspectionDisplay(row);
            return (
              <TouchableOpacity
                key={row.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('YardOperationDetail', {
                    operationId: row.id,
                    visitId: row.containerVisitId,
                    operationType: 'INSPECTION',
                  })
                }
                style={{
                  paddingVertical: 10,
                  minHeight: 48,
                  minWidth: 48,
                  marginBottom: theme.spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.value, { flex: 1 }]}>
                    {row.containerVisit?.container.containerNumber || displayCode(row.inspectionType)}
                  </Text>
                  <StatusBadge label={display.statusLabel} variant={display.variant} size="sm" />
                  <ChevronRight size={14} color={theme.colors.textMuted} />
                </View>
                {display.resultLabel ? (
                  <Text
                    style={[
                      styles.muted,
                      {
                        color:
                          display.variant === 'danger'
                            ? theme.colors.danger
                            : display.variant === 'success'
                              ? theme.colors.success
                              : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {'Kết quả: ' + display.resultLabel}
                  </Text>
                ) : null}
                <Text style={styles.muted}>{row.notes}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </Card>
    </ScreenLayout>
  );
}
