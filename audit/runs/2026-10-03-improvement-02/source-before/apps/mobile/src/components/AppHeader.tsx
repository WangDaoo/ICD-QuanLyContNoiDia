import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, Bell, LogOut, Moon, Scan, Sun } from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';
import { canAccessMobileScreen } from '../features/auth/permissions';
import type { RootStackParamList } from '../navigation/types';

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 480 || fontScale > 1.2;
  const { user } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const role = user?.roleCodes[0] || 'ICD FIELD';
  const roleTitle: Record<string, string> = {
    ADMIN: 'Quản trị viên Hệ thống',
    MANAGER: 'Điều hành Vận hành',
    GATE_STAFF: 'Trực Cổng (Gate Lanes)',
    YARD_STAFF: 'Bãi Container & Giám Định',
    OPERATOR: 'Điều độ Hiện trường',
    CONSIGNEE: 'Chủ hàng Tra cứu',
    AGENT: 'Đại lý Tra cứu',
  };
  const goScan = () =>
    navigation.navigate(
      'Main',
      canAccessMobileScreen(user, 'gate.in')
        ? { screen: 'GateTab', params: { screen: 'GateInScan', params: { openScanner: true } } }
        : canAccessMobileScreen(user, 'gate.out')
          ? { screen: 'GateTab', params: { screen: 'GatePassScan', params: { openScanner: true } } }
          : { screen: 'LookupTab', params: { screen: 'ContainerSearch' } },
    );
  const iconButton = {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as const;
  return (
    <View
      style={{
        backgroundColor: theme.colors.chrome,
        paddingTop: insets.top + 8,
        paddingBottom: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <View style={{ flex: compact ? undefined : 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onBack}
              style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
            >
              <ArrowLeft size={17} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: user ? theme.colors.success : theme.colors.textMuted,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                  color: theme.colors.textPrimary,
                }}
              >
                TOS-MOBILE
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  color: theme.colors.dangerText,
                  backgroundColor: theme.colors.dangerBackground,
                  borderRadius: 3,
                  padding: 3,
                  flexShrink: 1,
                }}
              >
                {role}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}
            >
              {onBack ? title : roleTitle[role] || subtitle || title}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={mode === 'LIGHT' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
            onPress={toggleTheme}
            style={[
              iconButton,
              {
                borderColor: theme.colors.warning,
                backgroundColor: theme.colors.warningBackground,
              },
            ]}
          >
            {mode === 'LIGHT' ? (
              <Sun size={15} color={theme.colors.warning} />
            ) : (
              <Moon size={15} color={theme.colors.warning} />
            )}
          </TouchableOpacity>
          {canAccessMobileScreen(user, 'container.read') ||
          canAccessMobileScreen(user, 'gate.in') ||
          canAccessMobileScreen(user, 'gate.out') ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quét mã"
              onPress={goScan}
              style={{
                minWidth: 48,
                minHeight: 48,
                paddingHorizontal: 7,
                borderRadius: 6,
                backgroundColor: '#DC2626',
                flexDirection: 'row',
                gap: 3,
                alignItems: 'center',
              }}
            >
              <Scan size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>Quét</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            onPress={() => navigation.navigate('Notifications')}
            style={iconButton}
          >
            <Bell size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tài khoản và kết thúc ca"
            onPress={() => navigation.navigate('Account')}
            style={[iconButton, { backgroundColor: theme.colors.dangerBackground }]}
          >
            <LogOut size={15} color={theme.colors.danger} />
          </TouchableOpacity>
          {rightAction}
        </View>
      </View>
    </View>
  );
}
