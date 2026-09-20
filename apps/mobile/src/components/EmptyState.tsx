import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface EmptyStateProps {
  title?: string;
  description?: string;
  iconText?: string;
}

export function EmptyState({
  title = 'Không có dữ liệu',
  description = 'Hiện tại không có thông tin để hiển thị.',
  iconText = '📋',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{iconText}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
