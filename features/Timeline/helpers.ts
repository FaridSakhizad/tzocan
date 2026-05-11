import type { SelectedCity } from '@/contexts/selected-cities-context';
import { RepeatMode, getEffectiveRepeatMode } from '@/types/notifications';
import { getFocusedDateTimeFromHourIndex } from '@/utils/timeline-core';

export type HourLabel = {
  hour: number;
  suffix: string | null;
};

export type MidnightLabel = {
  weekday: string;
  monthDay: string;
};

export function getDatePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
}

export function addDays(year: number, month: number, day: number, offsetDays: number) {
  const next = new Date(year, month - 1, day + offsetDays);

  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: next.getDate(),
  };
}

export function isSameYmd(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function getRepeatMode(notification: NonNullable<SelectedCity['notifications']>[number]) {
  return getEffectiveRepeatMode(notification);
}

export function shouldNotificationTriggerAtHour(
  notification: NonNullable<SelectedCity['notifications']>[number],
  slotDateTime: Date,
  cityTimezone: string,
  now: Date
) {
  if (!notification.enabled || notification.inactiveReason) {
    return false;
  }

  const slotParts = getDatePartsInTimezone(slotDateTime, cityTimezone);

  if (slotParts.hour !== notification.hour) {
    return false;
  }

  const currentCityParts = getDatePartsInTimezone(now, cityTimezone);
  const repeat = getRepeatMode(notification);

  if (repeat === RepeatMode.daily) {
    return true;
  }

  if (repeat === RepeatMode.weekly) {
    const fallbackWeekday = new Date(
      currentCityParts.year,
      currentCityParts.month - 1,
      currentCityParts.day
    ).getDay();
    const weekdays =
      notification.weekdays && notification.weekdays.length > 0
        ? notification.weekdays
        : [fallbackWeekday];

    return weekdays.includes(
      new Date(slotParts.year, slotParts.month - 1, slotParts.day).getDay()
    );
  }

  if (repeat === RepeatMode.monthly) {
    const dayOfMonth = notification.day ?? currentCityParts.day;
    return slotParts.day === dayOfMonth;
  }

  if (repeat === RepeatMode.yearly) {
    const month = notification.month ?? currentCityParts.month;
    const day = notification.day ?? currentCityParts.day;
    return slotParts.month === month && slotParts.day === day;
  }

  if (notification.year && notification.month && notification.day) {
    return isSameYmd(slotParts, {
      year: notification.year,
      month: notification.month,
      day: notification.day,
    });
  }

  const isTimePassed =
    currentCityParts.hour > notification.hour ||
    (currentCityParts.hour === notification.hour && currentCityParts.minute >= notification.minute);

  const triggerYmd = isTimePassed
    ? addDays(currentCityParts.year, currentCityParts.month, currentCityParts.day, 1)
    : {
        year: currentCityParts.year,
        month: currentCityParts.month,
        day: currentCityParts.day,
      };

  return isSameYmd(slotParts, triggerYmd);
}

export function getNotificationCountForHour(city: SelectedCity, hourIndex: number, now: Date) {
  const notifications = city.notifications || [];

  if (notifications.length === 0) {
    return 0;
  }

  const slotDateTime = getFocusedDateTimeFromHourIndex(hourIndex);
  let count = 0;

  notifications.forEach((notification) => {
    if (shouldNotificationTriggerAtHour(notification, slotDateTime, city.tz, now)) {
      count += 1;
    }
  });

  return count;
}

export function getHourLabelForTimezone(
  date: Date,
  timezone: string,
  timeFormat: string
): HourLabel {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10);

  if (timeFormat === '12h') {
    return {
      hour: hour % 12 === 0 ? 12 : hour % 12,
      suffix: hour < 12 ? 'am' : 'pm',
    };
  }

  return {
    hour,
    suffix: null,
  };
}

export function getMidnightLabelForTimezone(
  date: Date,
  timezone: string,
  locale: string
): MidnightLabel {
  return {
    weekday: new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      weekday: 'short',
    }).format(date),
    monthDay: new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    }).format(date),
  };
}
