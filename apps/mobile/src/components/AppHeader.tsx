import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, Bell, LogOut, Moon, Scan, Sun } from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';
import { canAccessMobileScreen } from '../features/auth/permissions';
import type { RootStackParamList } from '../navigation/types';
import { layout } from '../theme/layout';
import { displayCode } from '../presentation/labels';

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
  const compact = width < layout.dialogMaxWidth || fontScale > 1.2;
  const { user } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const role = user?.roleCodes[0] || 'ICD FIELD';
  const roleTitle: Record<string, string> = {
    ADMIN: 'Quản trị viên Hệ thống',
    MANAGER: 'Điều hành Vận hành',
    GATE_STAFF: 'Nhân viên cổng',
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
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
    borderWidth: layout.hairlineBorder,
    borderColor: theme.colors.border,
  } as const;
  return (
    <View
      style={{
        backgroundColor: theme.colors.chrome,
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: layout.hairlineBorder,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flex: compact ? undefined : 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onBack}
              style={{ minWidth: layout.touchTarget, minHeight: layout.touchTarget, justifyContent: 'center', alignItems: 'center' }}
            >
              <ArrowLeft size={layout.headerBackIcon} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: theme.spacing.sm,
                  height: theme.spacing.sm,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: user ? theme.colors.success : theme.colors.textMuted,
                }}
              />
              <Text
                style={{
                  ...theme.typography.bodyBold,
                  color: theme.colors.textPrimary,
                }}
              >
                TOS-MOBILE
              </Text>
              <Text
                style={{
                  ...theme.typography.captionBold,
                  color: theme.colors.dangerText,
                  backgroundColor: theme.colors.dangerBackground,
                  borderRadius: theme.borderRadius.xs,
                  padding: theme.spacing.xs,
                  flexShrink: 1,
                }}
              >
                {displayCode(role)}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{ ...theme.typography.sectionHeading, color: theme.colors.textPrimary, marginTop: theme.spacing.xs }}
            >
              {title}
            </Text>
            {subtitle ? <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{subtitle}</Text> : !onBack ? <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{roleTitle[role] || 'Tài khoản hiện trường'}</Text> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'flex-end' }}>
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
              <Sun size={layout.headerActionIcon} color={theme.colors.warning} />
            ) : (
              <Moon size={layout.headerActionIcon} color={theme.colors.warning} />
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
                minWidth: layout.touchTarget,
                minHeight: layout.touchTarget,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.dangerButton,
                flexDirection: 'row',
                gap: theme.spacing.xs,
                alignItems: 'center',
              }}
            >
              <Scan size={layout.headerScanIcon} color={theme.colors.onDangerButton} />
              <Text style={{ ...theme.typography.captionBold, color: theme.colors.onDangerButton }}>Quét</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            onPress={() => navigation.navigate('Notifications')}
            style={iconButton}
          >
            <Bell size={layout.headerActionIcon} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tài khoản và kết thúc ca"
            onPress={() => navigation.navigate('Account')}
            style={[iconButton, { backgroundColor: theme.colors.dangerBackground }]}
          >
            <LogOut size={layout.headerActionIcon} color={theme.colors.danger} />
          </TouchableOpacity>
          {rightAction}
        </View>
      </View>
    </View>
  );
}
