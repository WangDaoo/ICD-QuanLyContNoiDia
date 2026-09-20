import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { YardStackParamList } from '../../../navigation/types';

export function YardAssignmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const route = useRoute<RouteProp<YardStackParamList, 'YardAssignment'>>();
  const { containerNo, visitId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Gán vị trí bãi"
        subtitle={containerNo ? `Cont: ${containerNo}` : 'Điều phối bãi bốc xếp'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Container mục tiêu</Text>
          <Text style={styles.value}>{containerNo || 'MSCU7654321'}</Text>

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Vị trí bãi đề xuất</Text>
          <Text style={[styles.value, { color: theme.colors.primary }]}>BLOCK-B2-04-01</Text>

          {visitId ? (
            <>
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Visit ID</Text>
              <Text style={styles.value}>{visitId}</Text>
            </>
          ) : null}
        </View>

        <PrimaryButton
          title="Xác nhận gán vị trí (Demo)"
          onPress={() =>
            navigation.navigate('YardOperationDetail', {
              operationId: 'op-demo-123',
              visitId: visitId || 'visit-demo-123',
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
});
