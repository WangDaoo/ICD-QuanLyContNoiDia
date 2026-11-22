import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Bell, UserRound } from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation/types';
import { layout } from '../theme/layout';

export function AppHeader({ title, subtitle, onBack, rightAction }: {
  title: string; subtitle?: string; onBack?: () => void; rightAction?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const button = { minWidth: layout.touchTarget, minHeight: layout.touchTarget,
    alignItems: 'center', justifyContent: 'center', borderRadius: theme.borderRadius.sm } as const;
  return <View style={{ backgroundColor: theme.colors.chrome, paddingTop: insets.top,
    paddingHorizontal: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 60 }}>
      {onBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={button}>
        <ArrowLeft size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity> : null}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: theme.spacing.sm }}>
        <Text accessibilityRole="header" style={{ ...theme.typography.h3, color: theme.colors.textPrimary }}>{title}</Text>
        {subtitle ? <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{subtitle}</Text> : null}
      </View>
      {rightAction || <TouchableOpacity accessibilityRole="button" accessibilityLabel="Thông báo"
        onPress={() => navigation.navigate('Notifications')} style={button}>
        <Bell size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tài khoản và kết thúc ca"
        onPress={() => navigation.navigate('Account')} style={button}>
        <UserRound size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  </View>;
}
