import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScreenLayout,
  Card,
  DetailRow,
  Notice,
  useFieldStyles,
} from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { LoadingState } from '../../../components/LoadingState';
import { ActionDialog } from '../../../components/ActionDialog';
import { gateOutApi } from '../api/gate-out.api';
import type { GatePassScan } from '../api/gate-out.api';
import {
  canReviewGateOut,
  confirmGateOutReceipt,
  type GateOutReceipt,
} from '../gate-out-confirmation';
import { explainGateBlocker } from '../gate-readiness';
import { useApiConnection } from '../../../services/api/ApiConnectionProvider';
import { useTheme } from '../../../theme/ThemeProvider';
import type { GateStackParamList } from '../../../navigation/types';

export function GateOutConfirmScreen() {
  const { theme } = useTheme();
  const { online } = useApiConnection();
  const fieldStyles = useFieldStyles();
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const { params } = useRoute<RouteProp<GateStackParamList, 'GateOutConfirm'>>();
  const [scan, setScan] = useState<GatePassScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<GateOutReceipt | null>(null);
  const [holding, setHolding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setScan(null);
    setError(null);
    setReceipt(null);
    setConfirmOpen(false);
    void gateOutApi
      .scan(params.qrToken)
      .then((data) => {
        if (active) setScan(data);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : 'Không thể kiểm tra điều kiện ra cổng.');
      });
    return () => {
      active = false;
    };
  }, [params.qrToken]);
  const review = async (openConfirmation = true) => {
    if (inFlight.current || receipt || online === false) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setHolding(false);
    try {
      const current = await gateOutApi.scan(params.qrToken);
      setScan(current);
      if (!canReviewGateOut(current, params.visitId))
        throw new Error(
          'Phiếu không còn đủ điều kiện ra cổng. Kiểm tra trạng thái và các lý do bên dưới.',
        );
      if (openConfirmation) setConfirmOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kiểm tra điều kiện ra cổng.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const handleConfirm = async () => {
    if (inFlight.current || receipt || online === false) return;
    if (!canReviewGateOut(scan, params.visitId)) {
      setConfirmOpen(false);
      setError('Phiếu đã hết hạn hoặc không còn đủ điều kiện. Vui lòng kiểm tra lại.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmGateOutReceipt(
        params.visitId,
        params.qrToken,
        gateOutApi.confirm,
      );
      setReceipt(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xác nhận gate-out.');
    } finally {
      inFlight.current = false;
      setBusy(false);
      setConfirmOpen(false);
      setHolding(false);
    }
  };
  const eligible = online !== false && canReviewGateOut(scan, params.visitId);
  return (
    <ScreenLayout
      title="Xác nhận xe ra cổng"
      subtitle={params.containerNo}
      onBack={() => navigation.goBack()}
    >
      {!scan && !error ? <LoadingState /> : null}
      {scan ? (
        <Card title={scan.container.containerNumber}>
          <DetailRow label="Phiếu ra cổng" value={scan.gatePass.code} />
          <DetailRow
            label="Trạng thái phiếu"
            value={receipt ? 'Đã sử dụng' : scan.gatePass.status}
          />
          <DetailRow label="Biển số xe" value={scan.gatePass.vehiclePlate} />
          <DetailRow label="Người nhận" value={scan.gatePass.receiverName} />
          <DetailRow
            label="Hết hạn"
            value={new Date(scan.gatePass.expiresAt).toLocaleString('vi-VN')}
          />
          {receipt ? (
            <DetailRow
              label="Đã ra cổng lúc"
              value={new Date(receipt.gateOutAt).toLocaleString('vi-VN')}
            />
          ) : null}
          <Notice
            success={!!receipt || eligible}
            message={
              receipt
                ? 'Máy chủ xác nhận: container đã rời ICD (EXITED).'
                : eligible
                  ? 'Đủ điều kiện ra cổng. Xác nhận khi xe được phép ra cổng.'
                  : 'Phiếu không đủ điều kiện ra cổng. Kiểm tra trạng thái, hạn phiếu và các lý do bên dưới.'
            }
          />
          {!receipt
            ? scan.readiness.blockers.map((b, i) => (
                <Text key={i} style={fieldStyles.value}>
                  {explainGateBlocker(b)}
                </Text>
              ))
            : null}
        </Card>
      ) : null}
      {error ? <Notice message={error} /> : null}
      {!receipt ? (
        <>
          {Platform.OS === 'web' ? (
            <PrimaryButton
              requiresOnline
              title="Xem lại & xác nhận gate-out"
              onPress={() => void review()}
              disabled={!eligible}
              loading={busy}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Giữ 2 giây để mở xác nhận gate-out"
              accessibilityState={{ disabled: !eligible || busy }}
              disabled={!eligible || busy}
              delayLongPress={2000}
              onPressIn={() => setHolding(true)}
              onPressOut={() => setHolding(false)}
              onLongPress={() => void review()}
              style={{
                minHeight: 56,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
                borderRadius: 10,
                backgroundColor:
                  !eligible || busy
                    ? theme.colors.borderDark
                    : holding
                      ? theme.colors.primaryDark
                      : theme.colors.primary,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                {busy
                  ? 'Đang kiểm tra với máy chủ…'
                  : holding
                    ? 'Tiếp tục giữ để mở xác nhận…'
                    : 'Giữ 2 giây · Xác nhận gate-out'}
              </Text>
            </Pressable>
          )}
          <PrimaryButton
            variant="secondary"
            requiresOnline
            title="Kiểm tra lại điều kiện ra cổng"
            disabled={busy}
            onPress={() => void review(false)}
          />
        </>
      ) : (
        <PrimaryButton
          title="Quét phiếu tiếp theo"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'GatePassScan' }] })}
        />
      )}
      <ActionDialog
        requiresOnline
        visible={confirmOpen}
        title="Cho phép xe ra cổng?"
        message={`${scan?.container.containerNumber || params.containerNo}\nPhiếu: ${scan?.gatePass.code || ''}\nXe: ${scan?.gatePass.vehiclePlate || '—'}\nChỉ xác nhận khi xe thực tế được phép rời ICD.`}
        confirmLabel="Xác nhận xe đã ra"
        busy={busy}
        onConfirm={() => void handleConfirm()}
        onClose={() => setConfirmOpen(false)}
      />
    </ScreenLayout>
  );
}
