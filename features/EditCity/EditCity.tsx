import { useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSelectedCities, CityNotification } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat, FirstDayOfWeek } from '@/contexts/settings-context';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';
import { DeleteNotificationModal } from '@/components/delete-notification-modal';
import { getCountryName } from '@/constants/country-names';
import { TIME_REFRESH_INTERVAL_MS } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { RepeatMode, getEffectiveRepeatMode } from '@/types/notifications';
import { getCityBaseName, getCityDisplayName } from '@/utils/city-display';
import {
  getTimezoneDifferenceLabel,
  getUtcOffsetLabel as getUtcOffsetLabelForTimezone,
} from '@/utils/timezone-offset';
import { getDatePartsInTimezone, getRelativeDayLabelForTimezone } from '@/utils/timezone-relative-day';
import { formatInTimezone, getDateTimePartsInTimezone } from '@/utils/abstract-timezone';

import ClockIcon from '../../assets/images/icon--clock-2--outlined.svg';
import CalendarIcon from '../../assets/images/icon--calendar-2--outlined.svg';
import EditIcon from '../../assets/images/icon--edit-2.svg';
import DeleteIcon from '../../assets/images/icon--delete-3.svg';
import RepeatIcon from '../../assets/images/icon--repeat-1.svg';
import IconAddNotification from '@/assets/images/icon--notification-3--outlined.svg';
import IconDelete from '@/assets/images/icon--x-2--outlined.svg';

import { createStyles } from './styles';

const NOTIFICATION_SWITCH_THUMB_TRAVEL = 16;

function NotificationToggleSwitch({
                                    enabled,
                                    onPress,
                                    theme,
                                  }: {
  enabled: boolean;
  onPress: () => void;
  theme: UiTheme;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const thumbTranslateX = useState(() => new Animated.Value(enabled ? NOTIFICATION_SWITCH_THUMB_TRAVEL : 0))[0];

  useEffect(() => {
    Animated.timing(thumbTranslateX, {
      toValue: enabled ? NOTIFICATION_SWITCH_THUMB_TRAVEL : 0,
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [enabled, thumbTranslateX]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.toggleNotificationSwitch}
    >
      <Animated.View
        style={[
          styles.toggleNotificationSwitchThumb,
          { transform: [{ translateX: thumbTranslateX }] },
        ]}
      />
    </Pressable>
  );
}

function getNotificationRepeatLabel(
  notification: CityNotification,
  firstDayOfWeek: FirstDayOfWeek,
  weekdayShortLabels: Record<number, string>,
  t: (key: string) => string
) {
  const repeat = getEffectiveRepeatMode(notification);

  if (repeat === RepeatMode.weekly) {
    const order = firstDayOfWeek === 'sunday'
      ? [0, 1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6, 0];
    const sortOrder = new Map(order.map((value, index) => [value, index]));
    const days = (notification.weekdays || [])
      .slice()
      .sort((a, b) => (sortOrder.get(a) ?? 0) - (sortOrder.get(b) ?? 0))
      .map((day) => weekdayShortLabels[day]);

    return days.length > 0 ? `${days.join(', ')}` : t('common.weekly');
  }

  if (repeat === RepeatMode.daily) {
    return t('common.daily');
  }

  if (repeat === RepeatMode.monthly) {
    return t('common.monthly');
  }

  if (repeat === RepeatMode.yearly) {
    return t('common.yearly');
  }

  return null;
}

function getNotificationDateLabel(notification: CityNotification, locale: string) {
  const repeat = getEffectiveRepeatMode(notification);

  if (notification.day && notification.month && notification.year) {
    const scheduledDate = new Date(notification.year, notification.month - 1, notification.day);
    const currentYear = new Date().getFullYear();
    const includeYear = notification.year !== currentYear;

    const parts = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).formatToParts(scheduledDate);

    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';

    const baseLabel = `${getPart('weekday')} ${getPart('day')} ${getPart('month')}`;

    if (includeYear) {
      return `${baseLabel}, ${getPart('year')}`;
    }

    return baseLabel;
  }

  if (repeat === RepeatMode.none) {
    return null;
  }

  return null;
}

function formatScheduledTime(hour: number, minute: number, timeFormat: TimeFormat, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(2027, 0, 1, hour, minute));
}

function getInactiveReasonLabel(notification: CityNotification, t: (key: string) => string) {
  if (notification.inactiveReason === 'permission') {
    return t('notification.inactive.permission');
  }

  if (notification.inactiveReason === 'past') {
    return t('notification.inactive.past');
  }

  return null;
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
  const cityNowDate = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const cityTargetDate = new Date(year, month - 1, day, hour, minute, 0);
  const diffMs = cityTargetDate.getTime() - cityNowDate.getTime();

  return new Date(now.getTime() + diffMs);
}

function formatDateLabel(date: Date, locale: string) {
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
}

function getNotificationTriggerDate(cityTz: string, notification: CityNotification) {
  const now = new Date();

  let cityYear: number;
  let cityMonth: number;
  let cityDay: number;
  let triggerDate: Date;

  if (notification.year && notification.month && notification.day && !notification.isDaily) {
    cityYear = notification.year;
    cityMonth = notification.month;
    cityDay = notification.day;
    triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);
  } else {
    const cityNow = getDatePartsInTimezone(now, cityTz);
    cityYear = cityNow.year;
    cityMonth = cityNow.month;
    cityDay = cityNow.day;
    triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);

    if (triggerDate.getTime() <= now.getTime()) {
      const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
      cityYear = next.getFullYear();
      cityMonth = next.getMonth() + 1;
      cityDay = next.getDate();
      triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);
    }
  }

  return triggerDate;
}

