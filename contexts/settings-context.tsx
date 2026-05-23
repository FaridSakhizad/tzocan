import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars } from 'expo-localization';
import { detectPreferredLanguage, isLanguageCode, type LanguageCode } from '@/constants/i18n';
import { DEFAULT_THEME_NAME, ThemeName } from '@/constants/ui-theme';

export type TimeFormat = '12h' | '24h';
export type FirstDayOfWeek = 'monday' | 'sunday';

function isTimeFormat(value: unknown): value is TimeFormat {
  return value === '12h' || value === '24h';
}

function detectPreferredTimeFormat(): TimeFormat {
  const preferredCalendar = getCalendars()[0];

  if (preferredCalendar && typeof preferredCalendar.uses24hourClock === 'boolean') {
    return preferredCalendar.uses24hourClock ? '24h' : '12h';
  }

  const timeFormatterOptions = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  }).resolvedOptions();

  if (typeof timeFormatterOptions.hour12 === 'boolean') {
    return timeFormatterOptions.hour12 ? '12h' : '24h';
  }

  if (timeFormatterOptions.hourCycle === 'h11' || timeFormatterOptions.hourCycle === 'h12') {
    return '12h';
  }

  if (timeFormatterOptions.hourCycle === 'h23' || timeFormatterOptions.hourCycle === 'h24') {
    return '24h';
  }

  return '12h';
}

type SettingsContextType = {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  firstDayOfWeek: FirstDayOfWeek;
  setFirstDayOfWeek: (value: FirstDayOfWeek) => void;
  timeOffsetMinutes: number;
  setTimeOffsetMinutes: (offset: number) => void;
  languageCode: LanguageCode;
  setLanguageCode: (languageCode: LanguageCode) => void;
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_settings';

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<FirstDayOfWeek>('monday');
  const [timeOffsetMinutes, setTimeOffsetMinutesState] = useState<number>(0);
  const [timeFormatOverride, setTimeFormatOverride] = useState<TimeFormat | null>(null);
  const [timeFormatFollowsSystem, setTimeFormatFollowsSystem] = useState(true);
  const [languageCodeOverride, setLanguageCodeOverride] = useState<LanguageCode | null>(null);
  const [languageFollowsSystem, setLanguageFollowsSystem] = useState(true);
  const [themeName, setThemeNameState] = useState<ThemeName>(DEFAULT_THEME_NAME);
  const [isLoaded, setIsLoaded] = useState(false);

  const detectedTimeFormat = detectPreferredTimeFormat();
  const detectedLanguageCode = detectPreferredLanguage();
  const timeFormat = timeFormatFollowsSystem ? detectedTimeFormat : timeFormatOverride ?? detectedTimeFormat;
  const languageCode = languageFollowsSystem ? detectedLanguageCode : languageCodeOverride ?? detectedLanguageCode;

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveSettings(
      timeFormat,
      timeFormatFollowsSystem,
      firstDayOfWeek,
      timeOffsetMinutes,
      languageCode,
      languageFollowsSystem,
      themeName
    );
  }, [
    firstDayOfWeek,
    isLoaded,
    languageCode,
    languageFollowsSystem,
    themeName,
    timeFormat,
    timeFormatFollowsSystem,
    timeOffsetMinutes,
  ]);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);

      const parsedTimeFormatFollowsSystem = parsed.timeFormatFollowsSystem !== false;

      if (parsedTimeFormatFollowsSystem) {
        setTimeFormatFollowsSystem(true);
        setTimeFormatOverride(null);
      } else if (isTimeFormat(parsed.timeFormat)) {
        setTimeFormatFollowsSystem(false);
        setTimeFormatOverride(parsed.timeFormat);
      }

      if (parsed.firstDayOfWeek === 'monday' || parsed.firstDayOfWeek === 'sunday') {
        setFirstDayOfWeekState(parsed.firstDayOfWeek);
      }

      if (typeof parsed.timeOffsetMinutes === 'number') {
        setTimeOffsetMinutesState(parsed.timeOffsetMinutes);
      }

      const parsedLanguageFollowsSystem = parsed.languageFollowsSystem !== false;

      if (parsedLanguageFollowsSystem) {
        setLanguageFollowsSystem(true);
        setLanguageCodeOverride(null);
      } else if (isLanguageCode(parsed.languageCode)) {
        setLanguageFollowsSystem(false);
        setLanguageCodeOverride(parsed.languageCode);
      }

      if (
        parsed.themeName === 'dark' ||
        parsed.themeName === 'light' ||
        parsed.themeName === 'paperLight' ||
        parsed.themeName === 'paperDark' ||
        parsed.themeName === 'contrastWhite' ||
        parsed.themeName === 'contrastBlack'
      ) {
        setThemeNameState(parsed.themeName);
      } else if (parsed.themeName === 'sea' || parsed.themeName === 'paper') {
        setThemeNameState('light');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (
    format: TimeFormat,
    nextTimeFormatFollowsSystem: boolean,
    firstDay: FirstDayOfWeek,
    offset: number,
    nextLanguageCode: LanguageCode,
    nextLanguageFollowsSystem: boolean,
    nextThemeName: ThemeName
  ) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timeFormat: nextTimeFormatFollowsSystem ? null : format,
          timeFormatFollowsSystem: nextTimeFormatFollowsSystem,
          firstDayOfWeek: firstDay,
          timeOffsetMinutes: offset,
          languageCode: nextLanguageFollowsSystem ? null : nextLanguageCode,
          languageFollowsSystem: nextLanguageFollowsSystem,
          themeName: nextThemeName,
        })
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatFollowsSystem(false);
    setTimeFormatOverride(format);
  };

  const setFirstDayOfWeek = (value: FirstDayOfWeek) => {
    setFirstDayOfWeekState(value);
  };

  const setTimeOffsetMinutes = (offset: number) => {
    setTimeOffsetMinutesState(offset);
  };

  const setLanguageCode = (nextLanguageCode: LanguageCode) => {
    setLanguageFollowsSystem(false);
    setLanguageCodeOverride(nextLanguageCode);
  };

  const setThemeName = (nextThemeName: ThemeName) => {
    setThemeNameState(nextThemeName);
  };

  return (
    <SettingsContext.Provider value={{ timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, timeOffsetMinutes, setTimeOffsetMinutes, languageCode, setLanguageCode, themeName, setThemeName, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
