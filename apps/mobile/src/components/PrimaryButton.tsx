import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { theme } from '../theme/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const isActionDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isActionDisabled) return theme.colors.borderDark;
    switch (variant) {
      case 'danger':
        return theme.colors.danger;
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
    return theme.colors.surface;
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
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? theme.colors.primary : theme.colors.surface}
        />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    ...theme.typography.bodyBold,
  },
});
