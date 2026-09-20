import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { YardStackParamList } from '../../../navigation/types';

export function ContainerDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const route = useRoute<RouteProp<YardStackParamList, 'ContainerDetail'>>();
  const { containerNo, visitId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Chi tiết Container"
        subtitle={containerNo || 'Thông tin container'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.containerNo}>{containerNo || 'TCLU1234567'}</Text>
            <StatusBadge label="YARD_ASSIGNED" variant="success" />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Kích cỡ</Text>
              <Text style={styles.infoVal}>40 HC</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Loại hàng</Text>
              <Text style={styles.infoVal}>Hàng khô (FCL)</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vị trí bãi:</Text>
            <Text style={[styles.infoVal, { color: theme.colors.primary }]}>
              BLOCK-A1-02-03
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hãng tàu:</Text>
            <Text style={styles.infoVal}>MAERSK LINE</Text>
          </View>
        </View>

        <PrimaryButton
          title="Thực hiện điều chuyển vị trí bãi"
          onPress={() =>
            navigation.navigate('YardAssignment', {
              containerNo: containerNo || 'TCLU1234567',
              visitId: visitId || 'visit-demo-1',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  containerNo: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  infoLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  infoVal: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
});
