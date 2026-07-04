import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityNotification } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { RepeatMode, getEffectiveRepeatMode } from '@/types/notifications';
import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';

import IconClock from '@/assets/images/icon--clock-2--outlined.svg';
import IconCalendar from '@/assets/images/icon--calendar-2--outlined.svg';
import IconRepeat from '@/assets/images/icon--repeat-1.svg';
import IconDelete from '@/assets/images/icon--x-2--outlined.svg';
import IconArrow from '@/assets/images/icon--arrow-1.svg';
import IconCheckmark from '@/assets/images/icon--checkmark-2.svg';

import { NotificationPickerModal } from '@/components/notification-picker-modal';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';
import { getCalendarOptions, type CalendarOption } from '@/utils/reminder-calendar';
import {
  getDatePartsInTimezone as getAbstractDatePartsInTimezone,
  getDateTimePartsInTimezone,
} from '@/utils/abstract-timezone';

export type NotificationFormValues = {
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
  calendarTitle?: string;
  durationMinutes?: number;
};

type NotificationModalProps = {
  visible: boolean;
  cityName: string;
  cityTimezone?: string;
  mode: 'add' | 'edit';
  citySelectionMode?: 'selectable' | 'locked';
  cityOptions?: { id: number; label: string; hint?: string; timezone: string }[];
  selectedCityId?: number | null;
  onSelectCityId?: (cityId: number) => void;
  initialNotification?: CityNotification | null;
  onClose: () => void;
  onSave: (values: NotificationFormValues) => Promise<boolean>;
};

enum NotificationPickerKind {
  City = 'city',
  Time = 'time',
  Date = 'date',
  Repeat = 'repeat',
  Weekdays = 'weekdays',
  Calendar = 'calendar',
  CalendarRequired = 'calendarRequired',
}

const LAST_SELECTED_CALENDAR_STORAGE_KEY = '@tzalac_last_selected_calendar';

type StoredCalendarSelection = {
  id: string;
  title?: string;
};

