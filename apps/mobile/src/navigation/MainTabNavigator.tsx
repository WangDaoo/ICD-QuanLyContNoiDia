import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { WorkQueueScreen } from '../features/work-queue/screens/WorkQueueScreen';
import { GateNavigator } from './GateNavigator';
import { YardNavigator } from './YardNavigator';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { MoreScreen } from '../features/more/screens/MoreScreen';
import { theme } from '../theme/theme';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>{icon}</Text>
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="WorkQueueTab"
        component={WorkQueueScreen}
        options={{
          tabBarLabel: 'Công việc',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GateTab"
        component={GateNavigator}
        options={{
          tabBarLabel: 'Cổng',
          tabBarIcon: ({ focused }) => <TabIcon icon="🚧" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="YardTab"
        component={YardNavigator}
        options={{
          tabBarLabel: 'Bãi',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏗️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          tabBarLabel: 'Thêm',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    opacity: 0.7,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});
