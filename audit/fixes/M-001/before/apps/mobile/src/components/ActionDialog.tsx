import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { PrimaryButton } from './PrimaryButton';

export function ActionDialog({ visible, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Quay lại', danger, busy, requiresOnline, onConfirm, onClose, children }: PropsWithChildren<{
  visible: boolean; title: string; message?: string; confirmLabel?: string; cancelLabel?: string;
  danger?: boolean; busy?: boolean; requiresOnline?: boolean; onConfirm?: () => void; onClose: () => void;
}>) {
  const { theme } = useTheme();
  const close = () => { if (!busy) onClose(); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#00000088', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}>{title}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng hộp thoại" disabled={busy} onPress={close} style={{ minWidth: 36, minHeight: 36, justifyContent: 'center', alignItems: 'center' }}><X size={20} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {message ? <Text style={{ fontSize: 13, lineHeight: 20, color: theme.colors.textSecondary }}>{message}</Text> : null}
            {children}
          </ScrollView>
          {onConfirm ? <PrimaryButton title={confirmLabel} onPress={onConfirm} loading={busy} requiresOnline={requiresOnline} variant={danger ? 'danger' : 'primary'} /> : null}
          <PrimaryButton title={onConfirm ? cancelLabel : 'Đóng'} onPress={close} disabled={busy} variant="secondary" />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
