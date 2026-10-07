import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Search, Scan } from 'lucide-react-native';
import { CodeScanner } from '../../../components/CodeScanner';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Field, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { SelectField } from '../../../components/SelectField';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ActionDialog } from '../../../components/ActionDialog';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  gateInApi,
  extractContainerNumber,
  unwrapData,
  type GateInContext,
} from '../api/gate-in.api';
import {
  validateGateInInput,
  getEligibleGateInTrucks,
  getGateInBlocker,
} from '../api/gate-in.validation';
import { useApiConnection } from '../../../services/api/ApiConnectionProvider';
import { TruckArrival } from './TruckArrival';
import type { GateStackParamList } from '../../../navigation/types';

export function GateInReceipt({
  initialVisitId,
  openScanner,
}: {
  initialVisitId?: string;
  openScanner?: boolean;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const { theme } = useTheme();
  const styles = useFieldStyles();
  const focused = useIsFocused();
  const { online } = useApiConnection();
  const [camera, setCamera] = useState(false);
  const [containerNo, setContainerNo] = useState('');
  const [visitId, setVisitId] = useState(initialVisitId || '');
  const [context, setContext] = useState<GateInContext | null>(null);
  const [truckVisitId, setTruckVisitId] = useState('');
  const [seal, setSeal] = useState('');
  const [weight, setWeight] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [matches, setMatches] = useState<
    Array<{ id: string; state: string; container: { containerNumber: string } }>
  >([]);
  const requestGeneration = useRef(0);
  useEffect(() => {
    if (openScanner && focused) {
      setCamera(true);
      navigation.setParams({ openScanner: false });
    }
  }, [openScanner, focused, navigation]);
  const clearReceipt = useCallback(() => {
    setContext(null);
    setTruckVisitId('');
    setSeal('');
    setWeight('');
    setCondition('GOOD');
    setNotes('');
  }, []);
  const loadContext = useCallback(async (id: string, generation: number) => {
    const data = unwrapData(await gateInApi.getContext(id));
    if (generation !== requestGeneration.current) return;
    setContext(data);
    setVisitId(id);
    setContainerNo(data.containerVisit.container.containerNumber);
    const trucks = getEligibleGateInTrucks(data.eligibleTruckVisits);
    setTruckVisitId(trucks.length === 1 ? trucks[0].id : '');
  }, []);
  useEffect(() => {
    if (!initialVisitId) return;
    clearReceipt();
    setMatches([]);
    const generation = ++requestGeneration.current;
    setBusy(true);
    setError('');
    void loadContext(initialVisitId, generation)
      .catch((err) => {
        if (generation === requestGeneration.current)
          setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.');
      })
      .finally(() => {
        if (generation === requestGeneration.current) setBusy(false);
      });
  }, [initialVisitId, loadContext, clearReceipt]);
  const search = async (value: string) => {
    if (busy) return;
    const code = extractContainerNumber(value);
    if (!code) {
      setError('Số container gồm 4 chữ cái và 7 chữ số.');
      return;
    }
    clearReceipt();
    setContainerNo(code);
    setMatches([]);
    const generation = ++requestGeneration.current;
    setBusy(true);
    setError('');
    setCamera(false);
    try {
      const result = (await gateInApi.searchContainerVisits(code)) as {
        data: Array<{ id: string; state: string; container: { containerNumber: string } }>;
      };
      const matches = result.data.filter(
        (row) =>
          row.container.containerNumber === code && ['PENDING', 'AUTHORIZED'].includes(row.state),
      );
      if (!matches.length)
        throw new Error(
          'Không có lượt container chờ tiếp nhận phù hợp. Kiểm tra số container hoặc trạng thái đã tiếp nhận.',
        );
      if (matches.length > 1) {
        setMatches(matches);
        return;
      }
      await loadContext(matches[0].id, generation);
    } catch (err) {
      if (generation === requestGeneration.current)
        setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.');
    } finally {
      if (generation === requestGeneration.current) setBusy(false);
    }
  };
  const selectVisit = async (id: string) => {
    clearReceipt();
    setBusy(true);
    setError('');
    const generation = ++requestGeneration.current;
    try {
      await loadContext(id, generation);
      setMatches([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.');
    } finally {
      setBusy(false);
    }
  };
  const review = () => {
    if (!context || busy || online === false) return;
    const invalid =
      getGateInBlocker(context) ||
      validateGateInInput({
        truckVisitId,
        actualSeal: seal,
        actualWeight: weight,
        expectedSeal: context.containerVisit.expectedSeal || '',
        conditionNotes: notes,
      });
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('');
    setConfirmOpen(true);
  };
  const confirm = async () => {
    if (!context || busy || online === false) return;
    const invalid = validateGateInInput({
      truckVisitId,
      actualSeal: seal,
      actualWeight: weight,
      expectedSeal: context.containerVisit.expectedSeal || '',
      conditionNotes: notes,
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await gateInApi.confirm(visitId, {
        truckVisitId,
        actualSeal: seal.trim().toUpperCase(),
        actualWeight: weight.trim() ? Number(weight) : undefined,
        conditionCode: condition,
        conditionNotes: notes.trim() || undefined,
      });
      setConfirmOpen(false);
      navigation.replace('GateInSuccess', {
        visitId,
        containerNumber: context.containerVisit.container.containerNumber,
      });
    } catch (err) {
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : 'Không thể xác nhận gate-in.');
    } finally {
      setBusy(false);
    }
  };
  const truck = context?.eligibleTruckVisits.find((row) => row.id === truckVisitId);
  const blocker = context ? getGateInBlocker(context) : null;
  const eligibleTrucks = context ? getEligibleGateInTrucks(context.eligibleTruckVisits) : [];
  const editable = !!context && !busy && !blocker && online !== false;
  return (
    <Card title="Biên nhận Cổng vào (Gate-In EIR)">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Số Container*"
            value={containerNo}
            onChangeText={(value) => {
              setContainerNo(value.toUpperCase());
              clearReceipt();
              setMatches([]);
              requestGeneration.current++;
            }}
            autoCapitalize="characters"
            placeholder="VD: TEMU8829104"
            editable={!busy}
            onSubmitEditing={() => void search(containerNo)}
          />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tìm hồ sơ container"
          disabled={busy}
          onPress={() => void search(containerNo)}
          style={[
            styles.chip,
            {
              width: 40,
              alignItems: 'center',
              paddingHorizontal: 0,
              backgroundColor: theme.colors.infoBackground,
            },
          ]}
        >
          <Search size={17} color={theme.colors.info} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Quét mã container"
          disabled={busy}
          onPress={() => setCamera(true)}
          style={[styles.chip, { width: 40, alignItems: 'center', paddingHorizontal: 0 }]}
        >
          <Scan size={17} color={theme.colors.info} />
        </TouchableOpacity>
      </View>
      <CodeScanner
        visible={camera && !busy}
        focused={focused}
        mode="CONTAINER"
        onClose={() => setCamera(false)}
        onScan={(value) => {
          setCamera(false);
          void search(value);
        }}
      />
      {error ? <Notice message={error} /> : null}
      {matches.length > 1 ? (
        <SelectField
          label="Chọn lượt container cần tiếp nhận"
          value=""
          disabled={busy}
          onChange={(id) => void selectVisit(id)}
          options={matches.map((row) => ({
            value: row.id,
            label: `${row.container.containerNumber} · ${row.state} · ${row.id.slice(-8)}`,
          }))}
        />
      ) : null}
      {eligibleTrucks.length > 1 ? (
        <SelectField
          label="Chọn xe đã đến cổng"
          value={truckVisitId}
          disabled={busy}
          onChange={setTruckVisitId}
          options={eligibleTrucks.map((row) => ({
            value: row.id,
            label: (row.vehiclePlate || row.truckPlate || '') + ' · ' + (row.driverName || ''),
          }))}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Biển số đầu kéo*"
            value={truck?.vehiclePlate || truck?.truckPlate || ''}
            editable={false}
            placeholder="Theo lượt xe"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Số Seal thực tế*"
            value={seal}
            onChangeText={setSeal}
            autoCapitalize="characters"
            placeholder="Seal đã kiểm tra"
            editable={editable}
          />
        </View>
      </View>
      {context ? (
        <Text style={styles.muted}>
          Lệnh: {context.movementOrder?.status || 'Chưa có'} · Seal khai báo:{' '}
          {context.containerVisit.expectedSeal || '—'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Tài xế nhận hàng*"
            value={truck?.driverName || ''}
            editable={false}
            placeholder="Theo lượt xe"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Cân Gross (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="Kết quả cân"
            editable={editable}
          />
        </View>
      </View>
      <SelectField
        label="Tình trạng vỏ container"
        value={condition}
        options={[
          { value: 'GOOD', label: 'Vỏ tốt, seal nguyên' },
          { value: 'DAMAGED', label: 'Vỏ hư hỏng' },
          { value: 'DIRTY', label: 'Vỏ bẩn' },
          { value: 'SEAL_BROKEN', label: 'Seal bị đứt' },
        ]}
        onChange={setCondition}
        disabled={!editable}
      />
      <Field
        label="Ghi chú hiện trường"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Ghi nhận bất thường / seal lệch hồ sơ"
        editable={editable}
      />
      {blocker ? <Notice message={blocker} /> : null}
      {context && !truckVisitId ? (
        <Text style={styles.muted}>Cần chọn xe đã đến cổng hoặc đang tiếp nhận container.</Text>
      ) : null}
      <PrimaryButton
        title={
          context?.alreadyReceived ? 'Container đã được tiếp nhận' : 'Xác nhận tiếp nhận Gate-In'
        }
        onPress={review}
        disabled={!editable || !truckVisitId}
        loading={busy}
      />
      {context ? (
        <PrimaryButton
          variant="secondary"
          title="Kiểm tra lại hồ sơ"
          disabled={busy}
          onPress={() => void selectVisit(visitId)}
        />
      ) : null}
      <TruckArrival
        onArrived={() => {
          if (visitId && context) void selectVisit(visitId);
        }}
      />
      <ActionDialog
        requiresOnline
        visible={confirmOpen}
        title="Xác nhận biên nhận cổng vào"
        message={`${containerNo}\nXe: ${truck?.vehiclePlate || truck?.truckPlate || '—'}\nSeal thực tế: ${seal}\nCân Gross: ${weight || 'Chưa nhập'}${weight ? ' kg' : ''}\n${notes ? 'Ghi chú: ' + notes : ''}`}
        confirmLabel="Tiếp nhận container"
        busy={busy}
        onConfirm={() => void confirm()}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
