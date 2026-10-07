import { Text, TouchableOpacity, View } from 'react-native';
import { useApiConnection } from '../services/api/ApiConnectionProvider';
import { useTheme } from '../theme/ThemeProvider';
export function ConnectionBanner() {
  const { online, checking, retry } = useApiConnection();
  const { theme } = useTheme();
  if (online !== false) return null;
  return <View accessibilityLiveRegion="polite" style={{ backgroundColor: theme.colors.warningBackground, padding: 10, gap: 5 }}>
    <Text style={{ color: theme.colors.textPrimary, fontSize: 12, lineHeight: 18 }}>Chưa kết nối được máy chủ. Dữ liệu đang xem có thể đã cũ; thao tác chưa gửi sẽ không tự đồng bộ.</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kiểm tra lại kết nối" disabled={checking} onPress={() => void retry()} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.colors.info, fontWeight: '700' }}>{checking ? 'Đang kiểm tra…' : 'Kiểm tra lại kết nối'}</Text></TouchableOpacity>
  </View>;
}
