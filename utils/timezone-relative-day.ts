export function getDatePartsInTimezone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
}

export function getRelativeDayLabelForTimezone(
  timezone: string,
  t: (key: string) => string,
  now = new Date()
) {
  const cityNow = getDatePartsInTimezone(now, timezone);
  const localStamp = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const cityStamp = Date.UTC(cityNow.year, cityNow.month - 1, cityNow.day);
  const dayDiff = Math.round((cityStamp - localStamp) / 86400000);

  if (dayDiff > 0) {
    return t('common.tomorrow');
  }

  if (dayDiff < 0) {
    return t('common.yesterday');
  }

  return null;
}
