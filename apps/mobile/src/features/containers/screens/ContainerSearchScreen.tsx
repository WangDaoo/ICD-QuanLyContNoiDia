import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppHeader } from '../../../components/AppHeader';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { theme } from '../../../theme/theme';
import type { YardStackParamList } from '../../../navigation/types';

export function ContainerSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <AppHeader title="Tra cứu bãi & Container" subtitle="Tìm vị trí và lịch sử tác nghiệp" />
      <View style={styles.content}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Nhập số Container (VD: TCLU1234567)..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
        </View>

        <PrimaryButton
          title="Tìm kiếm Container"
          onPress={() =>
            navigation.navigate('ContainerDetail', {
              containerNo: searchQuery.trim() || 'TCLU1234567',
            })
          }
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
  },
  searchBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  input: {
    height: 48,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
