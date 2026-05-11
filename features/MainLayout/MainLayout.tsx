import React, { useMemo } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';

import { HapticTab } from '@/components/haptic-tab';

import IconCitiesOutlined from '@/assets/images/icon--cities-1--outlined.svg';
import IconCitiesFilled from '@/assets/images/icon--cities-1--filled.svg';

import IconClockOutlined from '@/assets/images/icon--clock-1--outlined.svg';
import IconClockFilled from '@/assets/images/icon--clock-1--filled.svg';

import IconTimelineOutlined from '@/assets/images/icon--timeline-1--outlined.svg';
import IconTimelineFilled from '@/assets/images/icon--timeline-1--filled.svg';

import IconNotificationOutlined from '@/assets/images/icon--notification-1--outlined.svg';
import IconNotificationFilled from '@/assets/images/icon--notification-1--filled.svg';

import { RouteNames, RouteNamePaths } from '@/types/router';

import HeaderButtons from './HeaderButtons';
import { createStyles } from './styles';

function TabBar(props: BottomTabBarProps) {
  const pathname = usePathname();
  const { theme } = useAppTheme();
  const { isEditMode } = useEditMode();

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.bottomBarContainer,
        (pathname === RouteNamePaths.root || pathname === RouteNamePaths.cities) && styles.bottomBarContainerCitiesList,
        isEditMode && styles.tabBarDisabled,
      ]}
      pointerEvents={isEditMode ? 'none' : 'auto'}
    >
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();

  const { theme } = useAppTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.navigation.colors.primary,
        headerShown: true,
        header: () => <HeaderButtons />,
        headerStyle: {
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTransparent: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBarStyle,
      }}
    >
      <Tabs.Screen
        name={RouteNames.cities}
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {(focused || pathname === RouteNamePaths.editCity) ? (
                <IconCitiesFilled
                  style={styles.icon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconCitiesOutlined
                  style={styles.icon}
                  fill={theme.text.primary}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name={RouteNames.timeline}
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {focused ? (
                <IconTimelineFilled
                  style={styles.icon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconTimelineOutlined
                  style={styles.icon}
                  fill={theme.text.primary}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name={RouteNames.notifications}
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {focused ? (
                <IconNotificationFilled style={styles.icon} fill={theme.text.primary} />
              ) : (
                <IconNotificationOutlined style={styles.icon} fill={theme.text.primary} />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name={RouteNames.editCity}
        options={{
          title: '',
          href: null,
        }}
      />
      <Tabs.Screen
        name={RouteNames.contact}
        options={{
          title: '',
          href: null,
        }}
      />
      <Tabs.Screen
        name={RouteNames.settings}
        options={{
          title: '',
          href: null,
        }}
      />
      <Tabs.Screen
        name={RouteNames.about}
        options={{
          title: '',
          href: null,
        }}
      />
    </Tabs>
  );
}
