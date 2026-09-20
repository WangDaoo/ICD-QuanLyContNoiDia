import { colors } from './colors';
import { borderRadius, spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
} as const;

export type Theme = typeof theme;
