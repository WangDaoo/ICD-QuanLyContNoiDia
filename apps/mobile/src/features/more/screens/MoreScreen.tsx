import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/hooks/useAuth';
import { ScreenLayout, Card, DetailRow, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ActionDialog } from '../../../components/ActionDialog';
import { useApiConnection } from '../../../services/api/ApiConnectionProvider';
import { useTheme } from '../../../theme/ThemeProvider';

export function MoreScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { online, writesReady, checkedAt, checking, retry } = useApiConnection();
  const { mode, preference, appearanceError, toggleTheme, useSystemTheme } = useTheme();
  const styles = useFieldStyles();
  const [permissions, setPermissions] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endSession = async () => {
    setBusy(true);
    try { await logout(); }
    catch { setError('Đã xóa phiên trên thiết bị. Máy chủ chưa xác nhận kết thúc phiên.'); }
    finally { setBusy(false); setConfirmLogout(false); }
  };
  return <ScreenLayout title="Tài khoản và ca trực" onBack={() => navigation.goBack()}>
    <Card title="Thông tin tài khoản">
      {writesReady === false ? <Text accessibilityLiveRegion="polite" style={styles.muted}>Hồ sơ và quyền đã lưu chỉ dùng để xem. Kết nối lại để xác minh quyền hiện tại.</Text> : null}
      <DetailRow label="Họ tên" value={user?.name} /><DetailRow label="Email" value={user?.email} />
      <DetailRow label="Vai trò" value={user?.roleCodes.join(', ')} /><DetailRow label="Mã ICD" value={user?.icdId} />
      <PrimaryButton title="Xem quyền được cấp" variant="secondary" onPress={() => setPermissions(true)} />
    </Card>
    <Card title="Ứng dụng và kết nối">
      <DetailRow label="Máy chủ" value={online === null ? 'Đang kiểm tra' : online ? 'Đang kết nối' : 'Không kết nối được'} />
      <DetailRow label="Kiểm tra gần nhất" value={checkedAt?.toLocaleTimeString('vi-VN')} />
      <DetailRow label="Nền tảng" value={Platform.OS === 'web' ? 'Bản xem thử trên trình duyệt' : Platform.OS} />
      <DetailRow label="Phiên bản" value="0.1.0" />
      <PrimaryButton title="Kiểm tra kết nối máy chủ" loading={checking} variant="secondary" onPress={() => void retry()} />
      <PrimaryButton title={mode === 'LIGHT' ? 'Đổi sang nền tối' : 'Đổi sang nền sáng'} variant="secondary" onPress={toggleTheme} />
      <DetailRow label="Tùy chọn giao diện" value={preference === 'SYSTEM' ? 'Theo hệ thống' : mode === 'DARK' ? 'Nền tối' : 'Nền sáng'} />
      <PrimaryButton title="Dùng giao diện hệ thống" variant="secondary" disabled={preference === 'SYSTEM'} onPress={useSystemTheme} />
      {appearanceError ? <Notice message={appearanceError} /> : null}
    </Card>
    {error ? <Notice message={error} /> : null}
    <PrimaryButton title="Đăng xuất tài khoản" variant="danger" onPress={() => setConfirmLogout(true)} />
    <ActionDialog visible={permissions} title="Quyền được cấp" onClose={() => setPermissions(false)}>
      <Text style={styles.muted}>Quyền do hệ thống cấp cho tài khoản hiện tại.</Text>
      {user?.permissionCodes.map(code => <Text key={code} style={styles.value}>{code}</Text>)}
    </ActionDialog>
    <ActionDialog visible={confirmLogout} title="Kết thúc ca và đăng xuất" message="Các thao tác đã xác nhận được giữ trên hệ thống. Dữ liệu chưa gửi trong biểu mẫu sẽ không được lưu." confirmLabel="Đăng xuất" danger busy={busy} onConfirm={() => void endSession()} onClose={() => setConfirmLogout(false)} />
  </ScreenLayout>;
}
