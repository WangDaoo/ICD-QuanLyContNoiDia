import { Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenLayout, Card, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useAuth } from '../../auth/hooks/useAuth';
import { canAccessMobileScreen } from '../../auth/permissions';
import type { MainTabParamList, GateStackParamList } from '../../../navigation/types';
export function GateInSuccessScreen() {
  const fieldStyles = useFieldStyles();
  const navigation = useNavigation<CompositeNavigationProp<NativeStackNavigationProp<GateStackParamList>, BottomTabNavigationProp<MainTabParamList>>>();
  const {params} = useRoute<RouteProp<GateStackParamList,'GateInSuccess'>>();
  const {user} = useAuth();
  return <ScreenLayout title="Biên nhận tiếp nhận" subtitle={params.containerNumber}>
    <Notice success message="Backend đã xác nhận tiếp nhận container vào ICD." />
    <Card title={params.containerNumber}><Text style={fieldStyles.value}>Tiếp nhận thành công</Text><Text style={fieldStyles.muted}>Bước tiếp theo là xếp vị trí bãi. Nhân viên có quyền bãi sẽ nhận công việc từ máy chủ.</Text></Card>
    {canAccessMobileScreen(user,'yard.assign') ? <PrimaryButton title="XẾP VỊ TRÍ BÃI" onPress={() => navigation.navigate('YardTab',{screen:'YardAssignment',params:{visitId:params.visitId,containerNo:params.containerNumber}})} /> : null}
    <PrimaryButton title="TIẾP NHẬN CONTAINER TIẾP THEO" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'GateInScan' }] })} />
    <PrimaryButton title="VỀ DANH SÁCH CÔNG VIỆC" variant="secondary" onPress={() => navigation.navigate('WorkQueueTab')} />
  </ScreenLayout>;
}
