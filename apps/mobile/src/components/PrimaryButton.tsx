import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/theme';
import { useApiConnection } from '../services/api/ApiConnectionProvider';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  requiresOnline?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  requiresOnline = false,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { online, writesReady } = useApiConnection();
  const isActionDisabled = disabled || loading || (requiresOnline && (online === false || writesReady === false));

  const getBackgroundColor = () => {
    if (isActionDisabled) return theme.colors.borderDark;
    switch (variant) {
      case 'danger':
        return theme.colors.dangerButton;
      case 'secondary':
        return theme.colors.surface;
      case 'primary':
      default:
        return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (isActionDisabled) return theme.colors.textMuted;
    if (variant === 'secondary') return theme.colors.textPrimary;
    if (variant === 'danger') return theme.colors.onDangerButton;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.colors.borderDark,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isActionDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: loading }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  text: {
    ...theme.typography.bodyBold,
  },
});
