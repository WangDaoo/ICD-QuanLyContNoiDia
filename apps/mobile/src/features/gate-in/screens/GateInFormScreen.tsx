import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { GateStackParamList } from '../../../navigation/types';

export function GateInFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GateStackParamList>>();
  const route = useRoute<RouteProp<GateStackParamList, 'GateInForm'>>();
  const { visitId, containerNo } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Biểu mẫu Gate-in"
        subtitle={containerNo ? `Cont: ${containerNo}` : 'Nhập thông tin tiếp nhận'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Mã Container</Text>
          <Text style={styles.value}>{containerNo || 'Chưa chọn container'}</Text>

          {visitId ? (
            <>
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Mã Visit</Text>
              <Text style={styles.value}>{visitId}</Text>
            </>
          ) : null}

          <Text style={styles.hint}>
            Form hoàn chỉnh kết nối GET /gate-in-context và POST /gate-in sẽ được hoàn thiện tại Pass 3.
          </Text>
        </View>

        <PrimaryButton
          title="Xác nhận tiếp nhận (Demo Success)"
          onPress={() =>
            navigation.navigate('GateInSuccess', {
              containerNo: containerNo || 'DEMU1234567',
              visitId: visitId || 'visit-demo-id',
              yardLocation: 'BLOCK-A1-02',
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
    marginTop: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.lg,
    fontStyle: 'italic',
  },
});
