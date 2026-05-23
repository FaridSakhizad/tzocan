export { getDatePartsInTimezone } from '@/utils/abstract-timezone';
import { getDatePartsInTimezone } from '@/utils/abstract-timezone';

export function getRelativeDayLabelForTimezone(
  timezone: string,
  t: (key: string) => string,
  now = new Date(),
  baseLocalDate = now
) {
  const cityNow = getDatePartsInTimezone(now, timezone);
  const localStamp = Date.UTC(
    baseLocalDate.getFullYear(),
    baseLocalDate.getMonth(),
    baseLocalDate.getDate()
  );
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
