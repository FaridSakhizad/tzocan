import { themeDark } from '@/constants/theme-dark';
import { themeLight } from '@/constants/theme-light';
import type { ThemeName, UiTheme } from '@/constants/ui-theme.types';

export const DEFAULT_THEME_NAME: ThemeName = 'light';

export const themesByName: Record<ThemeName, UiTheme> = {
  light: themeLight,
  dark: themeDark,
};

export const uiTheme = themesByName[DEFAULT_THEME_NAME];

export function getUiTheme(themeName: ThemeName): UiTheme {
  return themesByName[themeName] || themesByName[DEFAULT_THEME_NAME];
}

export type { ThemeName, UiTheme } from '@/constants/ui-theme.types';
