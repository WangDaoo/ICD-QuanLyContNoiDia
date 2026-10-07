import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';
import { useFieldStyles } from './ScreenLayout';
import { ActionDialog } from './ActionDialog';
import { applyBookingPicker, bookingPickerDate } from './booking-date';

export function BookingDateField({ value, onChange, disabled, error }: { value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }) {
  const { theme } = useTheme();
  const styles = useFieldStyles();
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(new Date());
  const open = (mode: 'date' | 'time') => { setDraft(bookingPickerDate(value)); setPicker(mode); };
  const change = (event: DateTimePickerEvent, chosen?: Date) => {
    if (Platform.OS === 'ios') { if (chosen) setDraft(chosen); return; }
    const mode = picker; setPicker(null);
    if (event.type === 'set' && chosen && mode) onChange(applyBookingPicker(value, chosen, mode));
  };
  const control = picker ? <DateTimePicker value={Platform.OS === 'ios' ? draft : bookingPickerDate(value)} mode={picker} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={change} /> : null;
  return <View style={{ gap: theme.spacing.sm }}>
    <Text style={styles.label}>Lịch thực hiện (giờ Việt Nam)*</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chọn ngày thực hiện" disabled={disabled} onPress={() => open('date')} style={[styles.chip, { flex: 1, minWidth: 100, paddingVertical: theme.spacing.sm }]}><Text style={styles.value}>{value ? 'Ngày: ' + value.slice(0, 10) : 'Chọn ngày'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chọn giờ thực hiện" disabled={disabled} onPress={() => open('time')} style={[styles.chip, { flex: 1, minWidth: 100, paddingVertical: theme.spacing.sm }]}><Text style={styles.value}>{value ? 'Giờ: ' + value.slice(11) : 'Chọn giờ'}</Text></TouchableOpacity>
    </View>
    <Text style={styles.muted}>Giờ Việt Nam (UTC+7). Ngày và giờ chọn ở đây luôn được gửi theo giờ Việt Nam.</Text>
    {error ? <Text accessibilityLiveRegion="polite" style={{ ...theme.typography.caption, color: theme.colors.dangerText }}>{error}</Text> : null}
    {Platform.OS === 'ios' ? <ActionDialog visible={!!picker} title={picker === 'date' ? 'Chọn ngày thực hiện' : 'Chọn giờ thực hiện'} onClose={() => setPicker(null)} confirmLabel="Chọn" onConfirm={() => { if (picker) onChange(applyBookingPicker(value, draft, picker)); setPicker(null); }}>{control}</ActionDialog> : control}
  </View>;
}
