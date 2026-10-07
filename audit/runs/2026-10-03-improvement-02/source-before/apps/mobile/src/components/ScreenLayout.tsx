import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { AppHeader } from './AppHeader';
import type { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeProvider';
import { SessionCard } from './SessionCard';
import { ConnectionBanner } from './ConnectionBanner';

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
  return <View style={fieldStyles.card}>{title ? <Text style={fieldStyles.cardTitle}>{title}</Text> : null}{children}</View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <View style={{ gap: 5, minWidth: 0 }}><Text style={fieldStyles.label}>{label}</Text><TextInput accessibilityLabel={label}
    placeholderTextColor={theme.colors.textMuted} {...props} style={[fieldStyles.input, props.multiline && { minHeight: 74, textAlignVertical: 'top' }, props.style]} /></View>;
}

export function Notice({ message, success = false }: { message: string; success?: boolean }) {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  return <View accessibilityLiveRegion="polite" style={[fieldStyles.notice, success && { backgroundColor: theme.colors.successBackground, borderColor: theme.colors.success }]}>
    <Text style={{ ...theme.typography.body, color: success ? theme.colors.successText : theme.colors.dangerText }}>{message}</Text>
  </View>;
}

export function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const fieldStyles = useFieldStyles();
  return <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}><Text style={[fieldStyles.muted, { flex: 1 }]}>{label}</Text><Text selectable style={[fieldStyles.value, { flex: 1, textAlign: 'right' }]}>{value ?? '—'}</Text></View>;
}

const createFieldStyles = (theme: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 14, gap: 14, paddingBottom: 24, flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700', lineHeight: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  label: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600', lineHeight: 16 },
  input: { backgroundColor: theme.colors.surfaceSubtle, color: theme.colors.textPrimary, fontSize: 13, minWidth: 48, minHeight: 48, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 8 },
  value: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  muted: { ...theme.typography.caption, color: theme.colors.textMuted },
  notice: { padding: 10, borderWidth: 1, borderColor: theme.colors.danger, borderRadius: 8, backgroundColor: theme.colors.dangerBackground },
  chip: { minWidth: 48, minHeight: 48, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
});

export const useFieldStyles = () => createFieldStyles(useTheme().theme);
