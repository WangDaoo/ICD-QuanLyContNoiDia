import { Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';

export function SessionCard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  if (!user) return null;
  return <View style={{ padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <ShieldCheck size={14} color={theme.colors.info} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, flex: 1 }}>PHIÊN ĐĂNG NHẬP CA TRỰC</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.success, backgroundColor: theme.colors.successBackground, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>ĐÃ ĐĂNG NHẬP</Text>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, flex: 1 }}>Tài khoản: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{user.name}</Text></Text>
      <Text style={{ color: theme.colors.info, fontSize: 10, fontWeight: '700' }}>{user.roleCodes.join(' / ')}</Text>
    </View>
  </View>;
}
