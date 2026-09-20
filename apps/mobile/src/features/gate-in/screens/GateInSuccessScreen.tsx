import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

export function GateInSuccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const route = useRoute<RouteProp<GateStackParamList, 'GateInSuccess'>>();
  const { containerNo, yardLocation } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader title="Tiếp nhận thành công" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>Container đã vào cổng thành công</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Container:</Text>
            <Text style={styles.infoValue}>{containerNo || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vị trí bãi chỉ định:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.primary }]}>
              {yardLocation || 'Chưa gán'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <PrimaryButton
            title="Quay về Quét Cổng"
            onPress={() => navigation.navigate('GateInScan')}
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  icon: {
    fontSize: 50,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  buttonGroup: {
    gap: theme.spacing.md,
  },
});
