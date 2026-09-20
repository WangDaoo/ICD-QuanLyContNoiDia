import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { YardStackParamList } from '../../../navigation/types';

export function YardOperationDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const route = useRoute<RouteProp<YardStackParamList, 'YardOperationDetail'>>();
  const { operationId, visitId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Chi tiết tác nghiệp bãi"
        subtitle={operationId || 'Lệnh tác nghiệp'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Mã lệnh tác nghiệp</Text>
          <Text style={styles.value}>{operationId || 'N/A'}</Text>

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Visit ID</Text>
          <Text style={styles.value}>{visitId || 'N/A'}</Text>

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Trạng thái</Text>
          <Text style={[styles.value, { color: theme.colors.success }]}>HOÀN THÀNH</Text>
        </View>

        <PrimaryButton
          title="Quay lại Tra cứu"
          onPress={() => navigation.navigate('ContainerSearch')}
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