export function NotificationModal({
  visible,
  cityName,
  cityTimezone,
  mode,
  citySelectionMode = 'locked',
  cityOptions,
  selectedCityId,
  onSelectCityId,
  initialNotification,
  onClose,
  onSave,
}: NotificationModalProps) {
  const { theme } = useAppTheme();
  const { t, locale, weekdayShortLabels } = useI18n();
  const { firstDayOfWeek, timeFormat } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);
  const DATE_SHIFT_LABELS = useMemo(() => ({
    previousDay: t('common.previousDay'),
    nextDay: t('common.nextDay'),
    previousMonth: t('common.previousMonth'),
    nextMonth: t('common.nextMonth'),
    previousYear: t('common.previousYear'),
    nextYear: t('common.nextYear'),
  }), [t]);
  const REPEAT_LABELS = useMemo(() => ({
    todayOnly: t('reminder.repeat.never'),
    daily: t('reminder.repeat.daily'),
    weekly: t('reminder.repeat.weekly'),
    monthly: t('reminder.repeat.monthly'),
    yearly: t('reminder.repeat.yearly'),
    chooseRepeat: t('reminder.repeatPlaceholder'),
    chooseSpecificWeekdays: t('reminder.repeat.specificWeekdays'),
    weekdaysNotSelected: t('reminder.repeat.notSelected'),
    weekdays: weekdayShortLabels,
  }), [t, weekdayShortLabels]);
  const [notificationDate, setNotificationDate] = useState(new Date());
  const [notificationTime, setNotificationTime] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [hasDate, setHasDate] = useState(false);
  const [isTimeSelected, setIsTimeSelected] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>(RepeatMode.none);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [activePicker, setActivePicker] = useState<NotificationPickerKind | null>(null);
  const [notificationLabel, setNotificationLabel] = useState('');
  const [notificationNotes, setNotificationNotes] = useState('');
  const [notificationUrl, setNotificationUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState(new Date());
  const [pickerDraftDate, setPickerDraftDate] = useState(new Date());
  const [pickerDraftRepeat, setPickerDraftRepeat] = useState<RepeatMode>(RepeatMode.none);
  const [pickerDraftWeekdays, setPickerDraftWeekdays] = useState<number[]>([]);
  const [pickerDraftCityId, setPickerDraftCityId] = useState<number | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [selectedCalendarTitle, setSelectedCalendarTitle] = useState<string | undefined>();
  const [pickerDraftCalendarId, setPickerDraftCalendarId] = useState<string | null>(null);
  const [calendarOptions, setCalendarOptions] = useState<CalendarOption[]>([]);
  const [isCalendarSelectionAvailable, setIsCalendarSelectionAvailable] = useState(true);
  const [isLoadingCalendarOptions, setIsLoadingCalendarOptions] = useState(false);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number | undefined>();
  const dismissTextInputKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);
  const effectiveRepeatMode = getEffectiveRepeatMode({
    repeat,
    weekdays,
  });
  const requiresCalendarForRecurringStartDate =
    hasDate &&
    effectiveRepeatMode !== RepeatMode.none;

  const formatDateLabel = useCallback((date: Date) => {
    const currentYear = new Date().getFullYear();
    const includeYear = date.getFullYear() !== currentYear;
    const parts = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).formatToParts(date);
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
    const baseLabel = `${getPart('weekday')} ${getPart('day')} ${getPart('month')}`;

    if (includeYear) {
      return `${baseLabel}, ${getPart('year')}`;
    }

    return baseLabel;
  }, [locale]);

  const formatTimeLabel = useCallback((hour: number, minute: number) => {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(new Date(2027, 0, 1, hour, minute));
  }, [locale, timeFormat]);

  const getTriggerDateForTimezone = (
    timezone: string,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
  ): Date => {
    const now = new Date();
    const parts = getDateTimePartsInTimezone(now, timezone);

    const currentDateInTz = new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);

    const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

    return new Date(now.getTime() + diffMs);
  };
  const getDatePartsInTimezone = (date: Date, timezone: string) => {
    return getAbstractDatePartsInTimezone(date, timezone);
  };
  const getPreviewInfo = useCallback((timezone: string, hour: number, minute: number, overrideDate?: Date) => {
    const now = new Date();
    let triggerDate: Date;
    let cityYear: number;
    let cityMonth: number;
    let cityDay: number;
    const effectiveHasDate = Boolean(overrideDate) || hasDate;
    const effectiveDate = overrideDate || notificationDate;

    if (effectiveHasDate) {
      cityYear = effectiveDate.getFullYear();
      cityMonth = effectiveDate.getMonth() + 1;
      cityDay = effectiveDate.getDate();
      triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
    } else {
      const cityNow = getDatePartsInTimezone(now, timezone);
      cityYear = cityNow.year;
      cityMonth = cityNow.month;
      cityDay = cityNow.day;

      triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
      if (triggerDate.getTime() <= now.getTime()) {
        const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
        cityYear = next.getFullYear();
        cityMonth = next.getMonth() + 1;
        cityDay = next.getDate();
        triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
      }
    }

    const timeText = new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
    }).format(triggerDate);
    const localTimeText = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(triggerDate);

    const localYear = triggerDate.getFullYear();
    const localMonth = triggerDate.getMonth() + 1;
    const localDay = triggerDate.getDate();
    const localDateText = formatDateLabel(triggerDate);
    const cityStamp = Date.UTC(cityYear, cityMonth - 1, cityDay);
    const localStamp = Date.UTC(localYear, localMonth - 1, localDay);
    const dayDiff = Math.round((localStamp - cityStamp) / 86400000);
    let monthOrYearShiftText = '';

    if (localYear > cityYear) {
      monthOrYearShiftText = DATE_SHIFT_LABELS.nextYear;
    } else if (localYear < cityYear) {
      monthOrYearShiftText = DATE_SHIFT_LABELS.previousYear;
    } else if (localMonth > cityMonth) {
      monthOrYearShiftText = DATE_SHIFT_LABELS.nextMonth;
    } else if (localMonth < cityMonth) {
      monthOrYearShiftText = DATE_SHIFT_LABELS.previousMonth;
    }

    const dayShiftText =
      dayDiff < 0
        ? DATE_SHIFT_LABELS.previousDay
        : dayDiff > 0
          ? DATE_SHIFT_LABELS.nextDay
          : '';

    return {
      timeText,
      localTimeText,
      localDateText: localStamp !== cityStamp ? localDateText : '',
      monthOrYearShiftText,
      dayShiftText,
    };
  }, [DATE_SHIFT_LABELS, formatDateLabel, hasDate, locale, notificationDate, timeFormat]);

  const loadLastSelectedCalendar = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_SELECTED_CALENDAR_STORAGE_KEY);

      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as StoredCalendarSelection;

      if (!parsed?.id) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, []);

  const persistLastSelectedCalendar = useCallback(async (calendarId: string, calendarTitle?: string) => {
    try {
      await AsyncStorage.setItem(
        LAST_SELECTED_CALENDAR_STORAGE_KEY,
        JSON.stringify({
          id: calendarId,
          title: calendarTitle,
        } satisfies StoredCalendarSelection)
      );
    } catch {
      // Ignore storage errors and keep the form usable.
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isCancelled = false;

    const initialize = async () => {
      const source = initialNotification ?? null;
      const hasDateInSource = Boolean(source?.year && source?.month && source?.day);
      const storedCalendar = !source ? await loadLastSelectedCalendar() : null;

      if (isCancelled) {
        return;
      }

      if (hasDateInSource && source?.year && source?.month && source?.day) {
        setNotificationDate(new Date(source.year, source.month - 1, source.day));
      } else {
        setNotificationDate(new Date());
      }

      const time = new Date();
      if (source) {
        time.setHours(source.hour, source.minute, 0, 0);
      } else {
        time.setHours(0, 0, 0, 0);
      }
      setNotificationTime(time);
      setIsTimeSelected(Boolean(source));
      setRepeat(source ? getEffectiveRepeatMode(source) : RepeatMode.none);
      setWeekdays(source?.weekdays || []);

      setHasDate(hasDateInSource);
      setActivePicker(null);
      setNotificationLabel(source?.label || '');
      setNotificationNotes(source?.notes || '');
      setNotificationUrl(source?.url || '');
      setSelectedCalendarId(source?.calendarId ?? storedCalendar?.id ?? null);
      setSelectedCalendarTitle(source?.calendarTitle ?? storedCalendar?.title);
      setSelectedDurationMinutes(source?.durationMinutes);
      const initialPickerTime = new Date(time);
      if (!source) {
        initialPickerTime.setHours(12, 0, 0, 0);
      }
      setPickerDraftTime(initialPickerTime);

      let nextPickerDraftDate = new Date();

      if (hasDateInSource && source?.year && source?.month && source?.day) {
        nextPickerDraftDate = new Date(source.year, source.month - 1, source.day);
      }

      setPickerDraftDate(nextPickerDraftDate);
      setPickerDraftRepeat(source ? getEffectiveRepeatMode(source) : RepeatMode.none);
      setPickerDraftWeekdays(source?.weekdays || []);
      setPickerDraftCityId(selectedCityId ?? null);
      setPickerDraftCalendarId(source?.calendarId ?? storedCalendar?.id ?? null);
      setCalendarOptions([]);
      setIsCalendarSelectionAvailable(true);
      setIsLoadingCalendarOptions(false);
    };

    void initialize();

    return () => {
      isCancelled = true;
    };
  }, [visible, initialNotification, selectedCityId, loadLastSelectedCalendar]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closePicker();

        return;
      }

      if (selectedDate) {
        setPickerDraftDate(selectedDate);
        setNotificationDate(selectedDate);
        setHasDate(true);
        closePicker();
      }

      return;
    }

    if (selectedDate) {
      setPickerDraftDate(selectedDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closePicker();

        return;
      }

      if (selectedDate) {
        setPickerDraftTime(selectedDate);
        setNotificationTime(selectedDate);
        setIsTimeSelected(true);
        closePicker();
      }

      return;
    }

    if (selectedDate) {
      setPickerDraftTime(selectedDate);
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    dismissTextInputKeyboard();

    if (requiresCalendarForRecurringStartDate && !selectedCalendarId) {
      void openCalendarPicker(NotificationPickerKind.CalendarRequired);

      return;
    }

    setIsSaving(true);

    try {
      const hour = notificationTime.getHours();
      const minute = notificationTime.getMinutes();
      const label = notificationLabel.trim() || undefined;
      const notes = notificationNotes.trim() || undefined;
      const url = notificationUrl.trim() || undefined;

      const values: NotificationFormValues = {
        hour,
        minute,
        year: hasDate ? notificationDate.getFullYear() : undefined,
        month: hasDate ? notificationDate.getMonth() + 1 : undefined,
        day: hasDate ? notificationDate.getDate() : undefined,
        repeat,
        weekdays: weekdays.length > 0 ? weekdays : undefined,
        label,
        notes,
        url,
        calendarId: selectedCalendarId,
        calendarTitle: selectedCalendarTitle,
        durationMinutes: selectedDurationMinutes,
      };

      const didSave = await onSave(values);

      if (didSave) {
        if (selectedCalendarId) {
          await persistLastSelectedCalendar(selectedCalendarId, selectedCalendarTitle);
        }
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTimeLabel = formatTimeLabel(notificationTime.getHours(), notificationTime.getMinutes());
  const selectedDateLabel = formatDateLabel(notificationDate);

  const selectedCityOption = cityOptions?.find((city) => city.id === selectedCityId) || null;
  const weekdayOrder = firstDayOfWeek === 'sunday'
    ? [0, 1, 2, 3, 4, 5, 6]
    : [1, 2, 3, 4, 5, 6, 0];
  const weekdaySortOrder = new Map(weekdayOrder.map((value, index) => [value, index]));

  const repeatLabel = (() => {
    if (weekdays.length > 0) {
      return weekdays
        .slice()
        .sort((a, b) => (weekdaySortOrder.get(a) ?? 0) - (weekdaySortOrder.get(b) ?? 0))
        .map((d) => REPEAT_LABELS.weekdays[d as keyof typeof REPEAT_LABELS.weekdays])
        .join(', ');
    }

    if (repeat === RepeatMode.none) {
      return null;
    }

    if (repeat === RepeatMode.daily) {
      return REPEAT_LABELS.daily;
    }

    if (repeat === RepeatMode.weekly) {
      return REPEAT_LABELS.weekly;
    }

    if (repeat === RepeatMode.monthly) {
      return REPEAT_LABELS.monthly;
    }

    return REPEAT_LABELS.yearly;
  })();
  const selectedCalendarOption = calendarOptions.find((calendar) => calendar.id === selectedCalendarId) || null;
  const calendarLabel = selectedCalendarOption?.label || selectedCalendarTitle || null;
  const calendarPickerTitle = t('reminder.chooseCalendar');
  const calendarUnavailableLabel = t('reminder.calendarUnavailable');
  const calendarRequiredHint = t('reminder.calendarRequiredHint');
  const calendarRequiredDescription = t('reminder.calendarRequiredDescription');
  const datePlaceholderLabel =
    effectiveRepeatMode !== RepeatMode.none
      ? t('reminder.startDatePlaceholder')
      : t('reminder.datePlaceholder');

  const canSelectCity =
    citySelectionMode === 'selectable' &&
    mode === 'add' &&
    Boolean(cityOptions && cityOptions.length > 0 && onSelectCityId);

  const canSave =
    isTimeSelected &&
    (mode === 'edit' || !cityOptions || selectedCityId !== null && selectedCityId !== undefined);
  const isPickerOpen = activePicker !== null;
  const isAndroidNativeDateTimePicker =
    Platform.OS === 'android' &&
    (activePicker === NotificationPickerKind.Time || activePicker === NotificationPickerKind.Date);
  const isPickerModalVisible = isPickerOpen && !isAndroidNativeDateTimePicker;
  const isCityPicker = activePicker === NotificationPickerKind.City;
  const isCalendarPicker =
    activePicker === NotificationPickerKind.Calendar ||
    activePicker === NotificationPickerKind.CalendarRequired;
  const isCalendarRequiredPicker = activePicker === NotificationPickerKind.CalendarRequired;
  const effectiveTimezone = selectedCityOption?.timezone || cityTimezone;

  const pickerTitle = (() => {
    if (activePicker === NotificationPickerKind.City) {
      return t('reminder.chooseCity');
    }

    if (activePicker === NotificationPickerKind.Time) {
      return t('reminder.chooseTime');
    }

    if (activePicker === NotificationPickerKind.Date) {
      return t('reminder.chooseDate');
    }

    if (
      activePicker === NotificationPickerKind.Calendar ||
      activePicker === NotificationPickerKind.CalendarRequired
    ) {
      return calendarPickerTitle;
    }

    if (activePicker === NotificationPickerKind.Weekdays) {
      return t('reminder.chooseWeekdays');
    }

    if (activePicker === NotificationPickerKind.Repeat) {
      return t('reminder.chooseRepeat');
    }

    return null;
  })();

  const modalTitle = (() => {
    if (mode === 'edit') {
      return t('reminder.title.edit');
    }

    if (citySelectionMode === 'locked') {
      return t('reminder.title.add');
    }

    return t('reminder.title.new');
  })();

  const localPreviewInfo = useMemo(() => {
    if (!isTimeSelected) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, notificationTime.getHours(), notificationTime.getMinutes());
  }, [effectiveTimezone, getPreviewInfo, isTimeSelected, notificationTime]);

  const timePickerLocalPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, pickerDraftTime.getHours(), pickerDraftTime.getMinutes());
  }, [effectiveTimezone, getPreviewInfo, pickerDraftTime]);

  const datePickerPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    const previewHour = isTimeSelected ? notificationTime.getHours() : pickerDraftTime.getHours();
    const previewMinute = isTimeSelected ? notificationTime.getMinutes() : pickerDraftTime.getMinutes();

    return getPreviewInfo(effectiveTimezone, previewHour, previewMinute, pickerDraftDate);
  }, [effectiveTimezone, getPreviewInfo, isTimeSelected, notificationTime, pickerDraftTime, pickerDraftDate]);
  const datePickerWeekdayLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
    }).format(pickerDraftDate);
  }, [locale, pickerDraftDate]);

  const openTimePicker = () => {
    dismissTextInputKeyboard();
    const nextPickerTime = new Date(notificationTime);

    if (!isTimeSelected) {
      nextPickerTime.setHours(12, 0, 0, 0);
    }

    setPickerDraftTime(nextPickerTime);
    setActivePicker(NotificationPickerKind.Time);
  };

  const openCityPicker = () => {
    dismissTextInputKeyboard();
    setPickerDraftCityId(selectedCityId ?? null);
    setActivePicker(NotificationPickerKind.City);
  };

  const openDatePicker = () => {
    dismissTextInputKeyboard();
    setPickerDraftDate(new Date(notificationDate));
    setActivePicker(NotificationPickerKind.Date);
  };
  const openRepeatPicker = () => {
    dismissTextInputKeyboard();
    setPickerDraftRepeat(repeat);
    setPickerDraftWeekdays(weekdays);
    setActivePicker(NotificationPickerKind.Repeat);
  };
  const openCalendarPicker = async (
    pickerKind: NotificationPickerKind.Calendar | NotificationPickerKind.CalendarRequired = NotificationPickerKind.Calendar
  ) => {
    dismissTextInputKeyboard();
    if (isLoadingCalendarOptions) {
      return;
    }

    setIsLoadingCalendarOptions(true);

    try {
      const result = await getCalendarOptions();

      setIsCalendarSelectionAvailable(result.available);

      if (!result.available) {
        return;
      }

      setCalendarOptions(result.options);
      setPickerDraftCalendarId(selectedCalendarId);
      setActivePicker(pickerKind);
    } finally {
      setIsLoadingCalendarOptions(false);
    }
  };
  const openWeekdaysPicker = () => {
    dismissTextInputKeyboard();
    setPickerDraftWeekdays(weekdays);
    setActivePicker(NotificationPickerKind.Weekdays);
  };

  const closePicker = () => {
    dismissTextInputKeyboard();
    setActivePicker(null);
  };

  const handleClosePicker = () => {
    if (activePicker === NotificationPickerKind.Weekdays) {
      setActivePicker(NotificationPickerKind.Repeat);

      return;
    }

    closePicker();
  };

  const clearRepeat = () => {
    dismissTextInputKeyboard();
    setRepeat(RepeatMode.none);
    setWeekdays([]);
    setPickerDraftRepeat(RepeatMode.none);
    setPickerDraftWeekdays([]);
  };

  const applyPicker = () => {
    if (activePicker === NotificationPickerKind.Time) {
      setNotificationTime(pickerDraftTime);
      setIsTimeSelected(true);
    }

    if (activePicker === NotificationPickerKind.Date) {
      setNotificationDate(pickerDraftDate);
      setHasDate(true);
    }

    if (activePicker === NotificationPickerKind.Repeat) {
      setRepeat(pickerDraftRepeat);
      setWeekdays([]);
    }

    if (activePicker === NotificationPickerKind.Weekdays) {
      setRepeat(RepeatMode.weekly);
      setWeekdays(pickerDraftWeekdays);
    }

    if (activePicker === NotificationPickerKind.City && onSelectCityId && pickerDraftCityId !== null) {
      onSelectCityId(pickerDraftCityId);
    }

    if (activePicker === NotificationPickerKind.Calendar || activePicker === NotificationPickerKind.CalendarRequired) {
      const nextCalendar = calendarOptions.find((calendar) => calendar.id === pickerDraftCalendarId) || null;
      setSelectedCalendarId(pickerDraftCalendarId);
      setSelectedCalendarTitle(nextCalendar?.label);
    }

    closePicker();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backgroundImage, { opacity }]}>
        <ImageBackground
          source={theme.image.modalBackgroundSource}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View
              style={[
                styles.modalContent,
                {
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom,
                },
              ]}
            >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onScrollBeginDrag={dismissTextInputKeyboard}
              showsVerticalScrollIndicator
            >
              <View style={styles.header}>
                <Pressable
                  onPress={() => {
                    dismissTextInputKeyboard();
                    onClose();
                  }}
                  style={styles.headerButton}
                >
                  <IconCancelOutlined fill={theme.text.primary} />
                </Pressable>

                <View>
                  <Text style={styles.title}>{modalTitle}</Text>
                </View>

                <Pressable style={[styles.headerButton, !canSave && styles.headerButtonDisabled]} onPress={handleSave} disabled={isSaving || !canSave}>
                  <IconConfirmOutlined fill={theme.text.primary} />
                </Pressable>
              </View>

              <View style={styles.content}>
                {canSelectCity && (
                  <Pressable style={[styles.actionButton, styles.citySelect]} onPress={openCityPicker}>
                    {selectedCityOption?.label ? (
                      <Text style={[styles.actionButtonText, styles.citySelectText]}>{selectedCityOption?.label}</Text>
                    ) : (
                      <Text style={[styles.actionButtonHintText, styles.actionButtonHintTextCity]}>{t('reminder.cityPlaceholder')}</Text>
                    )}
                    <IconArrow style={styles.citySelectIcon} fill={theme.text.primary} />
                  </Pressable>
                )}

                {!canSelectCity && citySelectionMode === 'locked' && !!cityName && (
                  <View style={styles.cityTitle}>
                    <Text style={styles.cityTitleText}>{cityName}</Text>
                  </View>
                )}

                <TextInput
                  style={styles.labelInput}
                  placeholder={t('reminder.labelPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationLabel}
                  onChangeText={setNotificationLabel}
                  multiline
                />

                <TextInput
                  style={styles.notesInput}
                  placeholder={t('reminder.notesPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationNotes}
                  onChangeText={setNotificationNotes}
                  multiline
                />

                <TextInput
                  style={styles.urlInput}
                  placeholder={t('reminder.urlPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationUrl}
                  onChangeText={setNotificationUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Pressable
                  style={[styles.actionButton, activePicker === NotificationPickerKind.Time && styles.actionButtonActive]}
                  onPress={openTimePicker}
                >
                  {isTimeSelected ? (
                    <>
                      <View style={styles.actionButtonHint}>
                        <IconClock style={styles.actionButtonHintIcon} fill={theme.text.primary} />
                        <Text style={styles.actionButtonText}>{selectedTimeLabel}</Text>
                      </View>
                      {effectiveTimezone && (
                        <View style={styles.localTimeBox}>
                          <Text style={styles.localTimeLabel}>{t('common.yourTime')}</Text>
                          <Text style={styles.localTime}>{localPreviewInfo.localTimeText}</Text>
                          {!!localPreviewInfo.dayShiftText && (
                            <Text style={styles.localTimeDayShift}>{localPreviewInfo.dayShiftText}</Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconClock style={styles.actionButtonHintIcon} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{t('reminder.timePlaceholder')}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    activePicker === NotificationPickerKind.Date && styles.actionButtonActive,
                  ]}
                  onPress={openDatePicker}
                >
                  {hasDate ? (
                    <>
                      <View style={styles.actionButtonHint}>
                        <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill={theme.text.primary} />
                        <Text style={styles.actionButtonText}>{selectedDateLabel}</Text>

                        <Pressable style={styles.clearDateButton} onPress={() => setHasDate(false)}>
                          <IconDelete fill={theme.text.warning} />
                        </Pressable>
                      </View>

                      {!!localPreviewInfo.localDateText && (
                        <View style={styles.localDateBox}>
                          <Text style={styles.localDateLabel}>{t('common.yourDate')}</Text>
                          <Text style={styles.localDate}>{localPreviewInfo.localDateText}</Text>
                          {!!localPreviewInfo.monthOrYearShiftText && (
                            <Text
                              style={[
                                styles.localDateShift,
                                (localPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.nextYear ||
                                  localPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.previousYear) &&
                                  styles.localDateShiftYear,
                              ]}
                            >
                              {localPreviewInfo.monthOrYearShiftText}
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{datePlaceholderLabel}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={styles.singleActionButton} onPress={openRepeatPicker}>
                  {repeatLabel ? (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonText}>{repeatLabel}</Text>
                      <Pressable style={styles.clearDateButton} onPress={clearRepeat}>
                        <IconDelete fill={theme.text.warning} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{REPEAT_LABELS.chooseRepeat}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.singleActionButton, isLoadingCalendarOptions && styles.actionButtonDisabled]}
                  onPress={() => {
                    void openCalendarPicker();
                  }}
                  disabled={isLoadingCalendarOptions}
                >
                  <View style={[styles.actionButtonHint, styles.actionButtonHintFullWidth]}>
                    <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill={theme.text.primary} />
                    <Text
                      style={[
                        calendarLabel ? styles.actionButtonText : styles.actionButtonHintText,
                        styles.actionButtonValueText,
                      ]}
                    >
                      {calendarLabel || t('reminder.calendarPlaceholder')}
                    </Text>
                    {!!calendarLabel && (
                      <Pressable
                        style={styles.clearCalendarButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          setPickerDraftCalendarId(null);
                          setSelectedCalendarId(null);
                          setSelectedCalendarTitle(undefined);
                        }}
                      >
                        <IconDelete fill={theme.text.warning} />
                      </Pressable>
                    )}
                  </View>
                </Pressable>

                {!isCalendarSelectionAvailable && (
                  <Text style={styles.inlineHelperText}>{calendarUnavailableLabel}</Text>
                )}

                {requiresCalendarForRecurringStartDate && !selectedCalendarId && isCalendarSelectionAvailable && (
                  <Text style={styles.inlineHelperText}>{calendarRequiredHint}</Text>
                )}
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
      </Animated.View>

      <NotificationPickerModal
        visible={isPickerModalVisible}
        title={pickerTitle}
        onClose={handleClosePicker}
        onApply={applyPicker}
        showApply={
          activePicker !== NotificationPickerKind.City &&
          activePicker !== NotificationPickerKind.Calendar &&
          activePicker !== NotificationPickerKind.CalendarRequired
        }
        closeActionType={activePicker === NotificationPickerKind.Weekdays ? 'back' : null}
        closeByOverlayTap={
          activePicker !== NotificationPickerKind.City &&
          activePicker !== NotificationPickerKind.Calendar &&
          activePicker !== NotificationPickerKind.CalendarRequired
        }
        customWindowStyle={(isCityPicker || isCalendarPicker) && {
          alignSelf: 'stretch',
        }}
      >
        {isCityPicker && cityOptions && (
          <ScrollView
            style={styles.calendarPickerScroll}
            contentContainerStyle={styles.calendarPickerScrollContainer}
          >
            <View style={styles.calendarPicker}>
              {cityOptions.map((city, idx) => {
                const selected = pickerDraftCityId === city.id;

                return (
                  <Pressable
                    key={`city-picker-${city.id}`}
                    style={[
                      styles.cityPickerItem,
                      selected && styles.cityPickerItemActive,
                      (1 + idx) === cityOptions.length  && styles.cityPickerItemLast
                    ]}
                    onPress={() => {
                      setPickerDraftCityId(city.id);
                      if (onSelectCityId) {
                        onSelectCityId(city.id);
                      }
                      closePicker();
                    }}
                  >
                    <Text style={styles.cityPickerItemText}>{city.label}</Text>
                    {!!city.hint && <Text style={styles.cityPickerItemHint}>{city.hint}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {isCalendarPicker && (
          <>
            {isCalendarRequiredPicker && (
              <View style={styles.calendarPicker}>
                <Text style={styles.calendarRequiredDescription}>
                  {calendarRequiredDescription}
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.calendarPickerScroll}
              contentContainerStyle={styles.calendarPickerScrollContainer}
            >
              <View style={styles.calendarPicker}>
                {calendarOptions.map((calendar, idx) => {
                  const selected = pickerDraftCalendarId === calendar.id;

                  return (
                    <Pressable
                      key={`calendar-picker-${calendar.id}`}
                      style={[
                        styles.cityPickerItem,
                        selected && styles.cityPickerItemActive,
                        (1 + idx) === calendarOptions.length && styles.cityPickerItemLast,
                      ]}
                      onPress={() => {
                        setPickerDraftCalendarId(calendar.id);
                        setSelectedCalendarId(calendar.id);
                        setSelectedCalendarTitle(calendar.label);
                        closePicker();
                      }}
                    >
                      <Text style={styles.cityPickerItemText}>{calendar.label}</Text>
                      {!!calendar.hint && <Text style={styles.cityPickerItemHint}>{calendar.hint}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {activePicker === NotificationPickerKind.Time && (
          <>
            <DateTimePicker
              value={pickerDraftTime}
              mode="time"
              is24Hour={timeFormat === '24h'}
              display="spinner"
              onChange={handleTimeChange}
              style={styles.timePicker}
              textColor={theme.text.primary}
            />
            {!!timePickerLocalPreviewInfo.timeText && (
              <View style={styles.timePickerLocalTimeBox}>
                <Text style={styles.timePickerLocalTimeLabel}>{t('common.yourTime')}</Text>
                <Text style={styles.timePickerLocalTime}>
                  {timePickerLocalPreviewInfo.timeText}
                </Text>

                {!!timePickerLocalPreviewInfo.dayShiftText && (
                  <Text style={styles.timePickerDayShiftText}>{timePickerLocalPreviewInfo.dayShiftText}</Text>
                )}
              </View>
            )}
          </>
        )}

        {activePicker === NotificationPickerKind.Date && (
          <View style={styles.datePickerBox}>
            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              style={styles.datePicker}
              textColor={theme.text.primary}
            />
            <View style={styles.timePickerLocalTimeBox}>
              <Text style={styles.timePickerWeekdayText}>{datePickerWeekdayLabel}</Text>
            </View>
            {!!datePickerPreviewInfo.localDateText && (
              <View style={styles.timePickerLocalTimeBox}>
                <Text style={styles.timePickerLocalTimeLabel}>{t('common.yourDate')}</Text>
                <Text style={styles.timePickerLocalTime}>
                  {datePickerPreviewInfo.localDateText}
                </Text>

                {!!datePickerPreviewInfo.monthOrYearShiftText && (
                  <Text
                    style={[
                      styles.localDateShift,
                      (datePickerPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.nextYear ||
                        datePickerPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.previousYear) &&
                      styles.localDateShiftYear,
                    ]}
                  >
                    {datePickerPreviewInfo.monthOrYearShiftText}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {activePicker === NotificationPickerKind.Repeat && (
          <View style={styles.repeatPickerList}>
            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === RepeatMode.none && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat(RepeatMode.none);
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === RepeatMode.none && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.todayOnly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === RepeatMode.daily && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat(RepeatMode.daily);
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === RepeatMode.daily && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.daily}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === RepeatMode.weekly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat(RepeatMode.weekly);
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === RepeatMode.weekly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.weekly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === RepeatMode.monthly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat(RepeatMode.monthly);
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === RepeatMode.monthly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.monthly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === RepeatMode.yearly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat(RepeatMode.yearly);
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === RepeatMode.yearly && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.yearly}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.repeatPickerSecondary,
                pickerDraftWeekdays.length > 0 && styles.repeatPickerItemActive
              ]}
              onPress={openWeekdaysPicker}
            >
              <Text style={[styles.repeatPickerItemText, pickerDraftWeekdays.length > 0 && styles.repeatPickerItemTextActive]}>{REPEAT_LABELS.chooseSpecificWeekdays}</Text>
            </Pressable>
          </View>
        )}

        {activePicker === NotificationPickerKind.Weekdays && (
          <View style={styles.repeatPickerList}>
            <View style={styles.weekdaysWrap}>
              {[
                ...weekdayOrder.map((value) => ({
                  label: REPEAT_LABELS.weekdays[value as keyof typeof REPEAT_LABELS.weekdays],
                  value,
                })),
              ].map((day, idx) => {
                const selected = pickerDraftWeekdays.includes(day.value);
                return (
                  <Pressable
                    key={`weekday-${day.value}`}
                    style={[
                      styles.weekdayChip,
                      selected && styles.weekdayChipActive,
                      idx === 6 && styles.weekdayChipLast
                    ]}
                    onPress={() => {
                      setPickerDraftWeekdays((prev) =>
                        prev.includes(day.value)
                          ? prev.filter((d) => d !== day.value)
                          : [...prev, day.value]
                      );
                    }}
                  >
                    <Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextActive]}>{day.label}</Text>
                    {selected && (
                      <IconCheckmark fill={theme.text.primary} style={styles.weekdayChipIcon} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </NotificationPickerModal>

      {Platform.OS === 'android' && activePicker === NotificationPickerKind.Time && (
        <DateTimePicker
          value={pickerDraftTime}
          mode="time"
          is24Hour={timeFormat === '24h'}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === 'android' && activePicker === NotificationPickerKind.Date && (
        <DateTimePicker
          value={pickerDraftDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.overlay.medium,
  },
  modalContent: {
    minHeight: '100%',
    maxHeight: '100%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  header: {
    paddingHorizontal: 23,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.text.primary,
    fontSize: theme.typography.titleSm.fontSize,
  },
  headerButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: theme.spacing.screenX,
  },
  cityTitle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
  },
  cityTitleText: {
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  labelInput: {
    fontSize: theme.typography.control.fontSize,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderBottomColor: theme.border.subtle,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  notesInput: {
    fontSize: 15,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderBottomColor: theme.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  urlInput: {
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderTopWidth: 0,
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
  },
  actionButtonActive: {
    borderColor: theme.border.success,
    backgroundColor: theme.surface.successSoft,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextCity: {
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
  },
  actionButtonText: {
    fontSize: 15,
    color: theme.text.primary,
  },
  actionButtonHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButtonHintFullWidth: {
    width: '100%',
  },
  actionButtonHintText: {
    fontSize: 15,
    color: theme.text.placeholder,
  },
  actionButtonValueText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  actionButtonHintTextCity: {
    fontSize: theme.typography.control.fontSize,
  },
  citySelect: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  citySelectText: {
    flex: 1,
    paddingRight: 10,
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
  },
  citySelectIcon: {
    transform: [{ rotate: '90deg' }],
    width: 7,
    height: 12,
    marginLeft: 'auto',
    marginRight: 5,
  },
  actionButtonHintIcon: {
    marginRight: 9,
  },
  actionButtonHintIconCalendar: {
    marginLeft: 1,
    marginRight: 9,
  },
  actionButtonHintIconRepeat: {
    marginLeft: 1,
    marginRight: 8,
  },
  singleActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.control.fontSize,
    fontWeight: '600',
  },
  inlineHelperText: {
    marginTop: -6,
    marginBottom: theme.spacing.lg,
    color: theme.text.warning,
    fontSize: 13,
  },
  calendarRequiredDescription: {
    marginBottom: theme.spacing.md,
    color: theme.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {},
  localTimeBox: {
    borderTopWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  localTimeLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  localTime: {
    fontSize: 14,
    color: theme.text.primary,
  },
  notificationDate: {},
  localDateBox: {
    borderTopWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  localDateLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  localDate: {
    fontSize: 14,
    color: theme.text.primary,
  },
  localDateShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    minHeight: 14,
    borderRadius: 65536,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  localDateShiftYear: {
    backgroundColor: theme.text.warning,
  },
  localTimeDayShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    minHeight: 14,
    borderRadius: 65536,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  repeatPickerList: {
    gap: theme.spacing.xxs,
    width: 295,
    paddingHorizontal: theme.spacing.screenX,
    paddingBottom: theme.spacing.screenX,
  },
  repeatPickerItem: {
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
  },
  repeatPickerItemActive: {
    backgroundColor: theme.surface.fieldSelected,
  },
  repeatPickerItemText: {
    color: theme.text.primary,
    fontSize: 15,
  },
  repeatPickerItemTextActive: {
    fontWeight: 'bold',
  },
  repeatPickerSecondary: {
    borderTopLeftRadius: theme.radius.sm,
    borderTopRightRadius: theme.radius.sm,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
  },
  weekdaysWrap: {},
  weekdayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: theme.border.muted,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekdayChipLast: {
    borderBottomWidth: 0,
  },
  weekdayChipActive: {},
  weekdayChipText: {
    color: theme.text.primary,
    fontSize: 15,
  },
  weekdayChipTextActive: {
    fontWeight: 'bold',
  },
  weekdayChipIcon: {
    width: 10,
    height: 10,
    marginLeft: 'auto',
    marginRight: 5,
  },
  dayShiftText: {
    fontSize: 11,
    paddingHorizontal: 7,
    minHeight: 14,
    borderRadius: 65536,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  clearDateButton: {
    width: 20,
    height: 20,
    marginLeft: 'auto',
    marginRight: 1,
    marginBlock: -1,
  },
  clearCalendarButton: {
    width: 20,
    height: 20,
    marginRight: 1,
    marginBlock: -1,
    flexShrink: 0,
  },
  timePicker: {
    height: 140,
  },
  timePickerLocalTimeBox: {
    paddingHorizontal: theme.spacing.screenX,
    paddingVertical: theme.spacing.screenX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  timePickerLocalTimeLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  timePickerWeekdayText: {
    fontSize: 15,
    color: theme.text.primary,
    textTransform: 'capitalize',
  },
  timePickerLocalTime: {
    fontSize: 14,
    color: theme.text.primary,
  },
  timePickerDayShiftText: {
    fontSize: 11,
    paddingHorizontal: 9,
    height: 18,
    borderRadius: theme.radius.pillMd,
    lineHeight: 17,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 'auto',
  },
  calendarPickerScroll: {
    width: '100%',
    flexShrink: 1,
  },
  calendarPickerScrollContainer: {
    paddingBottom: 20,
  },
  calendarPicker: {
    width: '100%',
    paddingHorizontal: 20,
  },
  datePickerBox: {},
  datePicker: {
    height: 140,
  },
  label: {
    color: theme.text.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  cityPickerList: {
    padding: theme.spacing.screenX,
    gap: 6,
  },
  cityPickerItem: {
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
    marginBottom: 6,
  },
  cityPickerItemActive: {
    backgroundColor: theme.surface.fieldSelected,
  },
  cityPickerItemLast: {
    marginBottom: 0,
  },
  cityPickerItemText: {
    color: theme.text.primary,
    fontSize: theme.typography.control.fontSize,
    fontWeight: '600',
  },
  cityPickerItemHint: {
    color: theme.text.placeholder,
    fontSize: 12,
  },
  });
}
