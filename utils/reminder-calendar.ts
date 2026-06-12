import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type * as ExpoCalendar from 'expo-calendar';
import type { PermissionResponse } from 'expo-modules-core';

import { RepeatMode } from '@/types/notifications';
import { getDateTimePartsInTimezone } from '@/utils/abstract-timezone';

const CALENDAR_EVENT_DURATION_MINUTES = 60;

export type ReminderCalendarOption = {
  id: string;
  label: string;
  hint?: string;
};

export type ReminderCalendarValues = {
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  repeat: RepeatMode;
  weekdays?: number[];
  label?: string;
  notes?: string;
  url?: string;
  calendarId?: string | null;
};

type ReminderCalendarCity = {
  name: string;
  customName?: string;
  tz: string;
};

type ReminderCalendarModule = typeof ExpoCalendar;

type ReminderCalendarOptionsResult = {
  available: boolean;
  options: ReminderCalendarOption[];
};

let reminderCalendarModulePromise: Promise<ReminderCalendarModule | null> | null = null;

function isUnsupportedReminderCalendarRuntime() {
  return Constants.appOwnership === 'expo';
}

async function getReminderCalendarModule(): Promise<ReminderCalendarModule | null> {
  if (isUnsupportedReminderCalendarRuntime()) {
    return null;
  }

  if (!reminderCalendarModulePromise) {
    reminderCalendarModulePromise = import('expo-calendar')
      .then((module) => module)
      .catch((error) => {
        console.warn('Calendar module is unavailable in this runtime', error);

        return null;
      });
  }

  return reminderCalendarModulePromise;
}

async function ensureReminderCalendarPermissions(): Promise<boolean> {
  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return false;
  }

  try {
    const isIosReminderMode = Platform.OS === 'ios';
    const permissionResponse = isIosReminderMode
      ? await Calendar.getRemindersPermissionsAsync()
      : await Calendar.getCalendarPermissionsAsync();
    const { status: existingStatus } = permissionResponse;
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = isIosReminderMode
        ? await Calendar.requestRemindersPermissionsAsync()
        : await Calendar.requestCalendarPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to request calendar permissions', error);

    return false;
  }
}

async function getReminderCalendarPermissionResponse(): Promise<PermissionResponse | null> {
  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return null;
  }

  try {
    return Platform.OS === 'ios'
      ? Calendar.getRemindersPermissionsAsync()
      : Calendar.getCalendarPermissionsAsync();
  } catch (error) {
    console.warn('Failed to get calendar permissions', error);

    return null;
  }
}

export async function getReminderCalendarPermissionState() {
  const permission = await getReminderCalendarPermissionResponse();

  return {
    granted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? false,
    available: permission !== null,
  };
}

export async function requestReminderCalendarPermission() {
  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return {
      granted: false,
      canAskAgain: false,
      available: false,
    };
  }

  try {
    const permission = Platform.OS === 'ios'
      ? await Calendar.requestRemindersPermissionsAsync()
      : await Calendar.requestCalendarPermissionsAsync();

    return {
      granted: permission.granted,
      canAskAgain: permission.canAskAgain,
      available: true,
    };
  } catch (error) {
    console.warn('Failed to request calendar permission explicitly', error);

    return {
      granted: false,
      canAskAgain: false,
      available: true,
    };
  }
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

  return new Date(now.getTime() + diffMs);
}

function getReminderCalendarTitle(city: ReminderCalendarCity, label?: string) {
  return label?.trim() || city.customName || city.name;
}

function getReminderCalendarLocation(city: ReminderCalendarCity) {
  return city.customName || city.name;
}

function buildReminderCalendarNotes(notes?: string) {
  return notes?.trim() || '';
}

function buildReminderCalendarOccurrences(
  city: ReminderCalendarCity,
  values: ReminderCalendarValues
): Date[] {
  const now = new Date();
  const hasExplicitDate = Boolean(values.year && values.month && values.day);
  let anchorYear = values.year;
  let anchorMonth = values.month;
  let anchorDay = values.day;

  if (!anchorYear || !anchorMonth || !anchorDay) {
    const parts = getDateTimePartsInTimezone(now, city.tz);
    anchorYear = parts.year;
    anchorMonth = parts.month;
    anchorDay = parts.day;
  }

  const anchorTrigger = getTriggerDateForTimezone(
    city.tz,
    anchorYear,
    anchorMonth,
    anchorDay,
    values.hour,
    values.minute
  );

  if (values.repeat === RepeatMode.none) {
    if (!hasExplicitDate && anchorTrigger.getTime() <= now.getTime()) {
      const next = new Date(anchorYear, anchorMonth - 1, anchorDay + 1);

      return [
        getTriggerDateForTimezone(
          city.tz,
          next.getFullYear(),
          next.getMonth() + 1,
          next.getDate(),
          values.hour,
          values.minute
        ),
      ];
    }

    return [anchorTrigger];
  }

  if (values.repeat === RepeatMode.weekly && values.weekdays && values.weekdays.length > 0) {
    const cityTodayWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay).getDay();
    const triggers = new Map<string, Date>();

    for (const targetCityWeekday of values.weekdays) {
      const diffDays = (targetCityWeekday - cityTodayWeekday + 7) % 7;
      const cityDateForWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay + diffDays);
      const localTrigger = getTriggerDateForTimezone(
        city.tz,
        cityDateForWeekday.getFullYear(),
        cityDateForWeekday.getMonth() + 1,
        cityDateForWeekday.getDate(),
        values.hour,
        values.minute
      );

      triggers.set(
        `${localTrigger.getDay()}-${localTrigger.getHours()}-${localTrigger.getMinutes()}`,
        localTrigger
      );
    }

    return Array.from(triggers.values());
  }

  return [anchorTrigger];
}

