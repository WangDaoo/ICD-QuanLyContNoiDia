import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

export function GatePassScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();

  return (
    <View style={styles.container}>
      <AppHeader title="Quét Gate Pass" subtitle="Kiểm tra xe ra cổng" />
      <View style={styles.content}>
        <View style={styles.scanPlaceholder}>
          <Text style={styles.scanIcon}>🎫</Text>
          <Text style={styles.scanTitle}>Quét mã QR Gate Pass</Text>
          <Text style={styles.scanSubtitle}>
            Xác thực tính hợp lệ của phiếu ra cổng và tình trạng thanh toán/niêm phong
          </Text>
        </View>

        <PrimaryButton
          title="Xác thực phiếu demo"
          onPress={() =>
            navigation.navigate('GateOutConfirm', {
              gatePassId: 'gp-demo-123',
              visitId: 'visit-demo-123',
              containerNo: 'TEMU9998881',
            })
          }
        />
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
  scanPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  scanIcon: {
    fontSize: 56,
    marginBottom: theme.spacing.md,
  },
  scanTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  scanSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
