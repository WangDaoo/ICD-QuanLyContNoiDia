import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, CameraOff, Flashlight, Keyboard, ScanLine, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseScannedCode, type ScannerMode } from './scanner-code';

export interface CodeScannerProps {
  visible: boolean;
  focused: boolean;
  mode: ScannerMode;
  onClose: () => void;
  onScan: (value: string) => void;
}

const ACCENT = '#22D3EE';
const SHADE = 'rgba(3, 7, 18, 0.68)';
const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

export function CodeScanner({ visible, focused, mode, onClose, onScan }: CodeScannerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [retry, setRetry] = useState(0);
  const active = visible && focused && foreground;
  const native = Platform.OS !== 'web';
  const session = useRef(0);
  const sessionInputs = useRef({ active, mode, retry });
  const consumed = useRef(false);
  const cameraRef = useRef<CameraView | null>(null);
  // Invalidate before creating camera callbacks, rather than after mount.
  if (
    sessionInputs.current.active !== active ||
    sessionInputs.current.mode !== mode ||
    sessionInputs.current.retry !== retry
  ) {
    session.current++;
    consumed.current = false;
    sessionInputs.current = { active, mode, retry };
  }
  const current = useRef({ active, mode, onScan, cameraError });
  current.current = { active, mode, onScan, cameraError };

  useEffect(() => {
    const stopCamera = () => {
      current.current.active = false;
      consumed.current = true;
      session.current++;
      // React may defer a background render; release CameraX through the native ref immediately.
      void cameraRef.current?.pausePreview().catch(() => {});
      setForeground(false);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForeground(true);
      else stopCamera();
    });
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', stopCamera) : null;
    const focus =
      Platform.OS === 'android'
        ? AppState.addEventListener('focus', () =>
            setForeground(AppState.currentState === 'active'),
          )
        : null;
    return () => {
      subscription.remove();
      blur?.remove();
      focus?.remove();
    };
  }, []);
  useEffect(
    () => () => {
      session.current++;
      consumed.current = true;
    },
    [],
  );
  useEffect(() => {
    consumed.current = false;
    setTorch(false);
    setReady(false);
    setCameraError('');
    setCodeError('');
    setRequesting(false);
  }, [active, mode, retry]);
  useEffect(() => {
    if (active && native)
      void refreshPermission().catch(() => {
        if (current.current.active)
          setCodeError('Không kiểm tra được quyền camera. Thử cấp quyền hoặc nhập mã thủ công.');
      });
  }, [active, native, refreshPermission]);

  const ticket = session.current;
  const isCurrent = () => current.current.active && ticket === session.current && !consumed.current;
  const close = () => {
    consumed.current = true;
    session.current++;
    setTorch(false);
    void cameraRef.current?.pausePreview().catch(() => {});
    onClose();
  };
  const readCode = (data: string) => {
    if (!isCurrent() || current.current.cameraError) return;
    const result = parseScannedCode(data, current.current.mode);
    if (result.value === undefined) {
      setCodeError(result.error);
      return;
    }
    consumed.current = true;
    setTorch(false);
    void cameraRef.current?.pausePreview().catch(() => {});
    setCodeError('');
    current.current.onScan(result.value);
  };
  const askPermission = async () => {
    if (!native || !isCurrent() || requesting) return;
    setRequesting(true);
    setCameraError('');
    try {
      const response = await requestPermission();
      if (isCurrent() && !response.granted)
        setCodeError('Camera chưa được cấp quyền. Bạn vẫn có thể nhập mã thủ công.');
    } catch {
      if (isCurrent())
        setCodeError('Không yêu cầu được quyền camera. Thử lại hoặc nhập mã thủ công.');
    } finally {
      if (isCurrent()) setRequesting(false);
    }
  };
  const frameSize = Math.max(170, Math.min(width - 56, 290, height * 0.38));
  const canUseTorch = active && native && !!permission?.granted && ready && !cameraError;
  const title = mode === 'GATE_PASS' ? 'Quét QR phiếu ra cổng' : 'Quét mã container';
  const instruction =
    mode === 'GATE_PASS'
      ? 'Đặt mã QR trên phiếu ra cổng vào khung.'
      : 'Đặt mã QR hoặc mã vạch trên nhãn container vào khung.';

  return (
    <Modal
      visible={visible && focused}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#0B1220',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {visible && focused ? <StatusBar barStyle="light-content" /> : null}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.caption}>TOS-MOBILE · Tác nghiệp hiện trường</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng màn quét"
              onPress={close}
              style={styles.iconButton}
            >
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              flex: 1,
              minHeight: frameSize + 100,
              backgroundColor: '#111B2E',
              overflow: 'hidden',
            }}
          >
            {active && native && permission?.granted && !cameraError ? (
              <CameraView
                ref={cameraRef}
                key={retry}
                style={FILL}
                facing="back"
                enableTorch={torch && ready}
                barcodeScannerSettings={{
                  barcodeTypes: mode === 'GATE_PASS' ? ['qr'] : ['qr', 'code128', 'code39'],
                }}
                onCameraReady={() => {
                  if (isCurrent()) setReady(true);
                }}
                onMountError={() => {
                  if (isCurrent()) {
                    setCameraError('Không mở được camera. Thử lại hoặc nhập mã thủ công.');
                    setTorch(false);
                    setReady(false);
                  }
                }}
                onBarcodeScanned={({ data }) => readCode(data)}
              />
            ) : null}
            <View pointerEvents="none" style={FILL}>
              <View style={{ flex: 1, backgroundColor: SHADE }} />
              <View style={{ flexDirection: 'row', height: frameSize }}>
                <View style={{ flex: 1, backgroundColor: SHADE }} />
                <View
                  testID="scanner-viewfinder"
                  accessibilityLabel="Khung căn mã quét"
                  style={{ width: frameSize, height: frameSize }}
                >
                  <View
                    style={[
                      styles.corner,
                      {
                        top: 0,
                        left: 0,
                        borderTopWidth: 4,
                        borderLeftWidth: 4,
                        borderTopLeftRadius: 12,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      {
                        top: 0,
                        right: 0,
                        borderTopWidth: 4,
                        borderRightWidth: 4,
                        borderTopRightRadius: 12,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      {
                        bottom: 0,
                        left: 0,
                        borderBottomWidth: 4,
                        borderLeftWidth: 4,
                        borderBottomLeftRadius: 12,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.corner,
                      {
                        bottom: 0,
                        right: 0,
                        borderBottomWidth: 4,
                        borderRightWidth: 4,
                        borderBottomRightRadius: 12,
                      },
                    ]}
                  />
                  {native && permission?.granted && ready && !cameraError ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 12,
                        right: 12,
                        height: 2,
                        backgroundColor: ACCENT,
                        opacity: 0.8,
                      }}
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1, backgroundColor: SHADE }} />
              </View>
              <View style={{ flex: 1, backgroundColor: SHADE }} />
            </View>
            {!native || !permission?.granted || cameraError ? (
              <View
                style={[
                  FILL,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 38,
                    gap: 14,
                  },
                ]}
              >
                <CameraOff color={ACCENT} size={36} />
                <Text style={[styles.message, { fontSize: 14 }]}>
                  {!native
                    ? 'Camera không hỗ trợ trong bản trình duyệt. Mở app trên Android/iOS để quét, hoặc nhập mã thủ công.'
                    : cameraError ||
                      'Cho phép dùng camera để đọc mã. App chỉ mở camera khi bạn đang ở màn quét.'}
                </Text>
                {native ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      cameraError
                        ? 'Thử lại camera'
                        : permission?.canAskAgain === false
                          ? 'Mở cài đặt camera'
                          : 'Cấp quyền camera'
                    }
                    disabled={requesting}
                    onPress={
                      cameraError
                        ? () => {
                            session.current++;
                            setRetry((value) => value + 1);
                          }
                        : permission?.canAskAgain === false
                          ? () => void Linking.openSettings()
                          : askPermission
                    }
                    style={styles.permissionButton}
                  >
                    {requesting ? (
                      <ActivityIndicator color="#06121B" />
                    ) : (
                      <Camera size={18} color="#06121B" />
                    )}
                    <Text style={{ color: '#06121B', fontSize: 13, fontWeight: '700' }}>
                      {cameraError
                        ? 'Thử lại camera'
                        : permission?.canAskAgain === false
                          ? 'Mở cài đặt'
                          : 'Cấp quyền camera'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : !ready ? (
              <View
                pointerEvents="none"
                style={[FILL, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}
              >
                <ActivityIndicator color={ACCENT} size="large" />
                <Text style={styles.message}>Đang mở camera…</Text>
              </View>
            ) : null}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 16,
                alignSelf: 'center',
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: '#0B1220CC',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ScanLine size={16} color={ACCENT} />
              <Text style={{ fontSize: 11, color: '#FFFFFF' }}>
                {mode === 'GATE_PASS' ? 'QR phiếu ra cổng' : 'QR · Code128 · Code39'}
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.message}>{codeError || instruction}</Text>
            <Text style={[styles.caption, { textAlign: 'center' }]}>
              Giữ máy ổn định, đủ ánh sáng và để mã rõ nét.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={torch ? 'Tắt đèn' : 'Bật đèn'}
                accessibilityState={{ disabled: !canUseTorch, selected: torch }}
                disabled={!canUseTorch}
                onPress={() => setTorch((value) => !value)}
                style={[
                  styles.footerButton,
                  {
                    opacity: canUseTorch ? 1 : 0.45,
                    backgroundColor: torch ? '#164E63' : '#182235',
                  },
                ]}
              >
                <Flashlight size={20} color={torch ? ACCENT : '#FFFFFF'} />
                <Text style={styles.buttonText}>{torch ? 'Tắt đèn' : 'Bật đèn'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nhập mã thủ công"
                onPress={close}
                style={[styles.footerButton, { flex: 1 }]}
              >
                <Keyboard size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Nhập mã thủ công</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.caption, { textAlign: 'center', fontSize: 10 }]}>
              Sau khi đọc mã, máy chủ sẽ kiểm tra hồ sơ và điều kiện nghiệp vụ.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  caption: { color: '#A8B6CC', fontSize: 11, lineHeight: 17 },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#182235',
  },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: ACCENT },
  message: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  permissionButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, gap: 8 },
  footerButton: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#182235',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
