import {
  formatPartsInTimezone,
  getAbstractTimezoneOffsetMinutes,
} from '@/utils/abstract-timezone';

function formatOffsetLabel(offsetMinutes: number) {
  const prefix = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `${prefix}${hours}h`;
  }

  return `${prefix}${hours}:${minutes.toString().padStart(2, '0')}h`;
}

export function getUtcOffsetMinutesForTimezone(timezone: string, date = new Date()) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  if (abstractOffsetMinutes !== null) {
    return abstractOffsetMinutes;
  }

  const parts = formatPartsInTimezone(date, timezone, 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const getPart = (type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  const asUtcTimestamp = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  return Math.round((asUtcTimestamp - date.getTime()) / 60000);
}

export function getTimezoneDifferenceLabel(
  timezone: string,
  sameLabel: string,
  date = new Date()
) {
  const targetOffsetMinutes = getUtcOffsetMinutesForTimezone(timezone, date);
  const localOffsetMinutes = -date.getTimezoneOffset();
  const diffMinutes = targetOffsetMinutes - localOffsetMinutes;

  if (diffMinutes === 0) {
    return sameLabel;
  }

  return formatOffsetLabel(diffMinutes);
}

export function getUtcOffsetLabel(timezone: string, date = new Date()) {
  return formatOffsetLabel(getUtcOffsetMinutesForTimezone(timezone, date));
}
