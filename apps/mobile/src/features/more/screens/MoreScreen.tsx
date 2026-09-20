import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/hooks/useAuth';
import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';

export function MoreScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <AppHeader title="Tài khoản & Hệ thống" subtitle="Cài đặt và thông tin tài khoản" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.name || 'Tài khoản'}</Text>
          <Text style={styles.email}>{user?.email || 'N/A'}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>ICD Site:</Text>
            <Text style={styles.value}>{user?.icdId ? 'ICD Hưng Yên' : 'N/A'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Vai trò:</Text>
            <Text style={styles.value}>{user?.roleCodes?.join(', ') || 'N/A'}</Text>
          </View>
        </View>

        <PrimaryButton
          title="Đăng xuất tài khoản"
          variant="danger"
          onPress={() => void logout()}
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
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
