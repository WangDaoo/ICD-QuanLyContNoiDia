import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { LoadingState } from '../../../components/LoadingState';
import {
  extractContainerNumber,
  gateInApi,
  unwrapData,
} from '../api/gate-in.api';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

type SearchResponse = {
  data?: Array<{
    id: string;
    status: string;
    container?: {
      containerNumber: string;
    };
  }>;
};

export function GateInScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();

  const [manualContainerNo, setManualContainerNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const resolveContainerAndNavigate = async (rawInput: string) => {
    const contNo = extractContainerNumber(rawInput) || rawInput.trim().toUpperCase();

    if (!contNo) {
      setSearchError('Vui lòng nhập hoặc quét mã Container hợp lệ (VD: TCLU1234567).');
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);

      const response = await gateInApi.searchContainerVisits(contNo);
      const data = unwrapData(response) as SearchResponse | Array<{ id: string; status: string }>;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      if (list.length === 0) {
        setSearchError(`Không tìm thấy chuyến Container Visit nào cho số hiệu [${contNo}].`);
        return;
      }

      // Find authorized visit or first visit
      const targetVisit =
        list.find((v) => v.status === 'AUTHORIZED') || list[0];

      if (!targetVisit) {
        setSearchError(`Không có chuyến xe hợp lệ cho [${contNo}].`);
        return;
      }

      navigation.navigate('GateInForm', {
        visitId: targetVisit.id,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message || 'Lỗi tra cứu container.');
      } else {
        setSearchError('Lỗi tra cứu container từ máy chủ.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || searching) return;
    setScanned(true);
    void resolveContainerAndNavigate(data).finally(() => {
      setTimeout(() => setScanned(false), 2000);
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Quét Container vào cổng" subtitle="Quét mã QR/Barcode hoặc tìm theo số Cont" />

      <View style={styles.content}>
        {/* Camera Scanner Box */}
        <View style={styles.cameraCard}>
          {!permission ? (
            <LoadingState message="Đang kiểm tra quyền Camera..." />
          ) : !permission.granted ? (
            <View style={styles.permissionDeniedBox}>
              <Text style={styles.permissionIcon}>📷</Text>
              <Text style={styles.permissionTitle}>Cần cấp quyền truy cập Camera</Text>
              <Text style={styles.permissionSubtitle}>
                Để quét nhanh mã QR/Barcode trên phiếu hoặc vỏ Container
              </Text>
              <PrimaryButton
                title="Cấp quyền Camera"
                onPress={() => void requestPermission()}
                style={styles.grantBtn}
              />
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'code128', 'code39', 'ean13'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
              <View style={styles.scanTargetOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Đưa mã Barcode/QR vào giữa khung</Text>
              </View>
            </View>
          )}
        </View>

        {/* Manual Search Section */}
        <View style={styles.manualSearchCard}>
          <Text style={styles.manualLabel}>HOẶC NHẬP SỐ CONTAINER THỦ CÔNG</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={manualContainerNo}
              onChangeText={setManualContainerNo}
              placeholder="VD: TCLU1234567..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              editable={!searching}
            />
          </View>

          {searchError ? (
            <View style={styles.searchErrorBox}>
              <Text style={styles.searchErrorText}>{searchError}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title="TÌM & TIẾP NHẬN"
            onPress={() => void resolveContainerAndNavigate(manualContainerNo)}
            loading={searching}
            disabled={searching}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  cameraCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scanTargetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  scanHint: {
    ...theme.typography.captionBold,
    color: '#ffffff',
    marginTop: theme.spacing.md,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionDeniedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  permissionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  permissionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  grantBtn: {
    width: '100%',
  },
  manualSearchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  manualLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    ...theme.typography.mono,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  searchErrorBox: {
    backgroundColor: theme.colors.dangerBackground,
    padding: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.sm,
    borderColor: '#FECDCA',
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  searchErrorText: {
    ...theme.typography.captionBold,
    color: theme.colors.danger,
    textAlign: 'center',
  },
});
