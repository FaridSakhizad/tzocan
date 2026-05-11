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

import { createStyles } from './LocalReferenceStrip.styles';

type LocalReferenceStripProps = {
  x: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  locale: string;
  sidePad: number;
  hourIndices: number[];
  timelineWidth: number;
  timeFormat: string;
  timezone: string;
  width: number;
  onUserInteraction?: () => void;
  onScrollSettled?: (focusedHourIndex: number) => void;
  onNavigateDayBackward: () => void;
  onNavigateDayForward: () => void;
};

function LocalReferenceStripComponent({
  x,
  minX,
  maxX,
  enabled,
  locale,
  sidePad,
  hourIndices,
  timelineWidth,
  timeFormat,
  timezone,
  width,
  onUserInteraction,
  onScrollSettled,
  onNavigateDayBackward,
  onNavigateDayForward,
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
        })
        .onUpdate((event) => {
          x.value = clamp(startX.value - event.translationX, minX, maxX);
        })
        .onEnd((event) => {
          const projectedOffset = clamp(x.value - event.velocityX * 0.12, minX, maxX);
          const localHourIndex =
            Math.round(
              (projectedOffset + width / 2 - sidePad - TIMELINE_CELL_WIDTH / 2) /
                TIMELINE_CELL_WIDTH
            ) - 1;
          const rawFocusedHourIndex = startHourIndex + localHourIndex;
          const focusedHourIndex = Math.max(
            minFocusableHourIndex,
            Math.min(maxFocusableHourIndex, rawFocusedHourIndex)
          );
          const targetOffset = clamp(
            sidePad +
              (focusedHourIndex - startHourIndex + 1 + 0.5) * TIMELINE_CELL_WIDTH -
              width / 2,
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
      enabled,
      maxFocusableHourIndex,
      maxX,
      minFocusableHourIndex,
      minX,
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
                  cell.isMidnight && styles.hourBlockMidnight,
                ]}
              >
                {cell.isMidnight && cell.midnightLabel ? (
                  <Text style={styles.midnightMonthDay}>{cell.midnightLabel.monthDay}</Text>
                ) : timeFormat === '12h' ? (
                  <View style={styles.hourLabelRow}>
                    <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
                    {cell.label.suffix ? (
                      <Text style={styles.hourBlockAmPm}>{cell.label.suffix}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.hourBlockHour}>{cell.label.hour}</Text>
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

export const LocalReferenceStrip = React.memo(
  LocalReferenceStripComponent,
  (prevProps, nextProps) =>
    prevProps.x === nextProps.x &&
    prevProps.minX === nextProps.minX &&
    prevProps.maxX === nextProps.maxX &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.locale === nextProps.locale &&
    prevProps.sidePad === nextProps.sidePad &&
    prevProps.hourIndices === nextProps.hourIndices &&
    prevProps.timelineWidth === nextProps.timelineWidth &&
    prevProps.timeFormat === nextProps.timeFormat &&
    prevProps.timezone === nextProps.timezone &&
    prevProps.width === nextProps.width &&
    prevProps.onUserInteraction === nextProps.onUserInteraction &&
    prevProps.onScrollSettled === nextProps.onScrollSettled &&
    prevProps.onNavigateDayBackward === nextProps.onNavigateDayBackward &&
    prevProps.onNavigateDayForward === nextProps.onNavigateDayForward
);
