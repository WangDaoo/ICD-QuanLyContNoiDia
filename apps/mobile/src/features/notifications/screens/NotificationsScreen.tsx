import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../../../components/AppHeader';
import { EmptyState } from '../../../components/EmptyState';
import { theme } from '../../../theme/theme';

export function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Thông báo" subtitle="Cập nhật tác nghiệp & SLA" />
      <View style={styles.content}>
        <EmptyState
          iconText="🔔"
          title="Không có thông báo mới"
          description="Các cảnh báo Gate, Yard và SLA sẽ hiển thị tại đây khi có phát sinh."
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
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
});
