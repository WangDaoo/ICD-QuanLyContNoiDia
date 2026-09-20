import React, { useEffect, useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { ApiError } from '../../../services/api/api-client';
import {
  gateInApi,
  GateInContext,
  unwrapData,
} from '../api/gate-in.api';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

const CONDITION_OPTIONS = [
  { code: 'GOOD', label: 'TỐT (GOOD)' },
  { code: 'DAMAGED', label: 'HƯ HỎNG (DAMAGED)' },
  { code: 'DIRTY', label: 'BẨN (DIRTY)' },
  { code: 'SEAL_BROKEN', label: 'ĐỨT NIÊM (SEAL_BROKEN)' },
];

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (typeof error.body === 'object' && error.body !== null) {
      const body = error.body as Record<string, unknown>;
      if (typeof body.message === 'string') {
        return body.message;
      }
      if (Array.isArray(body.message) && typeof body.message[0] === 'string') {
        return body.message[0];
      }
      if (typeof body.error === 'object' && body.error !== null) {
        const nested = body.error as { message?: string };
        if (nested.message) return nested.message;
      }
      if (typeof body.error === 'string') {
        return body.error;
      }
    }
    return `Lỗi máy chủ (${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export function GateInFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const route = useRoute<RouteProp<GateStackParamList, 'GateInForm'>>();
  const { visitId } = route.params;

  const [context, setContext] = useState<GateInContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actualSeal, setActualSeal] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [conditionCode, setConditionCode] = useState('GOOD');
  const [conditionNotes, setConditionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const response = await gateInApi.getContext(visitId);
      const data = unwrapData(response);
      setContext(data);

      const expectedSeal = data.containerVisit.expectedSeal || '';
      setActualSeal(expectedSeal);

      if (data.containerVisit.grossWeight) {
        setActualWeight(String(data.containerVisit.grossWeight));
      }
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const handleSubmit = async () => {
    if (!context) {
      return;
    }

    const truckVisit = context.eligibleTruckVisits[0];
    if (!truckVisit) {
      setFormError('Không có xe kéo (Truck Visit) hợp lệ để thực hiện tiếp nhận.');
      return;
    }

    const seal = actualSeal.trim().toUpperCase();
    if (!seal) {
      setFormError('Vui lòng nhập số seal thực tế.');
      return;
    }

    const parsedWeight = actualWeight.trim() ? Number(actualWeight) : undefined;
    if (
      parsedWeight !== undefined &&
      (!Number.isFinite(parsedWeight) || parsedWeight <= 0)
    ) {
      setFormError('Trọng lượng thực tế không hợp lệ.');
      return;
    }

    // Check seal mismatch note warning
    const expectedSeal = (context.containerVisit.expectedSeal || '').trim().toUpperCase();
    if (expectedSeal && seal !== expectedSeal && !conditionNotes.trim()) {
      setFormError('Seal thực tế lệch so với hồ sơ. Vui lòng nhập ghi chú nguyên nhân.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await gateInApi.confirm(visitId, {
        truckVisitId: truckVisit.id,
        actualSeal: seal,
        actualWeight: parsedWeight,
        conditionCode: conditionCode || undefined,
        conditionNotes: conditionNotes.trim() || undefined,
      });

      navigation.replace('GateInSuccess', {
        visitId,
        containerNumber: context.containerVisit.container.containerNumber,
      });
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Tiếp nhận vào cổng" subtitle="Đang tải dữ liệu..." onBack={() => navigation.goBack()} />
        <LoadingState message="Đang tải thông tin Container Visit..." />
      </View>
    );
  }

  if (loadError || !context) {
    return (
      <View style={styles.container}>
        <AppHeader title="Tiếp nhận vào cổng" onBack={() => navigation.goBack()} />
        <ErrorState
          title="Không thể tải dữ liệu"
          message={loadError || 'Không tìm thấy hồ sơ container.'}
          onRetry={() => void loadContext()}
        />
      </View>
    );
  }

  const { containerVisit, movementOrder, eligibleTruckVisits, alreadyReceived } = context;
  const primaryTruck = eligibleTruckVisits[0];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Tiếp nhận vào cổng"
        subtitle={`Cont: ${containerVisit.container.containerNumber}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning if already received */}
        {alreadyReceived ? (
          <View style={styles.alreadyReceivedBox}>
            <Text style={styles.alreadyReceivedText}>
              ⚠️ Container Visit này đã được Gate-in tiếp nhận trước đó.
            </Text>
          </View>
        ) : null}

        {/* Container Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.containerNumber}>
              {containerVisit.container.containerNumber}
            </Text>
            <StatusBadge
              label={containerVisit.state}
              variant={containerVisit.state === 'AUTHORIZED' ? 'info' : 'neutral'}
            />
          </View>

          <Text style={styles.containerMeta}>
            {containerVisit.container.size} FT • {containerVisit.container.type} • ISO: {containerVisit.container.isoCode}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Xe đầu kéo</Text>
              <Text style={styles.metaValue}>
                {primaryTruck?.truckPlate || primaryTruck?.vehiclePlate || 'Chưa gán'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Tài xế</Text>
              <Text style={styles.metaValue}>
                {primaryTruck?.driverName || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={[styles.metaRow, { marginTop: theme.spacing.sm }]}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Lệnh vận chuyển</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      movementOrder?.status === 'AUTHORIZED'
                        ? theme.colors.success
                        : theme.colors.warning,
                  },
                ]}
              >
                {movementOrder?.status || 'KHÔNG CÓ LỆNH'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Hạn lệnh</Text>
              <Text style={styles.metaValue}>
                {movementOrder?.expiresAt
                  ? new Date(movementOrder.expiresAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Inspection & Actual Inputs Form */}
        <View style={styles.card}>
          <Text style={styles.formSectionTitle}>KIỂM TRA THỰC TẾ & TIẾP NHẬN</Text>

          {/* Expected Seal Info */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Seal khai báo hồ sơ</Text>
            <Text style={styles.readOnlyField}>
              {containerVisit.expectedSeal || '(Không có khai báo)'}
            </Text>
          </View>

          {/* Actual Seal Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Số Seal thực tế <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={actualSeal}
              onChangeText={setActualSeal}
              placeholder="Nhập số seal thực tế..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              editable={!submitting && !alreadyReceived}
            />
          </View>

          {/* Actual Weight Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Trọng lượng thực tế (kg)</Text>
            <TextInput
              style={styles.input}
              value={actualWeight}
              onChangeText={setActualWeight}
              placeholder="VD: 12500..."
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
              editable={!submitting && !alreadyReceived}
            />
          </View>

          {/* Condition Code Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tình trạng vỏ Cont</Text>
            <View style={styles.conditionOptionsContainer}>
              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.conditionOptionChip,
                    conditionCode === opt.code && styles.conditionOptionChipActive,
                  ]}
                  onPress={() => setConditionCode(opt.code)}
                  disabled={submitting || alreadyReceived}
                >
                  <Text
                    style={[
                      styles.conditionOptionText,
                      conditionCode === opt.code && styles.conditionOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ghi chú tiếp nhận</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={conditionNotes}
              onChangeText={setConditionNotes}
              placeholder="Ghi chú thêm (bắt buộc nếu lệch Seal)..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
              editable={!submitting && !alreadyReceived}
            />
          </View>
        </View>

        {/* Form Error Box */}
        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <PrimaryButton
          title={alreadyReceived ? 'ĐÃ TIẾP NHẬN' : 'XÁC NHẬN GATE-IN'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={alreadyReceived || submitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  alreadyReceivedBox: {
    backgroundColor: theme.colors.warningBackground,
    borderColor: '#FEDF89',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  alreadyReceivedText: {
    ...theme.typography.captionBold,
    color: theme.colors.warning,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerNumber: {
    ...theme.typography.mono,
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  containerMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  metaValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  formSectionTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  requiredMark: {
    color: theme.colors.danger,
  },
  readOnlyField: {
    ...theme.typography.mono,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  conditionOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOptionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  conditionOptionChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  conditionOptionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  conditionOptionTextActive: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  formErrorBox: {
    backgroundColor: theme.colors.dangerBackground,
    borderWidth: 1,
    borderColor: '#FECDCA',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  formErrorText: {
    ...theme.typography.captionBold,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: theme.spacing.xs,
  },
});
