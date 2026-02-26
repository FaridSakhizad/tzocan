import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { CityRow } from '@/components/add-city-modal';

export type CityNotification = {
  id: string;
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  enabled: boolean;
  notificationId?: string;
  isDaily?: boolean;
};

export type SelectedCity = CityRow & {
  customName?: string;
  notifications?: CityNotification[];
};

type SelectedCitiesContextType = {
  selectedCities: SelectedCity[];
  addCity: (city: CityRow) => void;
  removeCity: (cityId: number) => void;
  updateCityName: (cityId: number, customName: string) => void;
  reorderCities: (cities: SelectedCity[]) => void;
  addNotification: (cityId: number, hour: number, minute: number, year?: number, month?: number, day?: number) => Promise<void>;
  updateNotification: (cityId: number, notificationId: string, hour: number, minute: number, year?: number, month?: number, day?: number) => Promise<void>;
  removeNotification: (cityId: number, notificationId: string) => Promise<void>;
  toggleNotification: (cityId: number, notificationId: string, enabled: boolean) => Promise<boolean>;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_cities';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getTriggerDateForTimezone(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const now = new Date();

  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = targetFormatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const currentYearInTz = getPart('year');
  const currentMonthInTz = getPart('month');
  const currentDayInTz = getPart('day');
  const currentHourInTz = getPart('hour');
  const currentMinuteInTz = getPart('minute');
  const currentSecondInTz = getPart('second');

  const currentDateInTz = new Date(currentYearInTz, currentMonthInTz - 1, currentDayInTz, currentHourInTz, currentMinuteInTz, currentSecondInTz);
  const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);

  const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

  const triggerDate = new Date(now.getTime() + diffMs);

  return triggerDate;
}

async function scheduleNotification(
  city: SelectedCity,
  hour: number,
  minute: number,
  year?: number,
  month?: number,
  day?: number
): Promise<string | null> {
  if (hour === undefined || minute === undefined) {
    console.warn('Cannot schedule notification: missing time values');
    return null;
  }

  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const cityName = city.customName || city.name;

  // If date is provided, schedule one-time notification
  if (year && month && day) {
    const triggerDate = getTriggerDateForTimezone(city.tz, year, month, day, hour, minute);

    if (triggerDate.getTime() <= Date.now()) {
      console.warn('Cannot schedule notification in the past');
      return null;
    }

    const dateString = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cityName}`,
        body: `It's ${timeString} on ${dateString} in ${cityName}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  }

  // No date provided - schedule daily recurring notification
  // Calculate the hour/minute in local time that corresponds to the target city time
  const now = new Date();
  const todayTrigger = getTriggerDateForTimezone(city.tz, now.getFullYear(), now.getMonth() + 1, now.getDate(), hour, minute);

  const localHour = todayTrigger.getHours();
  const localMinute = todayTrigger.getMinutes();

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${cityName}`,
      body: `It's ${timeString} in ${cityName}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: localHour,
      minute: localMinute,
    },
  });

  return notificationId;
}

async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

const SelectedCitiesContext = createContext<SelectedCitiesContextType | null>(null);

export function SelectedCitiesProvider({ children }: { children: ReactNode }) {
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedCities(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveCities = async (cities: SelectedCity[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
    } catch (error) {
      console.error('Failed to save cities:', error);
    }
  };

  const addCity = (city: CityRow) => {
    setSelectedCities((prev) => {
      const isAlreadySelected = prev.some((c) => c.id === city.id);
      if (isAlreadySelected) {
        return prev;
      }
      const newCities = [...prev, city];

      saveCities(newCities);

      return newCities;
    });
  };

  const removeCity = (cityId: number) => {
    setSelectedCities((prev) => {
      const newCities = prev.filter((c) => c.id !== cityId);

      saveCities(newCities);

      return newCities;
    });
  };

  const updateCityName = (cityId: number, customName: string) => {
    setSelectedCities((prev) => {
      const newCities = prev.map((c) =>
        c.id === cityId ? { ...c, customName: customName || undefined } : c
      );

      saveCities(newCities);

      return newCities;
    });
  };

  const reorderCities = (cities: SelectedCity[]) => {
    setSelectedCities(cities);

    saveCities(cities);
  };

  const addNotification = async (cityId: number, hour: number, minute: number, year?: number, month?: number, day?: number) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    const city = selectedCities.find(c => c.id === cityId);
    if (!city) return;

    const isDaily = !year || !month || !day;
    const notificationId = await scheduleNotification(city, hour, minute, year, month, day);

    if (!notificationId) {
      return;
    }

    const newNotification: CityNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      year,
      month,
      day,
      hour,
      minute,
      enabled: true,
      notificationId,
      isDaily,
    };

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: [...(c.notifications || []), newNotification],
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const updateNotification = async (cityId: number, notificationId: string, hour: number, minute: number, year?: number, month?: number, day?: number) => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return;

    // Cancel old notification
    if (notification.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
    }

    // Schedule new notification
    const isDaily = !year || !month || !day;
    const newSystemNotificationId = await scheduleNotification(city, hour, minute, year, month, day);

    if (!newSystemNotificationId) {
      return;
    }

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: (c.notifications || []).map(n =>
              n.id === notificationId
                ? { ...n, year, month, day, hour, minute, enabled: true, notificationId: newSystemNotificationId, isDaily }
                : n
            ),
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const removeNotification = async (cityId: number, notificationId: string) => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (notification?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
    }

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: (c.notifications || []).filter(n => n.id !== notificationId),
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const toggleNotification = async (cityId: number, notificationId: string, enabled: boolean): Promise<boolean> => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return false;

    if (enabled) {
      const newNotificationId = await scheduleNotification(
        city,
        notification.hour,
        notification.minute,
        notification.year,
        notification.month,
        notification.day
      );

      if (!newNotificationId) {
        return false;
      }

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? { ...n, enabled: true, notificationId: newNotificationId }
                  : n
              ),
            };
          }
          return c;
        });

        saveCities(newCities);

        return newCities;
      });

      return true;
    } else {
      if (notification.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
      }

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? { ...n, enabled: false, notificationId: undefined }
                  : n
              ),
            };
          }
          return c;
        });

        saveCities(newCities);

        return newCities;
      });

      return true;
    }
  };

  return (
    <SelectedCitiesContext.Provider value={{ selectedCities, addCity, removeCity, updateCityName, reorderCities, addNotification, updateNotification, removeNotification, toggleNotification, isLoaded }}>
      {children}
    </SelectedCitiesContext.Provider>
  );
}

export function useSelectedCities() {
  const context = useContext(SelectedCitiesContext);

  if (!context) {
    throw new Error('useSelectedCities must be used within a SelectedCitiesProvider');
  }

  return context;
}
