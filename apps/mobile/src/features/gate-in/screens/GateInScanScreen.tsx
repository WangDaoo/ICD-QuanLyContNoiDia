import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

export function GateInScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();

  return (
    <View style={styles.container}>
      <AppHeader title="Quét Gate-in" subtitle="Tiếp nhận container vào cổng" />
      <View style={styles.content}>
        <View style={styles.scanPlaceholder}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanTitle}>Sẵn sàng quét mã container / biển số xe</Text>
          <Text style={styles.scanSubtitle}>
            Camera scanner và OCR sẽ kích hoạt tại Pass 3
          </Text>
        </View>

        <PrimaryButton
          title="Nhập thông tin thủ công (Demo)"
          onPress={() => navigation.navigate('GateInForm', {})}
          style={styles.button}
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
  button: {
    marginTop: theme.spacing.lg,
  },
});
