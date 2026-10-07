import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

type ForbiddenScreenProps = {
  title?: string;
  message?: string;
  onOpenAccount?: () => void;
};

export function ForbiddenScreen({
  title = 'Không có quyền truy cập',
  message = 'Tài khoản hiện tại không được phân quyền nghiệp vụ này.',
  onOpenAccount,
}: ForbiddenScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔒</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {onOpenAccount ? <PrimaryButton title="Mở tài khoản" onPress={onOpenAccount} style={{ alignSelf: 'stretch', marginTop: theme.spacing.lg }} /> : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
