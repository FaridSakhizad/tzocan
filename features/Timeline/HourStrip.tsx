import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { SelectedCity } from '@/contexts/selected-cities-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import type { UiTheme } from '@/constants/ui-theme.types';
import IconNotification from '@/assets/images/icon--notification-2.svg';
import Arrow1 from '@/assets/images/icon--arrow-1.svg';
import {
  getFocusedDateTimeFromHourIndex,
  TIMELINE_CELL_WIDTH,
} from '@/utils/timeline-core';

type TimelineHourStripProps = {
  x: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  locale: string;
  sidePad: number;
  city: SelectedCity;
  hourIndices: number[];
  timelineWidth: number;
  timeFormat: string;
  width: number;
  onUserInteraction?: () => void;
  onScrollSettled?: (focusedHourIndex: number) => void;
  onNavigateDayBackward: () => void;
  onNavigateDayForward: () => void;
};

type HourLabel = {
  hour: number;
  suffix: string | null;
};

type MidnightLabel = {
  weekday: string;
  monthDay: string;
};

function getDatePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
}

function addDays(year: number, month: number, day: number, offsetDays: number) {
  const next = new Date(year, month - 1, day + offsetDays);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: next.getDate(),
  };
}

function isSameYmd(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function getRepeatMode(notification: NonNullable<SelectedCity['notifications']>[number]) {
  return notification.repeat || (notification.isDaily ? 'daily' : 'none');
}

function shouldNotificationTriggerAtHour(
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

  if (repeat === 'daily') {
    return true;
  }

  if (repeat === 'weekly') {
    const fallbackWeekday = new Date(
      currentCityParts.year,
      currentCityParts.month - 1,
      currentCityParts.day
    ).getDay();
    const weekdays = notification.weekdays && notification.weekdays.length > 0
      ? notification.weekdays
      : [fallbackWeekday];

    return weekdays.includes(
      new Date(slotParts.year, slotParts.month - 1, slotParts.day).getDay()
    );
  }

  if (repeat === 'monthly') {
    const dayOfMonth = notification.day ?? currentCityParts.day;
    return slotParts.day === dayOfMonth;
  }

  if (repeat === 'yearly') {
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

function getNotificationCountForHour(city: SelectedCity, hourIndex: number, now: Date) {
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

function getHourLabelForTimezone(date: Date, timezone: string, timeFormat: string): HourLabel {
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

function getMidnightLabelForTimezone(date: Date, timezone: string, locale: string): MidnightLabel {
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

function TimelineHourStripComponent({
  x,
  minX,
  maxX,
  enabled,
  locale,
  sidePad,
  city,
  hourIndices,
  timelineWidth,
  timeFormat,
  width,
  onUserInteraction,
  onScrollSettled,
  onNavigateDayBackward,
  onNavigateDayForward,
}: TimelineHourStripProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const startX = useSharedValue(0);

  const cells = useMemo(() => {
    const now = new Date();

    return hourIndices.map((hourIndex) => {
      const hourDate = getFocusedDateTimeFromHourIndex(hourIndex);
      const label = getHourLabelForTimezone(hourDate, city.tz, timeFormat);
      const hourParts = getDatePartsInTimezone(hourDate, city.tz);
      const isMidnight = hourParts.hour === 0;
      const midnightLabel = isMidnight
        ? getMidnightLabelForTimezone(hourDate, city.tz, locale)
        : null;
      const notificationCount = getNotificationCountForHour(city, hourIndex, now);

      return {
        key: `${city.id}-${hourIndex}`,
        hourIndex,
        label,
        midnightLabel,
        notificationCount,
        isMidnight,
      };
    });
  }, [city, hourIndices, locale, timeFormat]);

  const startHourIndex = hourIndices[0] ?? 0;
  const minFocusableHourIndex = hourIndices[0] ?? 0;
  const maxFocusableHourIndex = hourIndices[hourIndices.length - 1] ?? 0;

  const pan = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX([-12, 12])
      .failOffsetY([-12, 12])
      .onBegin(() => {
        if (onUserInteraction) {
          runOnJS(onUserInteraction)();
        }

        startX.value = x.value;
      })
      .onUpdate((event) => {
        x.value = clamp(startX.value - event.translationX, minX, maxX);
      })
      .onEnd((event) => {
        const projectedOffset = clamp(x.value - event.velocityX * 0.12, minX, maxX);
        const localHourIndex = Math.round(
          (projectedOffset + width / 2 - sidePad - TIMELINE_CELL_WIDTH / 2) / TIMELINE_CELL_WIDTH
        ) - 1;
        const rawFocusedHourIndex = startHourIndex + localHourIndex;
        const focusedHourIndex = Math.max(
          minFocusableHourIndex,
          Math.min(maxFocusableHourIndex, rawFocusedHourIndex)
        );
        const targetOffset = clamp(
          sidePad +
            ((focusedHourIndex - startHourIndex + 1) + 0.5) * TIMELINE_CELL_WIDTH -
            width / 2,
          minX,
          maxX
        );

        x.value = withSpring(targetOffset, { duration: 220 }, (finished) => {
          if (finished && onScrollSettled) {
            runOnJS(onScrollSettled)(focusedHourIndex);
          }
        });
      });
  }, [
    enabled,
    maxX,
    minX,
    onScrollSettled,
    onUserInteraction,
    sidePad,
    startHourIndex,
    startX,
    maxFocusableHourIndex,
    minFocusableHourIndex,
    width,
    x,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
        <Animated.View style={[styles.timelineContent, { width: timelineWidth }, animatedStyle]}>
          <View style={{ width: sidePad }} />

          <View style={styles.hourBox}>
            <Pressable onPress={onNavigateDayBackward} style={[styles.hourBlock, styles.navBlock]}>
              <Arrow1
                style={[styles.navArrow, styles.navArrowLeft]}
                fill={theme.text.primary}
              />
            </Pressable>
          </View>

          {cells.map((cell) => (
            <View key={cell.key} style={styles.hourBox}>
              <View
                style={[
                  styles.hourBlock,
                  timeFormat === '12h' && styles.hourBlock12hFormat,
                  cell.isMidnight && styles.hourBlockMidnight,
                ]}
              >
                {cell.isMidnight && cell.midnightLabel ? (
                  <>
                    <Text style={styles.midnightWeekday}>{cell.midnightLabel.weekday}</Text>
                    <Text style={styles.midnightMonthDay}>{cell.midnightLabel.monthDay}</Text>
                  </>
                ) : timeFormat === '12h' ? (
                  <>
                    <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
                    <Text style={styles.hourBlockAmPm}>{cell.label.suffix}</Text>
                  </>
                ) : (
                  <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
                )}

                {cell.notificationCount > 0 && (
                  <View style={styles.notificationCountBadge}>
                    <IconNotification
                      style={styles.notificationCountIcon}
                      fill={theme.surface.button.subtleMedium}
                    />
                    {cell.notificationCount > 1 && (
                      <Text style={styles.notificationCountText}>{cell.notificationCount}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          <View style={styles.hourBox}>
            <Pressable onPress={onNavigateDayForward} style={[styles.hourBlock, styles.navBlock]}>
              <Arrow1 style={styles.navArrow} fill={theme.text.primary} />
            </Pressable>
          </View>

          <View style={{ width: sidePad }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export const HourStrip = React.memo(
  TimelineHourStripComponent,
  (prevProps, nextProps) =>
    prevProps.x === nextProps.x &&
    prevProps.minX === nextProps.minX &&
    prevProps.maxX === nextProps.maxX &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.locale === nextProps.locale &&
    prevProps.sidePad === nextProps.sidePad &&
    prevProps.city === nextProps.city &&
    prevProps.hourIndices === nextProps.hourIndices &&
    prevProps.timelineWidth === nextProps.timelineWidth &&
    prevProps.timeFormat === nextProps.timeFormat &&
    prevProps.width === nextProps.width &&
    prevProps.onUserInteraction === nextProps.onUserInteraction &&
    prevProps.onScrollSettled === nextProps.onScrollSettled &&
    prevProps.onNavigateDayBackward === nextProps.onNavigateDayBackward &&
    prevProps.onNavigateDayForward === nextProps.onNavigateDayForward
);

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    timelineViewport: {
      overflow: 'hidden',
      paddingBottom: 11,
    },
    timelineContent: {
      flexDirection: 'row',
    },
    hourBox: {
      width: TIMELINE_CELL_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourBlock: {
      width: 64,
      height: 64,
      paddingTop: 4,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.surface.fieldStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBlock: {
      paddingTop: 0,
    },
    navArrow: {
      width: 18,
      height: 18,
    },
    navArrowLeft: {
      transform: [{ rotate: '180deg' }],
    },
    hourBlock12hFormat: {
      paddingTop: 11,
      justifyContent: 'flex-start',
    },
    hourBlockMidnight: {
      paddingTop: 0,
      justifyContent: 'center',
    },
    midnightWeekday: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    midnightMonthDay: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    hourBlockHour: {
      fontSize: 36,
      lineHeight: 36,
      fontWeight: '300',
      color: theme.text.primary,
    },
    hourBlockAmPm: {
      fontSize: 14,
      lineHeight: 14,
      color: theme.text.primary,
      top: -3,
      textTransform: 'uppercase',
    },
    notificationCountBadge: {
      position: 'absolute',
      bottom: -8,
      minWidth: 18,
      height: 15,
      borderRadius: 8,
      paddingHorizontal: 5,
      flexDirection: 'row',
      gap: 2,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.primary,
    },
    notificationCountIcon: {
      width: 9,
      height: 9,
    },
    notificationCountText: {
      fontSize: 12,
      lineHeight: 13,
      color: theme.surface.button.subtleMedium,
    },
  });
}
