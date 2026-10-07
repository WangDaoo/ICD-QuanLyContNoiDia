import { displayCode } from '../../../presentation/labels';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { CodeScanner } from '../../../components/CodeScanner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScreenLayout,
  Card,
  Field,
  Notice,
  DetailRow,
  useFieldStyles,
} from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { gateOutApi } from '../api/gate-out.api';
import type { GatePassScan } from '../api/gate-out.api';
import type { GateStackParamList } from '../../../navigation/types';
import { explainGateBlocker } from '../gate-readiness';
import { GateModeSwitch } from '../../../components/GateModeSwitch';

export function GatePassScanScreen() {
  const fieldStyles = useFieldStyles();
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const focused = useIsFocused();
  const { params } = useRoute<RouteProp<GateStackParamList, 'GatePassScan'>>();
  const [camera, setCamera] = useState(false);
  const [token, setToken] = useState('');
  const [scan, setScan] = useState<GatePassScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (params?.openScanner && focused) {
      setCamera(true);
      navigation.setParams({ openScanner: false });
    }
  }, [params?.openScanner, focused, navigation]);
  const handleScan = async (value: string) => {
    if (!value.trim()) {
      setError('Vui lòng nhập QR token của phiếu ra cổng.');
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      setCamera(false);
      setError(null);
      setScan(null);
      setToken(value.trim());
      const response = await gateOutApi.scan(value.trim());
      setScan(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xác thực phiếu.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <ScreenLayout title="Cổng · Quét phiếu ra" subtitle="Máy chủ kiểm tra readiness và hạn phiếu">
      <GateModeSwitch mode="OUT" />
      <Card title="Xác thực phiếu ra cổng">
        <Field
          label="Nội dung QR đầy đủ *"
          value={token}
          onChangeText={(value) => {
            setToken(value);
            setScan(null);
          }}
          placeholder="gp1.… (nội dung đầy đủ từ mã QR)"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          editable={!loading}
        />
        <PrimaryButton
          title="Kiểm tra phiếu & readiness"
          loading={loading}
          onPress={() => void handleScan(token)}
        />
        <PrimaryButton
          variant="secondary"
          title="Quét QR bằng camera"
          disabled={loading}
          onPress={() => setCamera(true)}
        />
        <Text style={fieldStyles.muted}>
          Dán toàn bộ nội dung QR có chữ ký (bắt đầu bằng gp1.). Mã phiếu như GP-001 không thay thế
          được QR.
        </Text>
        <CodeScanner
          visible={camera && !loading}
          focused={focused}
          mode="GATE_PASS"
          onClose={() => setCamera(false)}
          onScan={(value) => {
            setCamera(false);
            void handleScan(value);
          }}
        />
      </Card>
      {error ? <Notice message={error} /> : null}
      {scan ? (
        <Card title={scan.container.containerNumber}>
          <DetailRow label="Phiếu ra cổng" value={scan.gatePass.code} />
          <DetailRow label="Trạng thái phiếu" value={displayCode(scan.gatePass.status)} />
          <Notice
            success={scan.canGateOut}
            message={
              scan.canGateOut ? 'Đủ điều kiện xác nhận ra cổng.' : 'Chưa đủ điều kiện ra cổng.'
            }
          />
          {scan.readiness.blockers.map((b, i) => (
            <Text key={i} style={fieldStyles.value}>
              {explainGateBlocker(b)}
            </Text>
          ))}
          <PrimaryButton
            title="Mở màn xác nhận gate-out"
            disabled={!scan.canGateOut || !scan.visitId}
            onPress={() =>
              navigation.navigate('GateOutConfirm', {
                visitId: scan.visitId,
                qrToken: token,
                gatePassId: scan.gatePass.id,
                containerNo: scan.container.containerNumber,
              })
            }
          />
        </Card>
      ) : null}
    </ScreenLayout>
  );
}