function buildReminderCalendarRecurrenceRule(
  Calendar: ReminderCalendarModule,
  values: ReminderCalendarValues
) {
  if (values.repeat === RepeatMode.none) {
    return null;
  }

  if (values.repeat === RepeatMode.daily) {
    return {
      frequency: Calendar.Frequency.DAILY,
    };
  }

  if (values.repeat === RepeatMode.weekly) {
    return {
      frequency: Calendar.Frequency.WEEKLY,
    };
  }

  if (values.repeat === RepeatMode.monthly) {
    return {
      frequency: Calendar.Frequency.MONTHLY,
    };
  }

  return {
    frequency: Calendar.Frequency.YEARLY,
  };
}

export async function getReminderCalendarOptions(): Promise<ReminderCalendarOptionsResult> {
  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return {
      available: false,
      options: [],
    };
  }

  const hasPermissions = await ensureReminderCalendarPermissions();

  if (!hasPermissions) {
    return {
      available: false,
      options: [],
    };
  }

  try {
    const entityType = Platform.OS === 'ios' ? Calendar.EntityTypes.REMINDER : Calendar.EntityTypes.EVENT;
    const calendars = await Calendar.getCalendarsAsync(entityType);
    const options = calendars
      .filter((calendar) => {
        if (!calendar.allowsModifications) {
          return false;
        }

        if (Platform.OS === 'android' && calendar.isSynced === false) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
          return left.isPrimary ? -1 : 1;
        }

        return left.title.localeCompare(right.title);
      })
      .map((calendar) => ({
        id: calendar.id,
        label: calendar.title || calendar.name || calendar.ownerAccount || calendar.id,
        hint:
          Platform.OS === 'android'
            ? calendar.ownerAccount || undefined
            : calendar.source?.name || undefined,
      }));

    return {
      available: true,
      options,
    };
  } catch (error) {
    console.warn('Failed to load reminder calendar options', error);

    return {
      available: false,
      options: [],
    };
  }
}

export async function createReminderCalendarEntryIds(
  city: ReminderCalendarCity,
  values: ReminderCalendarValues
): Promise<string[] | null> {
  if (!values.calendarId) {
    return [];
  }

  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return null;
  }

  const hasPermissions = await ensureReminderCalendarPermissions();

  if (!hasPermissions) {
    return null;
  }

  try {
    const eventStartDates = buildReminderCalendarOccurrences(city, values);
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const title = getReminderCalendarTitle(city, values.label);
    const location = getReminderCalendarLocation(city);
    const notes = buildReminderCalendarNotes(values.notes);
    const recurrenceRule = buildReminderCalendarRecurrenceRule(Calendar, values);
    const ids: string[] = [];

    for (const startDate of eventStartDates) {
      const id = Platform.OS === 'ios'
        ? await Calendar.createReminderAsync(values.calendarId, {
            title,
            notes,
            url: values.url,
            startDate,
            dueDate: startDate,
            timeZone: localTimezone,
            alarms: [{ relativeOffset: 0 }],
            recurrenceRule,
          })
        : await Calendar.createEventAsync(values.calendarId, {
            title,
            location,
            notes,
            url: values.url,
            startDate,
            endDate: new Date(startDate.getTime() + CALENDAR_EVENT_DURATION_MINUTES * 60000),
            timeZone: localTimezone,
            allDay: false,
            alarms: [{ relativeOffset: 0 }],
            recurrenceRule,
          });

      ids.push(id);
    }

    return ids;
  } catch (error) {
    console.warn('Failed to create reminder calendar entries', error);

    return null;
  }
}

export async function deleteReminderCalendarEntryIds(
  calendarEventId?: string,
  calendarEventIds?: string[]
): Promise<void> {
  const Calendar = await getReminderCalendarModule();

  if (!Calendar) {
    return;
  }

  const ids =
    calendarEventIds && calendarEventIds.length > 0
      ? calendarEventIds
      : calendarEventId
        ? [calendarEventId]
        : [];

  await Promise.all(
    ids.map(async (id) => {
      try {
        if (Platform.OS === 'ios') {
          await Calendar.deleteReminderAsync(id);
        } else {
          await Calendar.deleteEventAsync(id);
        }
      } catch (error) {
        console.warn('Failed to delete calendar entry', error);
      }
    })
  );
}
