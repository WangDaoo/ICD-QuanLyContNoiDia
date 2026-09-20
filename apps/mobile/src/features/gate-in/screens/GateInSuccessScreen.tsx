import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { MainTabParamList, GateStackParamList } from '../../../navigation/types';

export function GateInSuccessScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<GateStackParamList, 'GateInSuccess'>>();
  const { visitId, containerNumber } = route.params;

  return (
    <View style={styles.container}>
      <AppHeader title="Kết quả tiếp nhận" />

      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>

          <Text style={styles.title}>TIẾP NHẬN THÀNH CÔNG</Text>
          <Text style={styles.containerNo}>{containerNumber}</Text>

          <Text style={styles.description}>
            Container đã được tiếp nhận vào ICD qua cổng thành công.
          </Text>

          <View style={styles.nextStepBox}>
            <Text style={styles.nextStepLabel}>Bước tiếp theo:</Text>
            <Text style={styles.nextStepText}>
              Chỉ định và xếp vị trí container vào Block bãi phù hợp.
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <PrimaryButton
            title="XẾP VỊ TRÍ BÃI"
            onPress={() =>
              tabNavigation.navigate('YardTab', {
                screen: 'YardAssignment',
                params: {
                  visitId,
                  containerNo: containerNumber,
                },
              })
            }
            style={styles.primaryBtn}
          />

          <PrimaryButton
            title="VỀ DANH SÁCH CÔNG VIỆC"
            variant="secondary"
            onPress={() => tabNavigation.navigate('WorkQueueTab')}
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
  successCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: theme.spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.successBackground,
    borderWidth: 2,
    borderColor: '#A6F4C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkIcon: {
    fontSize: 32,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  containerNo: {
    ...theme.typography.mono,
    fontSize: 22,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  nextStepBox: {
    width: '100%',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  nextStepLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  nextStepText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  actionButtons: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  primaryBtn: {
    marginBottom: theme.spacing.xs,
  },
});
