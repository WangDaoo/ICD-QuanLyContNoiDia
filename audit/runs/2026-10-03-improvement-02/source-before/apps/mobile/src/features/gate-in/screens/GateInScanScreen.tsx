import { ScreenLayout } from '../../../components/ScreenLayout';
import { GateModeSwitch } from '../../../components/GateModeSwitch';
import { GateInReceipt } from '../components/GateInReceipt';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { GateStackParamList } from '../../../navigation/types';
export function GateInScanScreen() {
  const { params } = useRoute<RouteProp<GateStackParamList, 'GateInScan'>>();
  return (
    <ScreenLayout title="Cổng">
      <GateModeSwitch mode="IN" />
      <GateInReceipt openScanner={params?.openScanner} />
    </ScreenLayout>
  );
}
