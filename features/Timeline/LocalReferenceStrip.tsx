import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useAppTheme } from '@/contexts/app-theme-context';
import Arrow1 from '@/assets/images/icon--arrow-1.svg';
import {
  getFocusedDateTimeFromHourIndex,
  TIMELINE_CELL_WIDTH,
} from '@/utils/timeline-core';
import {
  getDatePartsInTimezone,
  getHourLabelForTimezone,
  getMidnightLabelForTimezone,
} from '@/features/Timeline/helpers';
import {
  TIMELINE_EDGE_PULL_MAX,
  TIMELINE_EDGE_PULL_TRIGGER,
} from '@/features/Timeline/constants';

import { createStyles } from './LocalReferenceStrip.styles';

type LocalReferenceStripProps = {
  x: SharedValue<number>;
  edgePull: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  locale: string;
  sidePad: number;
  hourIndices: number[];
  timezoneShiftX?: number;
  timelineWidth: number;
  timeFormat: string;
  timezone: string;
  width: number;
  onUserInteraction?: () => void;
  onScrollSettled?: (focusedHourIndex: number) => void;
  onNavigateDayBackward: () => void;
  onNavigateDayForward: () => void;
  onEdgeNavigateDayBackward?: () => void;
  onEdgeNavigateDayForward?: () => void;
};

