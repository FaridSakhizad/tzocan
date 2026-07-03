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

import type { SelectedCity } from '@/contexts/selected-cities-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import IconNotification from '@/assets/images/icon--notification-2.svg';
import Arrow1 from '@/assets/images/icon--arrow-1.svg';

import {
  getFocusedDateTimeFromHourIndex,
  TIMELINE_CELL_WIDTH,
} from '@/utils/timeline-core';
import {
  getDatePartsInTimezone,
  getHourLabelForTimezone,
  getMidnightLabelForTimezone,
  getNotificationCountForHour,
} from '@/features/Timeline/helpers';
import {
  TIMELINE_EDGE_PULL_MAX,
  TIMELINE_EDGE_PULL_TRIGGER,
} from '@/features/Timeline/constants';
import { createStyles } from '@/features/Timeline/HourStrip.styles';

const SIDE_PAD_ICON_HIDDEN_OFFSET = 10;
const SIDE_PAD_ICON_REVEAL_DISTANCE = TIMELINE_EDGE_PULL_MAX - SIDE_PAD_ICON_HIDDEN_OFFSET;

type TimelineHourStripProps = {
  x: SharedValue<number>;
  edgePull: SharedValue<number>;
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
  onEdgeNavigateDayBackward?: () => void;
  onEdgeNavigateDayForward?: () => void;
};

function TimelineHourStripComponent({
  x,
  edgePull,
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
  onEdgeNavigateDayBackward,
  onEdgeNavigateDayForward,
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
          (projectedOffset + width / 2 - sidePad - TIMELINE_CELL_WIDTH / 2) / TIMELINE_CELL_WIDTH
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
      });
  }, [
    edgePull,
    enabled,
    maxX,
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
    maxFocusableHourIndex,
    minFocusableHourIndex,
    width,
    x,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value + edgePull.value }],
  }));

  const leftSidePadIconStyle = useAnimatedStyle(() => ({
    opacity: clamp(
      (edgePull.value - SIDE_PAD_ICON_HIDDEN_OFFSET) / SIDE_PAD_ICON_REVEAL_DISTANCE,
      0,
      1
    ),
  }));

  const rightSidePadIconStyle = useAnimatedStyle(() => ({
    opacity: clamp(
      (-edgePull.value - SIDE_PAD_ICON_HIDDEN_OFFSET) / SIDE_PAD_ICON_REVEAL_DISTANCE,
      0,
      1
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
        <Animated.View style={[styles.timelineContent, { width: timelineWidth }, animatedStyle]}>
          <View style={[styles.sidePad, styles.sidePadLeft, { width: sidePad }]}>
            <Pressable onPress={onNavigateDayBackward} style={[styles.navBlock, styles.navBlockLeft, { minWidth: sidePad * 2 }]}>
              <View style={styles.navBlockIconBox}>
                <Arrow1
                  style={[styles.navArrow, styles.navArrowLeft]}
                  fill={theme.text.primary}
                />
              </View>
            </Pressable>
            <Animated.View
              pointerEvents="none"
              style={[styles.sidePadIconBox, { right: sidePad + 10 }, leftSidePadIconStyle]}
            >
              <Arrow1
                style={[styles.navArrow, styles.navArrowLeft]}
                fill={theme.text.warning}
              />
              <Arrow1
                style={[styles.navArrow, styles.navArrowLeft]}
                fill={theme.text.warning}
              />
              <Arrow1
                style={[styles.navArrow, styles.navArrowLeft]}
                fill={theme.text.warning}
              />
            </Animated.View>
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

          <View style={[styles.sidePad, styles.sidePadRight, { width: sidePad }]}>
            <Pressable onPress={onNavigateDayForward} style={[styles.navBlock, styles.navBlockRight, { minWidth: sidePad * 2 }]}>
              <View style={styles.navBlockIconBox}>
                <Arrow1
                  style={styles.navArrow}
                  fill={theme.text.primary}
                />
              </View>
            </Pressable>
            <Animated.View
              pointerEvents="none"
              style={[styles.sidePadIconBox, { left: sidePad + 10 }, rightSidePadIconStyle]}
            >
              <Arrow1
                style={[styles.navArrow]}
                fill={theme.text.warning}
              />
              <Arrow1
                style={[styles.navArrow]}
                fill={theme.text.warning}
              />
              <Arrow1
                style={[styles.navArrow]}
                fill={theme.text.warning}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export const HourStrip = React.memo(
  TimelineHourStripComponent,
  (prevProps, nextProps) =>
    prevProps.x === nextProps.x &&
    prevProps.edgePull === nextProps.edgePull &&
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
    prevProps.onNavigateDayForward === nextProps.onNavigateDayForward &&
    prevProps.onEdgeNavigateDayBackward === nextProps.onEdgeNavigateDayBackward &&
    prevProps.onEdgeNavigateDayForward === nextProps.onEdgeNavigateDayForward
);
