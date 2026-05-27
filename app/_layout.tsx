import { useEffect } from 'react';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider } from '@react-navigation/native';

import { DatabaseProvider } from '@/hooks/use-database';
import { SelectedCitiesProvider } from '@/contexts/selected-cities-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { AppThemeProvider, useAppTheme } from '@/contexts/app-theme-context';
import { EditModeProvider } from '@/contexts/edit-mode-context';
import { NotificationsSortProvider } from '@/contexts/notifications-sort-context';
import { SupportModalProvider } from '@/contexts/support-modal-context';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppShell() {
  const { theme, navigationTheme, statusBarStyle } = useAppTheme();

  return (
    <ImageBackground
      source={theme.image.modalBackgroundSource}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: theme.overlay.medium,
        }}
      />
      <View style={{ flex: 1 }}>
        <ThemeProvider value={navigationTheme}>
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
          </Stack>
          <StatusBar style={statusBarStyle} />
        </ThemeProvider>
      </View>
    </ImageBackground>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <DatabaseProvider>
      <SettingsProvider>
        <AppThemeProvider>
          <SelectedCitiesProvider>
            <EditModeProvider>
              <NotificationsSortProvider>
                <SupportModalProvider>
                  <AppShell />
                </SupportModalProvider>
              </NotificationsSortProvider>
            </EditModeProvider>
          </SelectedCitiesProvider>
        </AppThemeProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}
