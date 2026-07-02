import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { CityRow } from '@/components/add-city-modal';
import { RepeatMode, getEffectiveRepeatMode } from '@/types/notifications';
import { getDateTimePartsInTimezone } from '@/utils/abstract-timezone';
import {
  createCalendarEntryIds,
  deleteCalendarEntryIds,
} from '@/utils/reminder-calendar';
import type * as ExpoNotifications from 'expo-notifications';

export type CityNotification = {
  id: string;
  createdAt?: number;
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  repeat?: RepeatMode;
  weekdays?: number[]; // JS weekday format: 0=Sun ... 6=Sat (city timeline days)
  label?: string;
  notes?: string;
  url?: string;
  calendarId?: string | null;
  calendarTitle?: string;
  durationMinutes?: number;
  calendarEventId?: string;
  calendarEventIds?: string[];
  enabled: boolean;
  inactiveReason?: 'permission' | 'past';
  notificationId?: string;
  notificationIds?: string[];
  isDaily?: boolean;
};

export type SelectedCity = Omit<CityRow, 'id'> & {
  id: number;
  cityId: number;
  customName?: string;
  notifications?: CityNotification[];
};

type SelectedCitiesContextType = {
  selectedCities: SelectedCity[];
  addCity: (city: CityRow) => void;
  removeCity: (cityId: number) => void;
  updateCityName: (cityId: number, customName: string) => void;
  reorderCities: (cities: SelectedCity[]) => void;
  addNotification: (cityId: number, hour: number, minute: number, year?: number, month?: number, day?: number, label?: string, notes?: string, url?: string, repeat?: RepeatMode, weekdays?: number[], calendarId?: string | null, calendarTitle?: string, durationMinutes?: number) => Promise<boolean>;
  updateNotification: (cityId: number, notificationId: string, hour: number, minute: number, year?: number, month?: number, day?: number, label?: string, notes?: string, url?: string, repeat?: RepeatMode, weekdays?: number[], calendarId?: string | null, calendarTitle?: string, durationMinutes?: number) => Promise<boolean>;
  removeNotification: (cityId: number, notificationId: string) => Promise<void>;
  toggleNotification: (cityId: number, notificationId: string, enabled: boolean) => Promise<boolean>;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_cities';
let notificationsModulePromise: Promise<typeof ExpoNotifications | null> | null = null;

function generateSelectedCityId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function isAndroidExpoGo() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (isAndroidExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((module) => module)
      .catch((error) => {
        console.warn('Notifications module is unavailable in this runtime', error);
        return null;
      });
  }

  return notificationsModulePromise;
}

function getTriggerDateForTimezone(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const now = new Date();
  const parts = getDateTimePartsInTimezone(now, timezone);
  const currentDateInTz = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);

  const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

  const triggerDate = new Date(now.getTime() + diffMs);

  return triggerDate;
}

function isPastExplicitOneTimeNotification(
  city: SelectedCity,
  hour: number,
  minute: number,
  year?: number,
  month?: number,
  day?: number,
  repeat: RepeatMode = RepeatMode.none
) {
  if (repeat !== RepeatMode.none || !year || !month || !day) {
    return false;
  }

  const triggerDate = getTriggerDateForTimezone(city.tz, year, month, day, hour, minute);

  return triggerDate.getTime() <= Date.now();
}

function getNotificationAnchorDateParts(
  city: SelectedCity,
  year?: number,
  month?: number,
  day?: number,
  createdAt?: number
) {
  if (year && month && day) {
    return { year, month, day };
  }

  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
    const createdAtParts = getDateTimePartsInTimezone(new Date(createdAt), city.tz);

    return {
      year: createdAtParts.year,
      month: createdAtParts.month,
      day: createdAtParts.day,
    };
  }

  const cityNow = getDateTimePartsInTimezone(new Date(), city.tz);

  return {
    year: cityNow.year,
    month: cityNow.month,
    day: cityNow.day,
  };
}

