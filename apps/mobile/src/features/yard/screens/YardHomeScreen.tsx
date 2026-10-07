import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { YardStackParamList } from '../../../navigation/types';
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
import { LoadingState } from '../../../components/LoadingState';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAnyPermission } from '../../auth/permissions';
import { containerApi, type ContainerRecord } from '../../containers/api/container.api';
import { yardApi, type YardSlot, type YardRecommendations, type SlotCheck } from '../api/yard.api';
import { loadYardSnapshot, type YardSnapshot } from '../api/yard-snapshot';
import { canSelectYardSlot } from '../api/yard-map';
import { YardSlotGrid } from '../components/YardSlotGrid';

export function YardHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const { user } = useAuth();
  const styles = useFieldStyles();
  const [containers, setContainers] = useState<ContainerRecord[]>([]);
  const [snapshot, setSnapshot] = useState<YardSnapshot | null>(null);
  const slots = snapshot?.slots ?? [];
  const totalSlots = snapshot?.total ?? 0;
  const loadGeneration = useRef(0);
  const [visitId, setVisitId] = useState('');
  const selectedVisit = useRef('');
  const locationGeneration = useRef(0);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [target, setTarget] = useState('');
  const targetGeneration = useRef(0);
  const [recommendation, setRecommendation] = useState<YardRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const writePending = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [check, setCheck] = useState<SlotCheck | null>(null);
  const [confirm, setConfirm] = useState(false);
  const canAssign = hasAnyPermission(user, ['yard.update']);
  const canMove = hasAnyPermission(user, ['yard.move']);
  const isMovement = !!currentSlot;
  const hasResolvedLocation = !!visitId && currentSlot !== null && !resolvingLocation;
  const canAct = hasResolvedLocation && (isMovement ? canMove : canAssign);
  const chooseVisit = async (id: string) => {
    if (busy || loading) return;
    selectedVisit.current = id;
    const generation = ++locationGeneration.current;
    targetGeneration.current++;
    setCheck(null);
    setVisitId(id);
    setTarget('');
    setRecommendation(null);
    setSuccess('');
    setCurrentSlot(null);
    setResolvingLocation(true);
    setConfirm(false);
    setError('');
    try {
      const location = await containerApi.location(id);
      if (selectedVisit.current === id && locationGeneration.current === generation)
        setCurrentSlot(
          location?.currentLocation?.slotCode ||
            location?.currentLocation?.yardSlot?.slotCode ||
            location?.yardSlot?.slotCode ||
            location?.slotCode ||
            '',
        );
    } catch (err) {
      if (selectedVisit.current === id && locationGeneration.current === generation) {
        setError(err instanceof Error ? err.message : 'Không tải được vị trí hiện tại.');
        setVisitId('');
        selectedVisit.current = '';
      }
    } finally {
      if (locationGeneration.current === generation) setResolvingLocation(false);
    }
  };
  const load = useCallback(async () => {
    const ticket = ++loadGeneration.current;
    const activeVisit = selectedVisit.current;
    const generation = activeVisit ? ++locationGeneration.current : locationGeneration.current;
    const shouldReadLocation = !!activeVisit && hasAnyPermission(user, ['yard.read']);
    setLoading(true);
    setError('');
    if (activeVisit) {
      setCurrentSlot(null);
      setResolvingLocation(shouldReadLocation);
      setCheck(null);
      setRecommendation(null);
      setConfirm(false);
    }
    try {
      const [catalog, visits, location] = await Promise.allSettled([
        hasAnyPermission(user, ['yard.read'])
          ? loadYardSnapshot({
              canReadInspections: true,
              canReadHolds: hasAnyPermission(user, ['operational_hold.read']),
            })
          : Promise.resolve(null),
        hasAnyPermission(user, ['container.read'])
          ? yardApi.containers()
          : Promise.resolve({ data: [] }),
        shouldReadLocation ? containerApi.location(activeVisit) : Promise.resolve(null),
      ]);
      if (ticket !== loadGeneration.current) return;
      const errors: string[] = [];
      if (visits.status === 'fulfilled') setContainers(visits.value.data);
      else
        errors.push(
          visits.reason instanceof Error
            ? visits.reason.message
            : 'Không tải được danh sách container.',
        );
      if (catalog.status === 'fulfilled') {
        setSnapshot(catalog.value);
      } else
        errors.push(
          catalog.reason instanceof Error ? catalog.reason.message : 'Không tải được sơ đồ bãi.',
        );
      if (
        shouldReadLocation &&
        selectedVisit.current === activeVisit &&
        locationGeneration.current === generation
      ) {
        if (location.status === 'fulfilled')
          setCurrentSlot(
            location.value?.currentLocation?.slotCode ||
              location.value?.currentLocation?.yardSlot?.slotCode ||
              location.value?.yardSlot?.slotCode ||
              location.value?.slotCode ||
              '',
          );
        else
          errors.push(
            location.reason instanceof Error
              ? location.reason.message
              : 'Không tải được vị trí hiện tại. Kéo để thử lại.',
          );
      }
      if (ticket === loadGeneration.current) setError(errors.join('\n'));
    } catch (err) {
      if (ticket === loadGeneration.current)
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu bãi.');
    } finally {
      if (ticket === loadGeneration.current) {
        setLoading(false);
        if (locationGeneration.current === generation) setResolvingLocation(false);
      }
    }
  }, [user]);
  useFocusEffect(
    useCallback(() => {
      setSuccess('');
      void load();
      return () => {
        loadGeneration.current++;
        locationGeneration.current++;
      };
    }, [load]),
  );
  const chooseSlot = (slot: YardSlot) => {
    if (!visitId || busy || loading || !canAct || !canSelectYardSlot(slot)) return;
    targetGeneration.current++;
    setTarget(slot.slotCode);
    setCheck(null);
    setRecommendation(null);
    setSuccess('');
    setError('');
  };
  const suggest = async () => {
    if (!visitId || busy || loading || !canAct || isMovement) return;
    const activeVisit = visitId;
    const ticket = loadGeneration.current;
    const locationTicket = locationGeneration.current;
    const targetTicket = targetGeneration.current;
    const isCurrentRequest = () =>
      selectedVisit.current === activeVisit &&
      ticket === loadGeneration.current &&
      locationTicket === locationGeneration.current &&
      targetTicket === targetGeneration.current;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await yardApi.getRecommendations(activeVisit);
      if (!isCurrentRequest()) return;
      targetGeneration.current++;
      setRecommendation(response);
      setTarget(response.data[0]?.slotCode || '');
      if (!response.data.length) setError('Chưa có vị trí phù hợp cho container này.');
    } catch (err) {
      if (isCurrentRequest())
        setError(err instanceof Error ? err.message : 'Không lấy được đề xuất.');
    } finally {
      setBusy(false);
    }
  };
  const assign = async () => {
    if (writePending.current || !visitId || busy || loading || !canAct) return;
    if (isMovement) {
      const slot = slots.find(
        (row) => row.slotCode === target.trim().toUpperCase() && canSelectYardSlot(row),
      );
      if (!slot || busy || loading || !canMove) return;
      writePending.current = true;
      setBusy(true);
      setError('');
      try {
        const movement = await yardApi.requestMovement(visitId, slot.id);
        setConfirm(false);
        navigation.navigate('YardOperationDetail', {
          operationId: movement.id,
          operationType: 'MOVEMENT',
          visitId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tạo được lệnh đảo chuyển.');
      } finally {
        writePending.current = false;
        setBusy(false);
      }
      return;
    }
    const candidate = recommendation?.data.find(
      (row) => row.slotCode === target.trim().toUpperCase(),
    );
    const manualSlot = slots.find((row) => row.slotCode === target.trim().toUpperCase());
    if (
      !visitId ||
      busy ||
      loading ||
      !canAssign ||
      (!candidate && (!manualSlot || !check?.eligible || check.yardSlot.id !== manualSlot.id))
    )
      return;
    writePending.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (candidate && recommendation)
        await yardApi.assign(visitId, candidate.yardSlotId, recommendation);
      else await yardApi.assignManual(visitId, manualSlot!.id);
      setConfirm(false);
      setCheck(null);
      setSuccess('Đã xác nhận xếp container tại ' + target + '.');
      setRecommendation(null);
      setTarget('');
      setCurrentSlot(target);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xác nhận được xếp bãi.');
    } finally {
      writePending.current = false;
      setBusy(false);
    }
  };
  const checkManual = async () => {
    const slot = slots.find((row) => row.slotCode === target.trim().toUpperCase());
    if (!visitId || !slot || busy || loading || !canAct || isMovement) {
      setError('Chọn container, xác nhận vị trí hiện tại và nhập đúng mã ô bãi.');
      return;
    }
    const activeVisit = visitId;
    const ticket = loadGeneration.current;
    const locationTicket = locationGeneration.current;
    const targetTicket = targetGeneration.current;
    const isCurrentRequest = () =>
      selectedVisit.current === activeVisit &&
      ticket === loadGeneration.current &&
      locationTicket === locationGeneration.current &&
      targetTicket === targetGeneration.current;
    setBusy(true);
    setError('');
    setCheck(null);
    try {
      const response = await yardApi.checkSlot(activeVisit, slot.id);
      if (isCurrentRequest()) setCheck(response);
    } catch (err) {
      if (isCurrentRequest())
        setError(err instanceof Error ? err.message : 'Không kiểm tra được vị trí.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenLayout title="Tác nghiệp bãi" onRefresh={() => void load()} refreshing={loading}>
      <Card title="Lệnh Tác nghiệp Bãi (Yard Stacking)">
        <SelectField
          label="Chọn Container cần xếp/dời vị trí"
          value={visitId}
          options={containers.map((row) => ({
            value: row.id,
            label:
              row.container.containerNumber +
              ' — ' +
              (slots.find((slot) => slot.currentContainer?.containerVisitId === row.id)?.slotCode ||
                row.currentLocation?.slotCode ||
                'Chọn để xem vị trí'),
          }))}
          onChange={(id) => void chooseVisit(id)}
          disabled={busy || loading || resolvingLocation || !hasAnyPermission(user, ['yard.read'])}
        />
        {visitId && currentSlot !== null ? (
          <Text style={styles.muted}>Vị trí hiện tại: {currentSlot || 'Chưa hạ bãi'}</Text>
        ) : null}
        <Field
          label="Vị trí xếp bãi (Block - Row - Bay - Tier)"
          value={target}
          onChangeText={(value) => {
            targetGeneration.current++;
            setTarget(value.toUpperCase());
            setCheck(null);
          }}
          placeholder="VD: A-01-01-1"
          editable={!busy && !loading && canAct}
        />
        {canAssign && !isMovement ? (
          <PrimaryButton
            requiresOnline
            title="Gợi ý vị trí trống"
            variant="secondary"
            onPress={() => void suggest()}
            disabled={!hasResolvedLocation || loading}
            loading={busy}
          />
        ) : isMovement ? (
          <Text style={styles.muted}>
            Nhập mã ô trống trong sơ đồ. Lệnh đảo chuyển cần được bắt đầu và xác nhận hoàn tất.
          </Text>
        ) : null}
        {recommendation ? (
          <SelectField
            label={'Vị trí phù hợp (' + recommendation.data.length + ')'}
            value={target}
            options={recommendation.data.map((row) => ({
              value: row.slotCode,
              label: row.slotCode + ' · Khu ' + row.blockCode,
            }))}
            onChange={(value) => {
              targetGeneration.current++;
              setTarget(value);
              setCheck(null);
            }}
            disabled={busy}
          />
        ) : null}
        {canAssign && !isMovement ? (
          <PrimaryButton
            requiresOnline
            title="Kiểm tra vị trí nhập tay"
            variant="secondary"
            onPress={() => void checkManual()}
            disabled={!hasResolvedLocation || !target || busy || loading}
          />
        ) : null}
        {check ? (
          <>
            <Notice
              message={
                check.eligible
                  ? 'Vị trí nhập tay đáp ứng điều kiện xếp bãi.'
                  : 'Vị trí chưa đáp ứng điều kiện xếp bãi.'
              }
              success={check.eligible}
            />
            {[...check.blockers, ...check.warnings].map((row, i) => (
              <Notice key={i} message={row.message} />
            ))}
          </>
        ) : null}
        {error ? <Notice message={error} /> : null}
        {success ? <Notice message={success} success /> : null}
        {canAct ? (
          <PrimaryButton
            requiresOnline
            title={isMovement ? 'Tạo lệnh đảo chuyển' : 'Xác nhận xếp vị trí'}
            onPress={() => setConfirm(true)}
            disabled={
              !visitId ||
              !hasResolvedLocation ||
              loading ||
              (isMovement
                ? !slots.some(
                    (slot) =>
                      canSelectYardSlot(slot) && slot.slotCode === target.trim().toUpperCase(),
                  )
                : !recommendation?.data.some(
                    (row) => row.slotCode === target.trim().toUpperCase(),
                  ) && !check?.eligible)
            }
            loading={busy}
          />
        ) : (
          <Text style={styles.muted}>
            {!canAssign && !canMove
              ? 'Tài khoản có quyền xem bãi.'
              : !visitId
                ? 'Chọn container để xem vị trí hiện tại và tác nghiệp.'
                : !hasResolvedLocation
                  ? 'Chưa xác nhận được vị trí hiện tại. Kéo để tải lại trước khi tác nghiệp.'
                  : 'Tài khoản chưa có quyền thực hiện tác nghiệp này.'}
          </Text>
        )}
      </Card>
      {hasAnyPermission(user, ['yard.read']) ? (
        <PrimaryButton
          title="Danh sách tác nghiệp và đặt lịch"
          variant="secondary"
          onPress={() => navigation.navigate('YardOperations')}
        />
      ) : null}
      <ActionDialog
        requiresOnline
        visible={confirm}
        title={isMovement ? 'Tạo lệnh đảo chuyển' : 'Xác nhận xếp bãi'}
        message={
          (containers.find((row) => row.id === visitId)?.container.containerNumber || '') +
          ' → ' +
          target
        }
        busy={busy || loading || resolvingLocation}
        onClose={() => setConfirm(false)}
        onConfirm={() => void assign()}
        confirmLabel="Xác nhận"
      >
        {error ? <Notice message={error} /> : null}
      </ActionDialog>
      {hasAnyPermission(user, ['yard.read']) ? (
        <Card title="Sơ đồ vị trí bãi — Tổng quan">
          <Text style={styles.muted}>
            Đang hiển thị {slots.length} / {totalSlots} ô bãi
          </Text>
          {snapshot?.warnings.map((message) => (
            <Notice key={message} message={message} />
          ))}
          {loading && !snapshot ? (
            <LoadingState />
          ) : (
            <YardSlotGrid
              slots={slots}
              holds={snapshot?.holds}
              inspections={snapshot?.inspections}
              onSelectSlot={chooseSlot}
              selectionEnabled={!!visitId && canAct && !busy && !loading}
              onOpenContainer={
                hasAnyPermission(user, ['container.read'])
                  ? (id) => navigation.navigate('ContainerDetail', { visitId: id })
                  : undefined
              }
            />
          )}
        </Card>
      ) : null}
    </ScreenLayout>
  );
}
