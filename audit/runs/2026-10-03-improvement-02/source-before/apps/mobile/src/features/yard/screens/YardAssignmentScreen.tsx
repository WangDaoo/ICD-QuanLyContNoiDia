import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScreenLayout,
  Card,
  Field,
  Notice,
  useFieldStyles,
} from '../../../components/ScreenLayout';
import { ActionDialog } from '../../../components/ActionDialog';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { useApiConnection } from '../../../services/api/ApiConnectionProvider';
import { yardApi } from '../api/yard.api';
import type { YardRecommendations, YardSlot } from '../api/yard.api';
import { findYardAssignmentChoice, loadYardAssignmentOptions } from '../api/yard-assignment';
import type { CheckedYardSlot, YardAssignmentChoice } from '../api/yard-assignment';
import type { YardStackParamList } from '../../../navigation/types';

export function YardAssignmentScreen() {
  const { params } = useRoute<RouteProp<YardStackParamList, 'YardAssignment'>>();
  return <YardAssignment key={params?.visitId || 'missing'} />;
}

function YardAssignment() {
  const { user } = useAuth();
  const { online } = useApiConnection();
  const canAssign = hasAnyPermission(user, ['yard.update']);
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const { params } = useRoute<RouteProp<YardStackParamList, 'YardAssignment'>>();
  const visitId = params?.visitId || '';
  const fieldStyles = useFieldStyles();
  const [manual, setManual] = useState('');
  const [slots, setSlots] = useState<YardSlot[]>([]);
  const [checked, setChecked] = useState<CheckedYardSlot | null>(null);
  const [confirm, setConfirm] = useState<YardAssignmentChoice | null>(null);
  const [recommendationResult, setRecommendationResult] = useState<{
    visitId: string;
    data: YardRecommendations;
  } | null>(null);
  const [selected, setSelected] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mounted = useRef(false);
  const recommendationSequence = useRef(0);
  const catalogSequence = useRef(0);
  const checkSequence = useRef(0);
  const pending = useRef(false);
  const recommendations =
    recommendationResult?.visitId === visitId ? recommendationResult.data : null;
  const choice = findYardAssignmentChoice({
    visitId,
    recommendations,
    selectedSlotId: selected,
    manualCode: manual,
    slots,
    checked,
  });
  const current = useRef({ visitId, manual, choice, confirm, canAssign, online });
  current.current = { visitId, manual, choice, confirm, canAssign, online };

  const load = useCallback(
    (target: 'all' | 'recommendations' | 'slots' = 'all') => {
      if (!visitId || pending.current) return;
      const receiveRecommendations = target !== 'slots';
      const receiveSlots = target !== 'recommendations';
      const recommendationRequest = receiveRecommendations ? ++recommendationSequence.current : 0;
      const catalogRequest = receiveSlots ? ++catalogSequence.current : 0;
      if (receiveRecommendations) {
        setRecommendationsLoading(true);
        setRecommendationsError('');
        setRecommendationResult(null);
        setSelected('');
        if (current.current.choice?.source === 'RECOMMENDATION') {
          current.current.choice = null;
          current.current.confirm = null;
          setConfirm(null);
        }
      }
      if (receiveSlots) {
        setSlotsLoading(true);
        setSlotsError('');
        setSlots([]);
        setChecked(null);
        checkSequence.current++;
        if (current.current.choice?.source === 'MANUAL') {
          current.current.choice = null;
          current.current.confirm = null;
          setConfirm(null);
        }
      }
      void loadYardAssignmentOptions(visitId, yardApi, {
        recommendations: receiveRecommendations
          ? (result) => {
              if (
                !mounted.current ||
                current.current.visitId !== visitId ||
                recommendationRequest !== recommendationSequence.current
              )
                return;
              setRecommendationResult(result.data ? { visitId, data: result.data } : null);
              setRecommendationsError(result.error || '');
              setRecommendationsLoading(false);
            }
          : undefined,
        slots: receiveSlots
          ? (result) => {
              if (
                !mounted.current ||
                current.current.visitId !== visitId ||
                catalogRequest !== catalogSequence.current
              )
                return;
              setSlots(result.data || []);
              setSlotsError(result.error || '');
              setSlotsLoading(false);
            }
          : undefined,
      });
    },
    [visitId],
  );

  useEffect(() => {
    mounted.current = true;
    setManual('');
    setChecked(null);
    setConfirm(null);
    setSelected('');
    setError('');
    setSuccess('');
    pending.current = false;
    setSubmitting(false);
    load();
    return () => {
      mounted.current = false;
      recommendationSequence.current++;
      catalogSequence.current++;
      checkSequence.current++;
    };
  }, [load]);

  const invalidateSelection = () => {
    checkSequence.current++;
    setChecked(null);
    setSelected('');
    setConfirm(null);
    setError('');
    current.current.choice = null;
    current.current.confirm = null;
  };

  const checkManual = async () => {
    const state = current.current;
    if (!state.canAssign || pending.current || !state.visitId) return;
    if (state.online === false) {
      setError('Cần kết nối máy chủ để kiểm tra vị trí.');
      return;
    }
    const slot = slots.find((row) => row.slotCode === state.manual.trim().toUpperCase());
    if (!slot || slotsLoading || slotsError) {
      setError('Nhập đúng mã ô bãi cần kiểm tra.');
      return;
    }
    invalidateSelection();
    const request = ++checkSequence.current;
    pending.current = true;
    setSubmitting(true);
    try {
      const result = await yardApi.checkSlot(state.visitId, slot.id);
      if (
        mounted.current &&
        request === checkSequence.current &&
        current.current.visitId === state.visitId &&
        current.current.manual.trim().toUpperCase() === slot.slotCode
      ) {
        if (result.yardSlot.id !== slot.id || result.yardSlot.slotCode !== slot.slotCode)
          setError('Kết quả kiểm tra không khớp vị trí đã chọn. Kiểm tra lại.');
        else
          setChecked({
            visitId: state.visitId,
            yardSlotId: slot.id,
            slotCode: slot.slotCode,
            result,
          });
      }
    } catch (error) {
      if (
        mounted.current &&
        request === checkSequence.current &&
        current.current.visitId === state.visitId
      )
        setError(error instanceof Error ? error.message : 'Không kiểm tra được vị trí.');
    } finally {
      if (mounted.current && current.current.visitId === state.visitId) {
        pending.current = false;
        setSubmitting(false);
      }
    }
  };

  const review = () => {
    const state = current.current;
    if (!state.choice || !state.canAssign || state.online === false || pending.current) return;
    setError('');
    setConfirm(state.choice);
    current.current.confirm = state.choice;
  };

  const assign = async () => {
    const state = current.current;
    const target = state.choice;
    if (!target || !state.confirm || !state.canAssign || pending.current) return;
    if (state.online === false) {
      setError('Cần kết nối máy chủ để xác nhận xếp bãi.');
      return;
    }
    const matchesReview =
      target.visitId === state.confirm.visitId &&
      target.yardSlotId === state.confirm.yardSlotId &&
      target.source === state.confirm.source &&
      (target.source === 'MANUAL'
        ? state.confirm.source === 'MANUAL' && target.checked === state.confirm.checked
        : state.confirm.source === 'RECOMMENDATION' &&
          target.recommendations === state.confirm.recommendations);
    if (!matchesReview) {
      setConfirm(null);
      setError('Vị trí đã thay đổi. Kiểm tra và xác nhận lại.');
      return;
    }
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (target.source === 'RECOMMENDATION')
        await yardApi.assign(target.visitId, target.yardSlotId, target.recommendations);
      else await yardApi.assignManual(target.visitId, target.yardSlotId);
      if (mounted.current && current.current.visitId === target.visitId) {
        invalidateSelection();
        setSuccess('Đã xếp container vào ' + target.slotCode + '.');
        recommendationSequence.current++;
        catalogSequence.current++;
      }
    } catch (error) {
      if (mounted.current && current.current.visitId === target.visitId)
        setError(error instanceof Error ? error.message : 'Backend chưa xác nhận xếp bãi.');
    } finally {
      if (mounted.current && current.current.visitId === target.visitId) {
        pending.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <ScreenLayout
      title="Xếp vị trí bãi"
      subtitle={params?.containerNo}
      onBack={() => navigation.goBack()}
    >
      {params?.containerNo ? (
        <Card title="Container cần xếp bãi">
          <Text style={fieldStyles.value}>{params.containerNo}</Text>
        </Card>
      ) : null}
      {!visitId ? (
        <Notice message="Chọn công việc xếp bãi hoặc tra cứu container trước." />
      ) : success ? (
        <>
          <Notice message={success} success />
          <PrimaryButton
            title="Về tra cứu container"
            onPress={() => navigation.navigate('ContainerSearch')}
          />
        </>
      ) : (
        <>
          {error ? <Notice message={error} /> : null}
          <Card title="Đề xuất vị trí">
            {recommendationsLoading ? (
              <LoadingState />
            ) : recommendationsError ? (
              <ErrorState message={recommendationsError} onRetry={() => load('recommendations')} />
            ) : recommendations ? (
              <>
                {recommendations.data.length === 0 ? (
                  <EmptyState
                    title="Chưa có vị trí phù hợp"
                    description="Backend không tìm được ô bãi đáp ứng điều kiện container."
                  />
                ) : (
                  recommendations.data.slice(0, showAll ? undefined : 5).map((row) => (
                    <TouchableOpacity
                      key={row.yardSlotId}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selected === row.yardSlotId }}
                      disabled={submitting || !canAssign}
                      onPress={() => {
                        if (pending.current || !current.current.canAssign) return;
                        invalidateSelection();
                        setSelected(row.yardSlotId);
                      }}
                    >
                      <Card title={(selected === row.yardSlotId ? '✓ ' : '') + row.slotCode}>
                        <Text style={fieldStyles.value}>Khu {row.blockCode}</Text>
                        {row.reasons.map((reason, i) => (
                          <Text key={i} style={fieldStyles.muted}>
                            {reason.replace(/hard rules/gi, 'quy tắc xếp bãi')}
                          </Text>
                        ))}
                        {row.warnings.map((warning, i) => (
                          <Notice key={i} message={warning} />
                        ))}
                      </Card>
                    </TouchableOpacity>
                  ))
                )}
                {recommendations.data.length > 5 ? (
                  <PrimaryButton
                    title={showAll ? 'Thu gọn đề xuất' : 'Xem tất cả vị trí phù hợp'}
                    variant="secondary"
                    onPress={() => setShowAll(!showAll)}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
          {canAssign ? (
            <Card title="Vị trí nhập tay">
              {slotsLoading ? (
                <LoadingState />
              ) : slotsError ? (
                <ErrorState message={slotsError} onRetry={() => load('slots')} />
              ) : slots.length === 0 ? (
                <EmptyState
                  title="Chưa có ô bãi"
                  description="Danh sách vị trí hiện chưa có ô bãi để kiểm tra."
                />
              ) : null}
              <Field
                label="Mã vị trí"
                value={manual}
                onChangeText={(value) => {
                  invalidateSelection();
                  const code = value.toUpperCase();
                  setManual(code);
                  current.current.manual = code;
                }}
                editable={!submitting && !slotsLoading && !slotsError}
              />
              <PrimaryButton
                requiresOnline
                title="Kiểm tra vị trí"
                variant="secondary"
                onPress={() => void checkManual()}
                disabled={slotsLoading || !!slotsError || slots.length === 0}
                loading={submitting}
              />
              {checked ? (
                <>
                  <Notice
                    message={
                      checked.result.eligible
                        ? 'Vị trí đáp ứng điều kiện xếp bãi.'
                        : 'Vị trí chưa đáp ứng điều kiện.'
                    }
                    success={checked.result.eligible}
                  />
                  {[...checked.result.blockers, ...checked.result.warnings].map((row, i) => (
                    <Notice key={i} message={row.message} />
                  ))}
                </>
              ) : null}
            </Card>
          ) : (
            <Text style={fieldStyles.muted}>Tài khoản có quyền xem bãi.</Text>
          )}
          <PrimaryButton
            requiresOnline
            title="Xác nhận xếp vị trí"
            onPress={review}
            disabled={!canAssign || !choice}
            loading={submitting}
          />
        </>
      )}
      <ActionDialog
        requiresOnline
        visible={!!confirm}
        title="Xác nhận xếp bãi"
        message={(params?.containerNo || '') + ' → ' + (confirm?.slotCode || '')}
        busy={submitting}
        onClose={() => {
          setConfirm(null);
          current.current.confirm = null;
        }}
        onConfirm={() => void assign()}
        confirmLabel="Xếp vị trí"
      >
        {error ? <Notice message={error} /> : null}
      </ActionDialog>
    </ScreenLayout>
  );
}
