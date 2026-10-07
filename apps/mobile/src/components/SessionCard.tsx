import { Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';
import { displayCode } from '../presentation/labels';

export function SessionCard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  if (!user) return null;
  return <View style={{ padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: theme.spacing.sm }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
      <ShieldCheck size={14} color={theme.colors.info} />
      <Text accessibilityRole="header" style={{ ...theme.typography.compactHeading, color: theme.colors.textSecondary, flexGrow: 1, flexShrink: 1 }}>PHIÊN ĐĂNG NHẬP CA TRỰC</Text>
      <Text style={{ ...theme.typography.captionBold, color: theme.colors.successText, backgroundColor: theme.colors.successBackground, borderRadius: theme.borderRadius.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, flexShrink: 1 }}>ĐÃ ĐĂNG NHẬP</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm }}>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted, flexGrow: 1, flexShrink: 1 }}>Tài khoản: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{user.name}</Text></Text>
      <Text style={{ ...theme.typography.captionBold, color: theme.colors.info, flexShrink: 1 }}>{user.roleCodes.map(displayCode).join(' / ')}</Text>
    </View>
  </View>;
}
