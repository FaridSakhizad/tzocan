const ABSTRACT_TIMEZONE_CITY_ID_BASE = -100000;
const ABSTRACT_TIMEZONE_PREFIX = 'GMT_OFFSET:';

export function formatGmtOffsetLabel(offsetMinutes: number) {
  const prefix = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `GMT${prefix}${hours}`;
  }

  return `GMT${prefix}${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function getAbstractTimezoneId(offsetMinutes: number) {
  return ABSTRACT_TIMEZONE_CITY_ID_BASE - offsetMinutes;
}

export function getAbstractTimezoneKey(offsetMinutes: number) {
  return `${ABSTRACT_TIMEZONE_PREFIX}${offsetMinutes}`;
}

export function getAbstractTimezoneOffsetMinutes(timezone: string) {
  if (!timezone.startsWith(ABSTRACT_TIMEZONE_PREFIX)) {
    return null;
  }

  const rawValue = Number(timezone.slice(ABSTRACT_TIMEZONE_PREFIX.length));

  if (!Number.isFinite(rawValue)) {
    return null;
  }

  return rawValue;
}

export function isAbstractTimezoneValue(timezone: string) {
  return getAbstractTimezoneOffsetMinutes(timezone) !== null;
}

export function getFixedOffsetTimezoneForOffsetMinutes(offsetMinutes: number) {
  return getAbstractTimezoneKey(offsetMinutes);
}

function getShiftedUtcDate(date: Date, offsetMinutes: number) {
  return new Date(date.getTime() + offsetMinutes * 60000);
}

export function formatPartsInTimezone(
  date: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  if (abstractOffsetMinutes !== null) {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: 'UTC',
    }).formatToParts(getShiftedUtcDate(date, abstractOffsetMinutes));
  }

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: timezone,
  }).formatToParts(date);
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  if (abstractOffsetMinutes !== null) {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: 'UTC',
    }).format(getShiftedUtcDate(date, abstractOffsetMinutes));
  }

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: timezone,
  }).format(date);
}

export function getDatePartsInTimezone(date: Date, timezone: string) {
  const parts = formatPartsInTimezone(date, timezone, 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const getPart = (type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
}

export function getDateTimePartsInTimezone(date: Date, timezone: string) {
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

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}