function getValidCalendarDate(year: number, month: number, day: number) {
  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

function getNextNotificationTriggerDate(
  city: SelectedCity,
  hour: number,
  minute: number,
  year?: number,
  month?: number,
  day?: number,
  repeat: RepeatMode = RepeatMode.none,
  weekdays: number[] = [],
  createdAt?: number
) {
  const now = new Date();

  if (repeat === RepeatMode.none) {
    if (year && month && day) {
      const explicitTriggerDate = getTriggerDateForTimezone(
        city.tz,
        year,
        month,
        day,
        hour,
        minute
      );

      return explicitTriggerDate.getTime() > now.getTime() ? explicitTriggerDate : null;
    }

    const cityNow = getDateTimePartsInTimezone(now, city.tz);
    let nextTriggerDate = getTriggerDateForTimezone(
      city.tz,
      cityNow.year,
      cityNow.month,
      cityNow.day,
      hour,
      minute
    );

    if (nextTriggerDate.getTime() <= now.getTime()) {
      const nextCityDate = new Date(cityNow.year, cityNow.month - 1, cityNow.day + 1);
      nextTriggerDate = getTriggerDateForTimezone(
        city.tz,
        nextCityDate.getFullYear(),
        nextCityDate.getMonth() + 1,
        nextCityDate.getDate(),
        hour,
        minute
      );
    }

    return nextTriggerDate;
  }

  const anchorDateParts = getNotificationAnchorDateParts(city, year, month, day, createdAt);
  const anchorTriggerDate = year && month && day
    ? getTriggerDateForTimezone(city.tz, year, month, day, hour, minute)
    : null;
  const referenceDate =
    anchorTriggerDate && anchorTriggerDate.getTime() > now.getTime()
      ? anchorTriggerDate
      : now;
  const cityNow = getDateTimePartsInTimezone(referenceDate, city.tz);

  if (repeat === RepeatMode.daily) {
    let nextTriggerDate = getTriggerDateForTimezone(
      city.tz,
      cityNow.year,
      cityNow.month,
      cityNow.day,
      hour,
      minute
    );

    if (nextTriggerDate.getTime() <= referenceDate.getTime()) {
      const nextCityDate = new Date(cityNow.year, cityNow.month - 1, cityNow.day + 1);
      nextTriggerDate = getTriggerDateForTimezone(
        city.tz,
        nextCityDate.getFullYear(),
        nextCityDate.getMonth() + 1,
        nextCityDate.getDate(),
        hour,
        minute
      );
    }

    return nextTriggerDate;
  }

  if (repeat === RepeatMode.weekly) {
    const fallbackWeekday = new Date(
      anchorDateParts.year,
      anchorDateParts.month - 1,
      anchorDateParts.day
    ).getDay();
    const effectiveWeekdays = weekdays.length > 0 ? [...new Set(weekdays)] : [fallbackWeekday];
    const todayWeekday = new Date(cityNow.year, cityNow.month - 1, cityNow.day).getDay();
    let nearestTriggerDate: Date | null = null;

    for (const weekday of effectiveWeekdays) {
      let diffDays = (weekday - todayWeekday + 7) % 7;
      let candidateCityDate = new Date(cityNow.year, cityNow.month - 1, cityNow.day + diffDays);
      let candidateTriggerDate = getTriggerDateForTimezone(
        city.tz,
        candidateCityDate.getFullYear(),
        candidateCityDate.getMonth() + 1,
        candidateCityDate.getDate(),
        hour,
        minute
      );

      if (candidateTriggerDate.getTime() <= referenceDate.getTime()) {
        diffDays += 7;
        candidateCityDate = new Date(cityNow.year, cityNow.month - 1, cityNow.day + diffDays);
        candidateTriggerDate = getTriggerDateForTimezone(
          city.tz,
          candidateCityDate.getFullYear(),
          candidateCityDate.getMonth() + 1,
          candidateCityDate.getDate(),
          hour,
          minute
        );
      }

      if (!nearestTriggerDate || candidateTriggerDate.getTime() < nearestTriggerDate.getTime()) {
        nearestTriggerDate = candidateTriggerDate;
      }
    }

    return nearestTriggerDate;
  }

  if (repeat === RepeatMode.monthly) {
    let searchYear = cityNow.year;
    let searchMonth = cityNow.month;

    for (let index = 0; index < 24; index += 1) {
      const validCalendarDate = getValidCalendarDate(searchYear, searchMonth, anchorDateParts.day);

      if (validCalendarDate) {
        const candidateTriggerDate = getTriggerDateForTimezone(
          city.tz,
          searchYear,
          searchMonth,
          anchorDateParts.day,
          hour,
          minute
        );

        if (candidateTriggerDate.getTime() > referenceDate.getTime()) {
          return candidateTriggerDate;
        }
      }

      const nextMonthDate = new Date(searchYear, searchMonth, 1);
      searchYear = nextMonthDate.getFullYear();
      searchMonth = nextMonthDate.getMonth() + 1;
    }

    return null;
  }

  let searchYear = cityNow.year;

  for (let index = 0; index < 10; index += 1) {
    const validCalendarDate = getValidCalendarDate(
      searchYear,
      anchorDateParts.month,
      anchorDateParts.day
    );

    if (validCalendarDate) {
      const candidateTriggerDate = getTriggerDateForTimezone(
        city.tz,
        searchYear,
        anchorDateParts.month,
        anchorDateParts.day,
        hour,
        minute
      );

      if (candidateTriggerDate.getTime() > referenceDate.getTime()) {
        return candidateTriggerDate;
      }
    }

    searchYear += 1;
  }

  return null;
}

async function scheduleNotification(
  city: SelectedCity,
  hour: number,
  minute: number,
  year?: number,
  month?: number,
  day?: number,
  label?: string,
  notes?: string,
  url?: string,
  repeat: RepeatMode = RepeatMode.none,
  weekdays: number[] = [],
  createdAt?: number
): Promise<string[] | null> {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return null;
  }

  if (hour === undefined || minute === undefined) {
    console.warn('Cannot schedule notification: missing time values');
    return null;
  }

  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const cityName = city.customName || city.name;

  const body = notes ? `It's ${timeString} in ${cityName}\n${notes}` : `It's ${timeString} in ${cityName}`;
  const title = label || cityName;
  const nextTriggerDate = getNextNotificationTriggerDate(
    city,
    hour,
    minute,
    year,
    month,
    day,
    repeat,
    weekdays,
    createdAt
  );

  if (!nextTriggerDate) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { url },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextTriggerDate,
    },
  });
  return [notificationId];
}