function getNotificationCityTriggerDateParts(cityTz: string, notification: CityNotification) {
  const now = new Date();
  let cityYear: number;
  let cityMonth: number;
  let cityDay: number;

  if (notification.year && notification.month && notification.day && !notification.isDaily) {
    cityYear = notification.year;
    cityMonth = notification.month;
    cityDay = notification.day;
  } else {
    const cityNow = getDatePartsInTimezone(now, cityTz);
    cityYear = cityNow.year;
    cityMonth = cityNow.month;
    cityDay = cityNow.day;

    const sameDayTrigger = getTriggerDateForTimezone(
      cityTz,
      cityYear,
      cityMonth,
      cityDay,
      notification.hour,
      notification.minute
    );

    if (sameDayTrigger.getTime() <= now.getTime()) {
      const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
      cityYear = next.getFullYear();
      cityMonth = next.getMonth() + 1;
      cityDay = next.getDate();
    }
  }

  return {
    year: cityYear,
    month: cityMonth,
    day: cityDay,
  };
}

function getNotificationLocalDayShiftLabel(cityTz: string, notification: CityNotification, t: (key: string) => string) {
  const cityTriggerDateParts = getNotificationCityTriggerDateParts(cityTz, notification);
  const triggerDate = getNotificationTriggerDate(cityTz, notification);
  const localStamp = Date.UTC(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
  const cityStamp = Date.UTC(
    cityTriggerDateParts.year,
    cityTriggerDateParts.month - 1,
    cityTriggerDateParts.day
  );
  const dayDiff = Math.round((localStamp - cityStamp) / 86400000);

  if (dayDiff > 0) {
    return t('common.nextDay');
  }

  if (dayDiff < 0) {
    return t('common.previousDay');
  }

  return null;
}

function getNotificationLocalMonthOrYearShiftLabel(cityTz: string, notification: CityNotification, t: (key: string) => string) {
  const cityTriggerDateParts = getNotificationCityTriggerDateParts(cityTz, notification);
  const triggerDate = getNotificationTriggerDate(cityTz, notification);
  const localYear = triggerDate.getFullYear();
  const localMonth = triggerDate.getMonth() + 1;

  if (localYear > cityTriggerDateParts.year) {
    return t('common.nextYear');
  }

  if (localYear < cityTriggerDateParts.year) {
    return t('common.previousYear');
  }

  if (localMonth > cityTriggerDateParts.month) {
    return t('common.nextMonth');
  }

  if (localMonth < cityTriggerDateParts.month) {
    return t('common.previousMonth');
  }

  return null;
}

function getNotificationLocalTime(
  cityTz: string,
  notification: CityNotification,
  timeFormat: TimeFormat
) {
  const triggerDate = getNotificationTriggerDate(cityTz, notification);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(triggerDate);
}

function getNotificationLocalDate(cityTz: string, notification: CityNotification, locale: string) {
  return formatDateLabel(getNotificationTriggerDate(cityTz, notification), locale);
}

function getCurrentTimeInTimezone(timezone: string, timeFormat: TimeFormat, locale: string) {
  return formatInTimezone(new Date(), timezone, locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

function getTimezoneOffsetLabel(timezone: string) {
  return getTimezoneDifferenceLabel(timezone, '+0h');
}

function getUtcOffsetLabel(timezone: string) {
  return `UTC${getUtcOffsetLabelForTimezone(timezone)}`;
}

export default function EditCity() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { t, locale, weekdayShortLabels } = useI18n();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { selectedCities, updateCityName, addNotification, updateNotification, removeNotification, toggleNotification } = useSelectedCities();
  const { timeFormat, firstDayOfWeek } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [, setClockTick] = useState(0);

  const city = selectedCities.find(c => c.id === Number(cityId));
  const localizedCityNames = useLocalizedCityNames(city ? [city.cityId] : []);

  const [editName, setEditName] = useState(city?.customName || '');
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] = useState<CityNotification | null>(null);
  const [notificationPendingDelete, setNotificationPendingDelete] = useState<CityNotification | null>(null);

  useEffect(() => {
    if (city) {
      setEditName(city.customName || '');
    }
  }, [city]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setClockTick((value) => value + 1);

    const interval = setInterval(() => {
      setClockTick((value) => value + 1);
    }, TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isFocused]);

  if (!city) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.errorText}>{t('editCity.notFound')}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleNameChange = (text: string) => {
    setEditName(text);
    updateCityName(city.id, text);
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (editingNotification) {
      return await updateNotification(
        city.id,
        editingNotification.id,
        values.hour,
        values.minute,
        values.year,
        values.month,
        values.day,
        values.label,
        values.notes,
        values.url,
        values.repeat,
        values.weekdays
      );
    }

    return await addNotification(
      city.id,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );
  };

  const handleOpenEditNotificationModal = (notification: CityNotification) => {
    setEditingNotification(notification);
    setIsNotificationModalVisible(true);
  };

  const handleOpenAddNotificationModal = () => {
    setEditingNotification(null);
    setIsNotificationModalVisible(true);
  };

  const handleOpenDeleteNotificationModal = (notification: CityNotification) => {
    setNotificationPendingDelete(notification);
  };

  const handleCloseDeleteNotificationModal = () => {
    setNotificationPendingDelete(null);
  };

  const handleConfirmDeleteNotification = async () => {
    if (!notificationPendingDelete) {
      return;
    }

    await removeNotification(city.id, notificationPendingDelete.id);
    setNotificationPendingDelete(null);
  };

  const handleToggleNotification = async (notificationId: string, enabled: boolean) => {
    await toggleNotification(city.id, notificationId, !enabled);
  };

  const relativeDayLabel = getRelativeDayLabelForTimezone(city.tz, t);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.editCityHeader}>
          <Text style={styles.cityName}>{getCityBaseName(city, localizedCityNames[city.cityId])}</Text>
          {!city.isAbstractTimezone && !!city.country && (
            <Text style={styles.cityCountry}>{getCountryName(city.country, locale)}</Text>
          )}
          <View style={styles.cityTimeInfo}>
            <Text style={styles.cityTimezone}>{getCurrentTimeInTimezone(city.tz, timeFormat, locale)}</Text>
            <Text style={styles.cityTimezone}>{getUtcOffsetLabel(city.tz)}</Text>
            <Text style={styles.cityTimezone}>{getTimezoneOffsetLabel(city.tz)}</Text>
            {!!relativeDayLabel && (
              <Text style={styles.cityRelativeDayLabel}>{relativeDayLabel}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('editCity.customNamePlaceholder')}
              placeholderTextColor={theme.text.placeholder}
              value={editName}
              onChangeText={handleNameChange}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {editName.length > 0 && (
              <Pressable style={styles.clearButton} onPress={() => handleNameChange('')}>
                <IconDelete fill={theme.text.warning} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.notificationsSection}>
          {city.notifications && city.notifications.length > 0 && (
            <View style={styles.notificationsList}>
              {city.notifications.map((notification, idx) => {
                const notificationDateLabel = getNotificationDateLabel(notification, locale);
                const notificationRepeatLabel = getNotificationRepeatLabel(notification, firstDayOfWeek, weekdayShortLabels, t);
                const notificationLocalDayShiftLabel = getNotificationLocalDayShiftLabel(city.tz, notification, t);
                const notificationLocalMonthOrYearShiftLabel = getNotificationLocalMonthOrYearShiftLabel(city.tz, notification, t);
                const notificationInactiveReasonLabel = getInactiveReasonLabel(notification, t);

                return (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      (1 + idx) % 2 === 0 && styles.notificationItemEven,
                      !notification.enabled && styles.notificationItemDisabled
                    ]}
                  >
                    <View style={styles.notificationDetails}>
                      {!!notification.label && notification.label.length > 0 ? (
                        <Text style={styles.notificationLabel}>{notification.label}</Text>
                      ) : (
                        <Text style={styles.notificationLabelEmpty}>{t('common.notification')}</Text>
                      )}
                      {!!notification.notes && (
                        <Text style={styles.notificationNotes}>{notification.notes}</Text>
                      )}
                      {!!notification.url && (
                        <Text style={styles.notificationUrl}>{notification.url}</Text>
                      )}
                      {!!notificationInactiveReasonLabel && (
                        <Text style={styles.notificationInactiveReason}>{notificationInactiveReasonLabel}</Text>
                      )}
                    </View>

                    <View style={styles.notificationDateTime}>
                      <View style={styles.notificationTime}>
                        <View style={styles.notificationCityTime}>
                          <ClockIcon
                            style={styles.notificationCityTimeIcon}
                            fill={theme.text.primary}
                          />
                          <Text style={styles.notificationCityTimeText}>
                            {formatScheduledTime(notification.hour, notification.minute, timeFormat, locale)}
                          </Text>
                        </View>

                        <View style={styles.notificationLocalTime}>
                          <Text style={styles.notificationLocalTimeLabel}>
                            {t('common.yourTime')}
                          </Text>
                          <Text style={styles.notificationLocalTimeText}>
                            {getNotificationLocalTime(city.tz, notification, timeFormat)}
                          </Text>
                          {!!notificationLocalDayShiftLabel && (
                            <Text style={styles.notificationLocalDayShiftText}>
                              {notificationLocalDayShiftLabel}
                            </Text>
                          )}
                        </View>
                      </View>

                      {notificationDateLabel && (
                        <View style={styles.notificationDate}>
                          <View style={styles.notificationCityDate}>
                            <CalendarIcon
                              style={styles.notificationCityDateIcon}
                              fill={theme.text.primary}
                            />
                            <Text style={styles.notificationCityDateText}>
                              {notificationDateLabel}
                            </Text>
                          </View>

                          <View style={styles.notificationLocalDate}>
                            <Text style={styles.notificationLocalDateLabel}>
                              {t('common.yourDate')}
                            </Text>

                            <Text style={styles.notificationLocalDateText}>
                              {getNotificationLocalDate(city.tz, notification, locale)}
                            </Text>

                            {!!notificationLocalMonthOrYearShiftLabel && (
                              <Text style={[
                                styles.notificationLocalDateShiftText,
                                (notificationLocalMonthOrYearShiftLabel === t('common.nextYear') || notificationLocalMonthOrYearShiftLabel === t('common.previousYear')) && styles.notificationLocalDateShiftTextYear
                              ]}>
                                {notificationLocalMonthOrYearShiftLabel}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {!!notificationRepeatLabel && (
                        <View style={styles.notificationRepeat}>
                          <RepeatIcon
                            style={styles.notificationRepeatIcon}
                            fill={theme.text.primary}
                          />
                          <Text style={styles.notificationRepeatText}>{notificationRepeatLabel}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.notificationActions}>
                      <Pressable
                        onPress={() => handleOpenEditNotificationModal(notification)}
                        style={styles.editNotificationButton}
                      >
                        <EditIcon
                          style={styles.editNotificationIcon}
                          fill={theme.text.primary}
                        />
                      </Pressable>

                      <NotificationToggleSwitch
                        enabled={notification.enabled}
                        onPress={() => handleToggleNotification(notification.id, notification.enabled)}
                        theme={theme}
                      />

                      <Pressable
                        onPress={() => handleOpenDeleteNotificationModal(notification)}
                        style={styles.deleteNotificationButton}
                      >
                        <DeleteIcon
                          style={styles.deleteNotificationIcon}
                          fill={theme.text.warning}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable onPress={handleOpenAddNotificationModal} style={styles.addNotificationButton}>
            <Text style={styles.addNotificationButtonText}>{t('common.addNotification')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <NotificationModal
        visible={isNotificationModalVisible}
        cityName={getCityDisplayName(city, localizedCityNames[city.cityId])}
        cityTimezone={city.tz}
        mode={editingNotification ? 'edit' : 'add'}
        citySelectionMode="locked"
        initialNotification={editingNotification}
        onClose={() => {
          setIsNotificationModalVisible(false);
          setEditingNotification(null);
        }}
        onSave={handleSaveNotification}
      />

      <DeleteNotificationModal
        visible={Boolean(notificationPendingDelete)}
        notificationTitle={notificationPendingDelete?.label}
        onClose={handleCloseDeleteNotificationModal}
        onConfirm={handleConfirmDeleteNotification}
      />
    </>
  );
}
