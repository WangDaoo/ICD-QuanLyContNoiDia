import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Camera, ClipboardList, Radio, Search, Truck, Warehouse } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkQueueScreen } from '../features/work-queue/screens/WorkQueueScreen';
import { MonitorScreen } from '../features/yard/screens/MonitorScreen';
import { GateNavigator } from './GateNavigator';
import { YardNavigator, LookupNavigator, SurveyNavigator } from './YardNavigator';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../features/auth/hooks/useAuth';
import { getTerminalTabs, getRegisteredTerminalTabs } from '../features/auth/permissions';
import { ForbiddenScreen } from '../components/ForbiddenScreen';
import type { MainTabParamList, RootStackParamList } from './types';
import { ResponsiveTabBar } from './ResponsiveTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();
const labels = { GateTab: 'Cổng', YardTab: 'Bãi', SurveyTab: 'Giám định', LookupTab: 'Tra cứu', WorkQueueTab: 'Việc ca', MonitorTab: 'Điều phối' };
const icons = { GateTab: Truck, YardTab: Warehouse, SurveyTab: Camera, LookupTab: Search, WorkQueueTab: ClipboardList, MonitorTab: Radio };
const screens = { GateTab: GateNavigator, YardTab: YardNavigator, SurveyTab: SurveyNavigator, LookupTab: LookupNavigator, WorkQueueTab: WorkQueueScreen, MonitorTab: MonitorScreen };

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const tabs = getTerminalTabs(user);
  if (!tabs.length) return <ForbiddenScreen message="Tài khoản chưa được cấp quyền sử dụng chức năng hiện trường. Liên hệ quản trị viên để được cấp quyền." onOpenAccount={() => navigation.navigate('Account')} />;
  return <Tab.Navigator tabBar={props => <ResponsiveTabBar {...props} visibleTabs={tabs} />} screenOptions={{ headerShown: false,
    tabBarStyle: { backgroundColor: theme.colors.chrome, borderTopColor: theme.colors.border, height: 62 + insets.bottom, paddingTop: 5, paddingBottom: Math.max(insets.bottom, 5) },
    tabBarActiveTintColor: theme.colors.info, tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600', lineHeight: 15 },
    tabBarHideOnKeyboard: true, tabBarLabelPosition: 'below-icon',
  }}>{getRegisteredTerminalTabs(user).map(name => {
    const Icon = icons[name];
    const hidden = !tabs.includes(name);
    return <Tab.Screen key={name} name={name} component={screens[name]} options={{ tabBarLabel: labels[name],
      tabBarButton: hidden ? () => null : undefined, tabBarItemStyle: hidden ? { display: 'none' } : undefined,
      tabBarIcon: ({ color }) => <Icon size={20} strokeWidth={1.8} color={color} /> }} />;
  })}</Tab.Navigator>;
}
