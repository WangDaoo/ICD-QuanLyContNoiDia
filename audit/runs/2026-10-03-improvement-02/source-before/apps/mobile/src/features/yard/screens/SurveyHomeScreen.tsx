import { useCallback, useState } from 'react';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canInspect = hasAnyPermission(user, ['yard.inspect']);
  const load = useCallback(async () => {
    if (!hasAnyPermission(user, ['yard.read'])) return;
    try {
      setRows(await yardApi.inspections());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được biên bản.');
    }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const submit = async () => {
    if (busy || !canInspect) return;
    setError('');
    setSuccess('');
    if (!containerNo.trim() || !notes.trim()) {
      setError('Nhập số container và mô tả tổn thất thực tế.');
      return;
    }
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
    <ScreenLayout title="Giám định hiện trường">
      <Card title="Biên bản Giám định Hư hỏng Hiện trường">
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Camera size={16} color={theme.colors.warning} />
          <Text style={styles.muted}>Ghi nhận tình trạng vỏ container</Text>
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
          onChangeText={setContainerNo}
          autoCapitalize="characters"
          placeholder="VD: MSCU6639870"
          editable={!busy}
        />
        <Field
          label="Nội dung ghi nhận*"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Nhập vị trí và mô tả hư hỏng thực tế…"
          editable={!busy}
        />
        <Text style={styles.label}>Mức độ hư hỏng</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['Nhẹ', 'Trung bình', 'Nặng'].map((label) => (
            <TouchableOpacity
              key={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: severity === label }}
              onPress={() => setSeverity(label)}
              style={[
                styles.chip,
                {
                  flex: 1,
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
        </View>
        {error ? <Notice message={error} /> : null}
        {success ? <Notice message={success} success /> : null}
        <PrimaryButton
          requiresOnline
          title="Gửi biên bản Giám định"
          onPress={() => {
            setError('');
            if (!containerNo.trim() || !notes.trim()) {
              setError('Nhập số container và nội dung ghi nhận.');
              return;
            }
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
        message={containerNo.toUpperCase() + ' · ' + inspectionType}
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={() => void submit()}
        confirmLabel="Gửi yêu cầu"
      >
        <Text style={styles.value}>{notes}</Text>
        {error ? <Notice message={error} /> : null}
      </ActionDialog>
      <Card title="Biên bản giám định trong ICD">
        {!rows.length ? (
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
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.value, { flex: 1 }]}>
                    {row.containerVisit?.container.containerNumber || row.inspectionType}
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
