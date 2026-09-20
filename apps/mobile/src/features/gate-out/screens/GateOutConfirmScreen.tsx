import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

export function GateOutConfirmScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const route = useRoute<RouteProp<GateStackParamList, 'GateOutConfirm'>>();
  const { gatePassId, containerNo, visitId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Xác nhận Gate-out"
        subtitle={containerNo ? `Cont: ${containerNo}` : 'Kiểm tra Gate Pass'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Số hiệu Container</Text>
          <Text style={styles.value}>{containerNo || 'N/A'}</Text>

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Mã Gate Pass</Text>
          <Text style={styles.value}>{gatePassId || 'N/A'}</Text>

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Mã Visit</Text>
          <Text style={styles.value}>{visitId || 'N/A'}</Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>✅ Trạng thái: HỢP LỆ (PAID + YARD VALID)</Text>
          </View>
        </View>

        <PrimaryButton
          title="Xác nhận mở Barie Gate-out"
          onPress={() => navigation.navigate('GatePassScan')}
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  statusBox: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.successBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderColor: '#A6F4C5',
    borderWidth: 1,
  },
  statusText: {
    ...theme.typography.bodyBold,
    color: theme.colors.success,
    textAlign: 'center',
  },
});
