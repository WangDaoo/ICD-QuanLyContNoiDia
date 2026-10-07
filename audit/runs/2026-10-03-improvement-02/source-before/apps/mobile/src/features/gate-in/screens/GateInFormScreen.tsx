import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ScreenLayout } from '../../../components/ScreenLayout';
import { GateModeSwitch } from '../../../components/GateModeSwitch';
import { GateInReceipt } from '../components/GateInReceipt';
import type { GateStackParamList } from '../../../navigation/types';
export function GateInFormScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<GateStackParamList, 'GateInForm'>>();
  return <ScreenLayout title="Biên nhận Cổng vào" onBack={() => navigation.goBack()}><GateModeSwitch mode="IN" /><GateInReceipt initialVisitId={params.visitId} /></ScreenLayout>;
}
