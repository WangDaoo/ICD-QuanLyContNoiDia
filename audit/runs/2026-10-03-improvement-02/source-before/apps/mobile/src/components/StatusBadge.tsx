import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/theme';

export type StatusVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
}

const createVariantStyles = (theme: Theme): Record<
  StatusVariant,
  { bg: string; text: string; border: string }
> => ({
  primary: {
    bg: theme.colors.infoBackground,
    text: theme.colors.info,
    border: theme.colors.primaryLight,
  },
  success: {
    bg: theme.colors.successBackground,
    text: theme.colors.successText,
    border: '#A6F4C5',
  },
  warning: {
    bg: theme.colors.warningBackground,
    text: theme.colors.warningText,
    border: '#FEDF89',
  },
  danger: {
    bg: theme.colors.dangerBackground,
    text: theme.colors.dangerText,
    border: '#FECDCA',
  },
  info: {
    bg: theme.colors.infoBackground,
    text: theme.colors.info,
    border: '#B2DDFF',
  },
  neutral: {
    bg: theme.colors.surfaceSubtle,
    text: theme.colors.textSecondary,
    border: theme.colors.border,
  },
});

export function StatusBadge({
  label,
  variant = 'neutral',
  size = 'md',
}: StatusBadgeProps) {
  const { theme } = useTheme();
  const variantStyles = createVariantStyles(theme);
  const styles = createStyles(theme);
  const styleConfig = variantStyles[variant] || variantStyles.neutral;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: styleConfig.bg,
          borderColor: styleConfig.border,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 8,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: styleConfig.text,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  badge: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
