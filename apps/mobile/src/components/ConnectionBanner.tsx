import { Text, TouchableOpacity, View } from 'react-native';
import { useApiConnection } from '../services/api/ApiConnectionProvider';
import { useTheme } from '../theme/ThemeProvider';
export function ConnectionBanner() {
  const { online, confirmedOffline, verifyingPermissions, permissionError, checking, retry } = useApiConnection();
  const { theme } = useTheme();
  if (online === true && !verifyingPermissions && !permissionError) return null;
  return <View accessibilityLiveRegion="polite" style={{ backgroundColor: theme.colors.warningBackground, padding: theme.spacing.md, gap: theme.spacing.sm }}>
    <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>{permissionError || (verifyingPermissions ? 'Đang xác minh quyền hiện tại trước khi cho phép thao tác.' : confirmedOffline || online === false ? 'Không kết nối được máy chủ. Dữ liệu lưu để xem có thể đã cũ. Thao tác chưa gửi sẽ không tự đồng bộ.' : 'Chưa xác nhận được kết nối máy chủ. Thử tải lại để kiểm tra; thao tác sẽ được mở sau khi xác minh quyền.')}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kiểm tra lại kết nối" disabled={checking} onPress={() => void retry()} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.colors.info, fontWeight: '700' }}>{checking ? 'Đang kiểm tra…' : 'Kiểm tra lại kết nối'}</Text></TouchableOpacity>
  </View>;
}
