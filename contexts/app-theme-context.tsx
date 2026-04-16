import { createContext, ReactNode, useContext, useMemo } from 'react';
import { Theme } from '@react-navigation/native';

import { DEFAULT_THEME_NAME, getUiTheme } from '@/constants/ui-theme';
import { useSettings } from '@/contexts/settings-context';

type AppThemeContextValue = {
  themeName: ReturnType<typeof useSettings>['themeName'];
  theme: ReturnType<typeof getUiTheme>;
  navigationTheme: Theme;
  statusBarStyle: ReturnType<typeof getUiTheme>['statusBarStyle'];
  setThemeName: ReturnType<typeof useSettings>['setThemeName'];
};

const APP_THEME_FONTS = {
  light: { fontFamily: 'Roboto', fontWeight: '300' as const },
  regular: { fontFamily: 'Roboto', fontWeight: '400' as const },
  medium: { fontFamily: 'Roboto', fontWeight: '500' as const },
  bold: { fontFamily: 'Roboto', fontWeight: '700' as const },
  heavy: { fontFamily: 'Roboto', fontWeight: '800' as const },
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { themeName, setThemeName } = useSettings();

  const value = useMemo(() => {
    const resolvedThemeName = themeName || DEFAULT_THEME_NAME;
    const theme = getUiTheme(resolvedThemeName);
    const navigationTheme: Theme = {
      dark: theme.navigation.dark,
      colors: theme.navigation.colors,
      fonts: APP_THEME_FONTS,
    };

    return {
      themeName: resolvedThemeName,
      theme,
      navigationTheme,
      statusBarStyle: theme.statusBarStyle,
      setThemeName,
    };
  }, [setThemeName, themeName]);

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }

  return context;
}
