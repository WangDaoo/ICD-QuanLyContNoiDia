import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { AppHeader } from './AppHeader';
import type { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeProvider';
import { SessionCard } from './SessionCard';
import { ConnectionBanner } from './ConnectionBanner';
import { layout } from '../theme/layout';

export function ScreenLayout({ title, subtitle, onBack, children, refreshing, onRefresh }: PropsWithChildren<{
  title: string; subtitle?: string; onBack?: () => void; refreshing?: boolean; onRefresh?: () => void;
}>) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <KeyboardAvoidingView style={fieldStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <AppHeader title={title} subtitle={subtitle} onBack={onBack} />
    <ConnectionBanner />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={fieldStyles.content} keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} /> : undefined}>
      {!onBack ? <SessionCard /> : null}
      {children}
    </ScrollView>
  </KeyboardAvoidingView>;
}

export function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  const fieldStyles = useFieldStyles();
  return <View style={fieldStyles.card}>{title ? <Text accessibilityRole="header" style={fieldStyles.cardTitle}>{title}</Text> : null}{children}</View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <View style={{ gap: theme.spacing.sm, minWidth: 0 }}><Text style={fieldStyles.label}>{label}</Text><TextInput accessibilityLabel={label}
    accessibilityHint={error} placeholderTextColor={theme.colors.textMuted} {...props} style={[fieldStyles.input, props.multiline && { minHeight: layout.multilineInputMinHeight, textAlignVertical: 'top' }, error && { borderColor: theme.colors.danger }, props.style]} />
    {error ? <Text accessibilityLiveRegion="polite" style={{ ...theme.typography.caption, color: theme.colors.dangerText }}>{error}</Text> : null}</View>;
}

export function Notice({ message, success = false }: { message: string; success?: boolean }) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <View accessibilityLiveRegion="polite" style={[fieldStyles.notice, success && { backgroundColor: theme.colors.successBackground, borderColor: theme.colors.success }]}>
    <Text style={{ ...theme.typography.body, color: success ? theme.colors.successText : theme.colors.dangerText }}>{message}</Text>
  </View>;
}

export function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}><Text style={[fieldStyles.muted, { flex: 1 }]}>{label}</Text><Text selectable style={[fieldStyles.value, { flex: 1, textAlign: 'right' }]}>{value ?? '—'}</Text></View>;
}

const createFieldStyles = (theme: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: layout.hairlineBorder, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  cardTitle: { ...theme.typography.sectionHeading, color: theme.colors.textPrimary, borderBottomWidth: layout.hairlineBorder, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.sm },
  label: { ...theme.typography.captionBold, color: theme.colors.textSecondary },
  input: { ...theme.typography.body, backgroundColor: theme.colors.surfaceSubtle, color: theme.colors.textPrimary, minWidth: layout.touchTarget, minHeight: layout.touchTarget, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderWidth: layout.hairlineBorder, borderColor: theme.colors.borderDark, borderRadius: theme.borderRadius.md },
  value: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  muted: { ...theme.typography.caption, color: theme.colors.textMuted },
  notice: { padding: theme.spacing.md, borderWidth: layout.hairlineBorder, borderColor: theme.colors.danger, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.dangerBackground },
  chip: { minWidth: layout.touchTarget, minHeight: layout.touchTarget, borderWidth: layout.hairlineBorder, borderColor: theme.colors.borderDark, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
});

export const useFieldStyles = () => createFieldStyles(useTheme().theme);
