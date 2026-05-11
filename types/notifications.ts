export enum RepeatMode {
  none = 'none',
  daily = 'daily',
  weekly = 'weekly',
  monthly = 'monthly',
  yearly = 'yearly',
}

type RepeatModeSource = {
  repeat?: RepeatMode | string | null;
  isDaily?: boolean;
  weekdays?: number[];
};

export function normalizeRepeatMode(repeat?: RepeatMode | string | null): RepeatMode | null {
  if (typeof repeat !== 'string') {
    return null;
  }

  const normalizedRepeat = repeat.toLowerCase();

  if (
    normalizedRepeat === RepeatMode.none ||
    normalizedRepeat === RepeatMode.daily ||
    normalizedRepeat === RepeatMode.weekly ||
    normalizedRepeat === RepeatMode.monthly ||
    normalizedRepeat === RepeatMode.yearly
  ) {
    return normalizedRepeat as RepeatMode;
  }

  return null;
}

export function getEffectiveRepeatMode(source: RepeatModeSource): RepeatMode {
  const normalizedRepeat = normalizeRepeatMode(source.repeat);

  if (normalizedRepeat) {
    return normalizedRepeat;
  }

  if (source.isDaily) {
    return RepeatMode.daily;
  }

  if (source.weekdays && source.weekdays.length > 0) {
    return RepeatMode.weekly;
  }

  return RepeatMode.none;
}