async function cancelNotificationIds(notification: CityNotification): Promise<void> {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return;
  }

  const ids = notification.notificationIds && notification.notificationIds.length > 0
    ? notification.notificationIds
    : notification.notificationId
      ? [notification.notificationId]
      : [];

  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

async function cancelCalendarEvents(notification: CityNotification): Promise<void> {
  await deleteCalendarEntryIds(notification.calendarEventId, notification.calendarEventIds);
}

async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

async function hasNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return false;
  }

  const { status } = await Notifications.getPermissionsAsync();

  return status === 'granted';
}

const SelectedCitiesContext = createContext<SelectedCitiesContextType | null>(null);

export function SelectedCitiesProvider({ children }: { children: ReactNode }) {
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const selectedCitiesRef = useRef<SelectedCity[]>([]);

  useEffect(() => {
    selectedCitiesRef.current = selectedCities;
  }, [selectedCities]);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    let isActive = true;

    void getNotificationsModule().then((Notifications) => {
      if (!isActive || !Notifications) {
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    });

    return () => {
      isActive = false;
    };
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
      let nextId = generateSelectedCityId();
      while (prev.some((selectedCity) => selectedCity.id === nextId)) {
        nextId += 1;
      }

      const newCities = [...prev, { ...city, id: nextId, cityId: city.id }];

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
      const nextCustomName = customName.trim().length === 0 ? undefined : customName;
      const newCities = prev.map((c) =>
        c.id === cityId ? { ...c, customName: nextCustomName } : c
      );

      saveCities(newCities);

      return newCities;
    });
  };

  const reorderCities = (cities: SelectedCity[]) => {
    setSelectedCities(cities);

    saveCities(cities);
  };

  const reconcileScheduledNotifications = async () => {
    const permissionGranted = await hasNotificationPermissions();
    const Notifications = await getNotificationsModule();
    const scheduledNotificationIdSet = new Set<string>(
      permissionGranted && Notifications
        ? (await Notifications.getAllScheduledNotificationsAsync()).map((item) => item.identifier)
        : []
    );

    const currentCities = selectedCitiesRef.current;
    let didChange = false;

    const nextCities: SelectedCity[] = await Promise.all(currentCities.map(async (city) => {
      if (!city.notifications || city.notifications.length === 0) {
        return city;
      }

      const nextNotifications = await Promise.all(city.notifications.map(async (notification) => {
        if (!notification.enabled) {
          return notification;
        }

        const repeat = getEffectiveRepeatMode(notification);
        const nextTriggerDate = getNextNotificationTriggerDate(
          city,
          notification.hour,
          notification.minute,
          notification.year,
          notification.month,
          notification.day,
          repeat,
          notification.weekdays || [],
          notification.createdAt
        );

        if (!nextTriggerDate) {
          await cancelNotificationIds(notification);
          const nextInactiveReason: CityNotification['inactiveReason'] = 'past';

          if (notification.inactiveReason === 'past' && !notification.notificationId && !notification.notificationIds?.length) {
            return notification;
          }

          didChange = true;

          return {
            ...notification,
            inactiveReason: nextInactiveReason,
            notificationId: undefined,
            notificationIds: undefined,
          };
        }

        if (!permissionGranted) {
          await cancelNotificationIds(notification);
          const nextInactiveReason: CityNotification['inactiveReason'] = 'permission';

          if (notification.inactiveReason === 'permission' && !notification.notificationId && !notification.notificationIds?.length) {
            return notification;
          }

          didChange = true;

          return {
            ...notification,
            inactiveReason: nextInactiveReason,
            notificationId: undefined,
            notificationIds: undefined,
          };
        }

        const existingIds = notification.notificationIds && notification.notificationIds.length > 0
          ? notification.notificationIds
          : notification.notificationId
            ? [notification.notificationId]
            : [];

        if (
          notification.inactiveReason === undefined &&
          existingIds.length > 0 &&
          existingIds.every((id) => scheduledNotificationIdSet.has(id))
        ) {
          return notification;
        }

        const notificationIds = await scheduleNotification(
          city,
          notification.hour,
          notification.minute,
          notification.year,
          notification.month,
          notification.day,
          notification.label,
          notification.notes,
          notification.url,
          repeat,
          notification.weekdays || [],
          notification.createdAt
        );

        if (!notificationIds || notificationIds.length === 0) {
          return notification;
        }

        await cancelNotificationIds(notification);
        didChange = true;

        return {
          ...notification,
          inactiveReason: undefined,
          notificationId: notificationIds[0],
          notificationIds,
        };
      }));

      return {
        ...city,
        notifications: nextNotifications,
      };
    }));

    if (didChange) {
      setSelectedCities(nextCities);
      saveCities(nextCities);
    }
  };

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    reconcileScheduledNotifications();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        reconcileScheduledNotifications();
      }
    });

    return () => subscription.remove();
  }, [isLoaded]);

  const addNotification = async (
    cityId: number,
    hour: number,
    minute: number,
    year?: number,
    month?: number,
    day?: number,
    label?: string,
    notes?: string,
    url?: string,
    repeat: RepeatMode = RepeatMode.none,
    weekdays: number[] = [],
    calendarId?: string | null,
    calendarTitle?: string,
    durationMinutes?: number
  ) => {
    const city = selectedCitiesRef.current.find(c => c.id === cityId);
    if (!city) return false;

    const isInactivePastOneTime = isPastExplicitOneTimeNotification(
      city,
      hour,
      minute,
      year,
      month,
      day,
      repeat
    );

    let notificationIds: string[] | null = null;
    let calendarEventIds: string[] | null = null;

    let inactiveReason: CityNotification['inactiveReason'] = isInactivePastOneTime ? 'past' : undefined;

    if (!isInactivePastOneTime) {
      const permissionGranted = await requestNotificationPermissions();

      if (!permissionGranted) {
        inactiveReason = 'permission';
      } else {
        notificationIds = await scheduleNotification(
          city,
          hour,
          minute,
          year,
          month,
          day,
          label,
          notes,
          url,
          repeat,
          weekdays,
          undefined
        );

        if (!notificationIds || notificationIds.length === 0) {
          return false;
        }
      }
    }

    if (!isInactivePastOneTime && calendarId) {
      calendarEventIds = await createCalendarEntryIds(city, {
        hour,
        minute,
        year,
        month,
        day,
        label,
        notes,
        url,
        repeat,
        weekdays,
        calendarId,
        durationMinutes,
      });

      if (calendarEventIds === null) {
        if (notificationIds && notificationIds.length > 0) {
          const cleanupNotification: CityNotification = {
            id: '',
            hour,
            minute,
            enabled: true,
            notificationId: notificationIds[0],
            notificationIds,
          };

          await cancelNotificationIds(cleanupNotification);
        }

        return false;
      }
    }

    const newNotification: CityNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      year,
      month,
      day,
      hour,
      minute,
      repeat,
      weekdays: weekdays.length > 0 ? weekdays : undefined,
      label,
      notes,
      url,
      calendarId: calendarId ?? null,
      calendarTitle,
      durationMinutes,
      calendarEventId: calendarEventIds?.[0],
      calendarEventIds: calendarEventIds || undefined,
      enabled: true,
      inactiveReason,
      notificationId: notificationIds?.[0],
      notificationIds: notificationIds || undefined,
      isDaily: repeat === RepeatMode.daily,
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

    return true;
  };

  const updateNotification = async (
    cityId: number,
    notificationId: string,
    hour: number,
    minute: number,
    year?: number,
    month?: number,
    day?: number,
    label?: string,
    notes?: string,
    url?: string,
    repeat: RepeatMode = RepeatMode.none,
    weekdays: number[] = [],
    calendarId?: string | null,
    calendarTitle?: string,
    durationMinutes?: number
  ) => {
    const city = selectedCitiesRef.current.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return false;

    const isInactivePastOneTime = isPastExplicitOneTimeNotification(
      city,
      hour,
      minute,
      year,
      month,
      day,
      repeat
    );

    let newSystemNotificationIds: string[] | null = null;
    let newCalendarEventIds: string[] | null = null;
    let inactiveReason: CityNotification['inactiveReason'] = isInactivePastOneTime ? 'past' : undefined;

    if (!notification.enabled) {
      inactiveReason = undefined;
    } else if (!isInactivePastOneTime) {
      const permissionGranted = await requestNotificationPermissions();

      if (!permissionGranted) {
        inactiveReason = 'permission';
      } else {
        newSystemNotificationIds = await scheduleNotification(
          city,
          hour,
          minute,
          year,
          month,
          day,
          label,
          notes,
          url,
          repeat,
          weekdays,
          notification.createdAt
        );

        if (!newSystemNotificationIds || newSystemNotificationIds.length === 0) {
          return false;
        }
      }
    }

    if (notification.enabled && !isInactivePastOneTime && calendarId) {
      newCalendarEventIds = await createCalendarEntryIds(city, {
        hour,
        minute,
        year,
        month,
        day,
        label,
        notes,
        url,
        repeat,
        weekdays,
        calendarId,
        durationMinutes,
      });

      if (newCalendarEventIds === null) {
        if (newSystemNotificationIds && newSystemNotificationIds.length > 0) {
          const cleanupNotification: CityNotification = {
            id: '',
            hour,
            minute,
            enabled: true,
            notificationId: newSystemNotificationIds[0],
            notificationIds: newSystemNotificationIds,
          };

          await cancelNotificationIds(cleanupNotification);
        }

        return false;
      }
    }

    await cancelNotificationIds(notification);
    await cancelCalendarEvents(notification);

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: (c.notifications || []).map(n =>
              n.id === notificationId
                ? {
                    ...n,
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    repeat,
                    weekdays: weekdays.length > 0 ? weekdays : undefined,
                    label,
                    notes,
                    url,
                    calendarId: calendarId ?? null,
                    calendarTitle,
                    durationMinutes,
                    calendarEventId: newCalendarEventIds?.[0],
                    calendarEventIds: newCalendarEventIds || undefined,
                    enabled: notification.enabled,
                    inactiveReason,
                    notificationId: newSystemNotificationIds?.[0],
                    notificationIds: newSystemNotificationIds || undefined,
                    isDaily: repeat === RepeatMode.daily,
                  }
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
  };

  const removeNotification = async (cityId: number, notificationId: string) => {
    const city = selectedCitiesRef.current.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (notification) {
      await cancelNotificationIds(notification);
      await cancelCalendarEvents(notification);
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
    const city = selectedCitiesRef.current.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return false;

    if (enabled) {
      const isInactivePastOneTime = isPastExplicitOneTimeNotification(
        city,
        notification.hour,
        notification.minute,
        notification.year,
        notification.month,
        notification.day,
        getEffectiveRepeatMode(notification)
      );

      let newNotificationId: string[] | null = null;
      let newCalendarEventIds: string[] | null = null;
      let inactiveReason: CityNotification['inactiveReason'] = isInactivePastOneTime ? 'past' : undefined;

      if (!isInactivePastOneTime) {
        const permissionGranted = await requestNotificationPermissions();

        if (!permissionGranted) {
          inactiveReason = 'permission';
        } else {
          newNotificationId = await scheduleNotification(
            city,
            notification.hour,
            notification.minute,
            notification.year,
            notification.month,
            notification.day,
            notification.label,
            notification.notes,
            notification.url,
            getEffectiveRepeatMode(notification),
            notification.weekdays || [],
            notification.createdAt
          );

          if (!newNotificationId || newNotificationId.length === 0) {
            return false;
          }
        }
      }

      if (!isInactivePastOneTime && notification.calendarId) {
        newCalendarEventIds = await createCalendarEntryIds(city, {
          hour: notification.hour,
          minute: notification.minute,
          year: notification.year,
          month: notification.month,
          day: notification.day,
          label: notification.label,
          notes: notification.notes,
          url: notification.url,
          repeat: getEffectiveRepeatMode(notification),
          weekdays: notification.weekdays || [],
          calendarId: notification.calendarId,
          durationMinutes: notification.durationMinutes,
        });

        if (newCalendarEventIds === null) {
          if (newNotificationId && newNotificationId.length > 0) {
            const cleanupNotification: CityNotification = {
              id: '',
              hour: notification.hour,
              minute: notification.minute,
              enabled: true,
              notificationId: newNotificationId[0],
              notificationIds: newNotificationId,
            };

            await cancelNotificationIds(cleanupNotification);
          }

          return false;
        }
      }

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? {
                      ...n,
                      enabled: true,
                      inactiveReason,
                      calendarEventId: newCalendarEventIds?.[0],
                      calendarEventIds: newCalendarEventIds || undefined,
                      notificationId: newNotificationId?.[0],
                      notificationIds: newNotificationId || undefined,
                    }
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
      await cancelNotificationIds(notification);
      await cancelCalendarEvents(notification);

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? {
                      ...n,
                      enabled: false,
                      inactiveReason: undefined,
                      calendarEventId: undefined,
                      calendarEventIds: undefined,
                      notificationId: undefined,
                      notificationIds: undefined,
                    }
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
