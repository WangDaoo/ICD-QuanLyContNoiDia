import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorState({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu từ máy chủ.',
  onRetry,
  retryText = 'Thử lại',
}: ErrorStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={retryText} style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{retryText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.dangerText,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  buttonText: {
    ...theme.typography.bodyBold,
    color: '#FFFFFF',
  },
});
