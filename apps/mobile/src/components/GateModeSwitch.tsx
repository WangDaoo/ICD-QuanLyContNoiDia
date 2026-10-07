import { Text, TouchableOpacity, View } from 'react-native';
import { Truck, QrCode } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GateStackParamList } from '../navigation/types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { canAccessMobileScreen } from '../features/auth/permissions';
import { useTheme } from '../theme/ThemeProvider';

export function GateModeSwitch({ mode }: { mode: 'IN' | 'OUT' }) {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  return <View style={{ flexDirection: 'row', padding: theme.spacing.xs, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.borderDark, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.lg }}>
    {([{ key: 'IN', label: 'Tiếp nhận vào cổng', Icon: Truck, permission: 'gate.in', route: 'GateInScan' },
      { key: 'OUT', label: 'Quét phiếu ra cổng', Icon: QrCode, permission: 'gate.out', route: 'GatePassScan' }] as const).filter(item => canAccessMobileScreen(user, item.permission)).map(({ key, label, Icon, route }) =>
      <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: mode === key }} onPress={() => navigation.navigate(route)} style={{ flex: 1, minWidth: 48, minHeight: 48, paddingHorizontal: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: mode === key ? key === 'IN' ? '#2563EB' : theme.colors.successButton : 'transparent' }}>
        <Icon size={15} color={mode === key ? '#FFFFFF' : theme.colors.textMuted} />
        <Text style={{ ...theme.typography.captionBold, flexShrink: 1, textAlign: 'center', color: mode === key ? '#FFFFFF' : theme.colors.textSecondary }}>{label}</Text>
      </TouchableOpacity>)}
  </View>;
}