function LocalReferenceStripComponent({
  x,
  edgePull,
  minX,
  maxX,
  enabled,
  locale,
  sidePad,
  hourIndices,
  timezoneShiftX = 0,
  timelineWidth,
  timeFormat,
  timezone,
  width,
  onUserInteraction,
  onScrollSettled,
  onNavigateDayBackward,
  onNavigateDayForward,
  onEdgeNavigateDayBackward,
  onEdgeNavigateDayForward,
}: LocalReferenceStripProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const startX = useSharedValue(0);

  const cells = useMemo(
    () =>
      hourIndices.map((hourIndex) => {
        const hourDate = getFocusedDateTimeFromHourIndex(hourIndex);
        const label = getHourLabelForTimezone(hourDate, timezone, timeFormat);
        const hourParts = getDatePartsInTimezone(hourDate, timezone);
        const isMidnight = hourParts.hour === 0;
        const midnightLabel = isMidnight
          ? getMidnightLabelForTimezone(hourDate, timezone, locale)
          : null;

        return {
          key: `local-reference-${hourIndex}`,
          label,
          isMidnight,
          midnightLabel,
        };
      }),
    [hourIndices, locale, timeFormat, timezone]
  );

  const sideDates = useMemo(() => {
    const currentDayStartHourIndex = hourIndices[0];

    if (currentDayStartHourIndex == null) {
      return { previous: '', next: '' };
    }

    const currentDayStart = getFocusedDateTimeFromHourIndex(currentDayStartHourIndex);
    const previousDay = new Date(currentDayStart);
    previousDay.setDate(previousDay.getDate() - 1);

    const nextDay = new Date(currentDayStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    });

    return {
      previous: formatter.format(previousDay),
      next: formatter.format(nextDay),
    };
  }, [hourIndices, locale, timezone]);

  const startHourIndex = hourIndices[0] ?? 0;
  const minFocusableHourIndex = hourIndices[0] ?? 0;
  const maxFocusableHourIndex = hourIndices[hourIndices.length - 1] ?? 0;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          if (onUserInteraction) {
            runOnJS(onUserInteraction)();
          }

          startX.value = x.value;
          edgePull.value = 0;
        })
        .onUpdate((event) => {
          const rawOffset = startX.value - event.translationX;
          const clampedOffset = clamp(rawOffset, minX, maxX);
          const overflow = rawOffset - clampedOffset;

          x.value = clampedOffset;
          edgePull.value = clamp(-overflow * 0.35, -TIMELINE_EDGE_PULL_MAX, TIMELINE_EDGE_PULL_MAX);
        })
        .onEnd((event) => {
          const pullOffset = edgePull.value;
          const shouldGoPrevious = x.value <= minX && pullOffset >= TIMELINE_EDGE_PULL_TRIGGER;
          const shouldGoNext = x.value >= maxX && pullOffset <= -TIMELINE_EDGE_PULL_TRIGGER;

          edgePull.value = withSpring(0, { duration: 220 });

          if (shouldGoPrevious) {
            runOnJS(onEdgeNavigateDayBackward || onNavigateDayBackward)();
            return;
          }

          if (shouldGoNext) {
            runOnJS(onEdgeNavigateDayForward || onNavigateDayForward)();
            return;
          }

          const projectedOffset = clamp(x.value - event.velocityX * 0.12, minX, maxX);
          const localHourIndex = Math.round(
            (projectedOffset + width / 2 - sidePad - TIMELINE_CELL_WIDTH / 2) /
              TIMELINE_CELL_WIDTH
          );
          const rawFocusedHourIndex = startHourIndex + localHourIndex;
          const focusedHourIndex = Math.max(
            minFocusableHourIndex,
            Math.min(maxFocusableHourIndex, rawFocusedHourIndex)
          );
          const targetOffset = clamp(
            sidePad + (focusedHourIndex - startHourIndex + 0.5) * TIMELINE_CELL_WIDTH - width / 2,
            minX,
            maxX
          );

          x.value = withSpring(targetOffset, { duration: 220 }, (finished) => {
            if (finished && onScrollSettled) {
              runOnJS(onScrollSettled)(focusedHourIndex);
            }
          });
        }),
    [
      edgePull,
      enabled,
      maxFocusableHourIndex,
      maxX,
      minFocusableHourIndex,
      minX,
      onNavigateDayBackward,
      onNavigateDayForward,
      onEdgeNavigateDayBackward,
      onEdgeNavigateDayForward,
      onScrollSettled,
      onUserInteraction,
      sidePad,
      startHourIndex,
      startX,
      width,
      x,
    ]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value + edgePull.value + timezoneShiftX }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
        <Animated.View style={[styles.timelineContent, { width: timelineWidth }, animatedStyle]}>
          <View style={[styles.sidePad, styles.sidePadLeft, { width: sidePad }]}>
            <Pressable onPress={onNavigateDayBackward} style={[styles.navBlock, styles.navBlockLeft]}>
              <Arrow1
                style={[styles.navArrow, styles.navArrowLeft]}
                fill={theme.text.warning}
              />
              <Text style={[styles.sideDateText, styles.sideDateTextLeft]} numberOfLines={1}>
                {sideDates.previous}
              </Text>
            </Pressable>

            <View style={[styles.sidePadRubberPlaceholder, { right: sidePad }]} />
          </View>

          {cells.map((cell) => (
            <View key={cell.key} style={styles.hourBox}>
              <View
                style={[
                  styles.hourBlock,
                  cell.isMidnight && styles.hourBlockMidnight,
                ]}
              >
                {cell.isMidnight && cell.midnightLabel ? (
                  <Text style={styles.midnightMonthDay}>{cell.midnightLabel.monthDay}</Text>
                ) : timeFormat === '12h' ? (
                  <View style={styles.hourLabelRow}>
                    <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
                    {cell.label.suffix && (
                      <Text style={styles.hourBlockAmPm}>{cell.label.suffix}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
                )}
              </View>
            </View>
          ))}

          <View style={[styles.sidePad, styles.sidePadRight, { width: sidePad }]}>
            <Pressable onPress={onNavigateDayForward} style={[styles.navBlock, styles.navBlockRight]}>
              <Text style={[styles.sideDateText, styles.sideDateTextRight]} numberOfLines={1}>
                {sideDates.next}
              </Text>
              <Arrow1
                style={styles.navArrow}
                fill={theme.text.warning}
              />
            </Pressable>

            <View style={[styles.sidePadRubberPlaceholder, { left: sidePad }]} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export const LocalReferenceStrip = React.memo(
  LocalReferenceStripComponent,
  (prevProps, nextProps) =>
    prevProps.x === nextProps.x &&
    prevProps.edgePull === nextProps.edgePull &&
    prevProps.minX === nextProps.minX &&
    prevProps.maxX === nextProps.maxX &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.locale === nextProps.locale &&
    prevProps.sidePad === nextProps.sidePad &&
    prevProps.hourIndices === nextProps.hourIndices &&
    prevProps.timezoneShiftX === nextProps.timezoneShiftX &&
    prevProps.timelineWidth === nextProps.timelineWidth &&
    prevProps.timeFormat === nextProps.timeFormat &&
    prevProps.timezone === nextProps.timezone &&
    prevProps.width === nextProps.width &&
    prevProps.onUserInteraction === nextProps.onUserInteraction &&
    prevProps.onScrollSettled === nextProps.onScrollSettled &&
    prevProps.onNavigateDayBackward === nextProps.onNavigateDayBackward &&
    prevProps.onNavigateDayForward === nextProps.onNavigateDayForward &&
    prevProps.onEdgeNavigateDayBackward === nextProps.onEdgeNavigateDayBackward &&
    prevProps.onEdgeNavigateDayForward === nextProps.onEdgeNavigateDayForward
);
