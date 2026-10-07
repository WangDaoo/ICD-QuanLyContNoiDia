import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/theme';

interface EmptyStateProps {
  title?: string;
  description?: string;
  iconText?: string;
}

export function EmptyState({
  title = 'Không có dữ liệu',
  description = 'Hiện tại không có thông tin để hiển thị.',
  iconText,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      {iconText ? <Text style={styles.icon}>{iconText}</Text> : <ClipboardList size={24} strokeWidth={1.5} color={theme.colors.textMuted} style={{ marginBottom: 10 }} />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
