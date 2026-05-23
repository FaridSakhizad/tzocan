import { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, Dimensions, Pressable, Animated as RNAnimated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import IconReset from '@/assets/images/icon--reset-1.svg';
import { TIME_REFRESH_INTERVAL_MS } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';

import { useAppTheme } from '@/contexts/app-theme-context';
import { HOURS_RANGE, MINUTES_PER_TICK, TICK_WIDTH, TOTAL_MINUTES, SNAP_TO_ZERO_THRESHOLD } from '@/features/Cities/constants';
import { createStyles } from '@/features/Cities/TimeRuler.styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TOTAL_TICKS = TOTAL_MINUTES / MINUTES_PER_TICK;
const SIDE_DUMMY_TICKS = Math.ceil(SCREEN_WIDTH / 2 / TICK_WIDTH);
const MIN_OFFSET_MINUTES = -HOURS_RANGE * 60;
const MAX_OFFSET_MINUTES = HOURS_RANGE * 60;
const RULER_WIDTH = TOTAL_TICKS * TICK_WIDTH + SIDE_DUMMY_TICKS * 2 * TICK_WIDTH;

type TimeFormat = '12h' | '24h';

type TimeRulerProps = {
  offsetMinutes: number;
  onOffsetChange: (minutes: number) => void;
  timeFormat: TimeFormat;
  isActive?: boolean;
};

function getLocalTime(locale: string, timeFormat: TimeFormat, offsetMinutes: number = 0): string {
  const now = new Date();

  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(shiftedTime);
}

function formatOffset(minutes: number): string {
  if (minutes === 0) {
    return '00:00';
  }

  const sign = minutes > 0 ? '+' : '-';
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  if (mins === 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

const getScrollXForOffset = (minutes: number) => {
  return RULER_WIDTH / 2 - SCREEN_WIDTH / 2 + TICK_WIDTH / 2 + minutes;
};

const MIN_SCROLL_X = getScrollXForOffset(MIN_OFFSET_MINUTES);
const MAX_SCROLL_X = getScrollXForOffset(MAX_OFFSET_MINUTES);

const calculateOffsetFromScroll = (scrollX: number) => {
  return Math.round(scrollX + SCREEN_WIDTH / 2 - RULER_WIDTH / 2 - TICK_WIDTH / 2);
};

const clampScrollX = (scrollX: number) => {
  return Math.max(MIN_SCROLL_X, Math.min(MAX_SCROLL_X, scrollX));
};

export function TimeRuler({ offsetMinutes, onOffsetChange, timeFormat, isActive = true }: TimeRulerProps) {
  const { theme } = useAppTheme();
  const { locale } = useI18n();

  const styles = useMemo(() => createStyles(theme, SCREEN_WIDTH), [theme]);

  const isDraggingRef = useRef(false);
  const displayOffsetRef = useRef(offsetMinutes);
  const [displayOffset, setDisplayOffset] = useState(offsetMinutes);
  const [, setTick] = useState(0);

  const leftSlideAnim = useRef(new RNAnimated.Value(offsetMinutes !== 0 ? 0 : -30)).current;
  const rightSlideAnim = useRef(new RNAnimated.Value(offsetMinutes !== 0 ? 0 : 30)).current;
  const topSlideAnim = useRef(new RNAnimated.Value(offsetMinutes !== 0 ? 0 : -20)).current;
  const opacityAnim = useRef(new RNAnimated.Value(offsetMinutes !== 0 ? 1 : 0)).current;
  const isOffsetVisible = displayOffset !== 0;
  const scrollX = useSharedValue(clampScrollX(getScrollXForOffset(offsetMinutes)));
  const gestureStartScrollX = useSharedValue(scrollX.value);
  const lastGestureOffset = useSharedValue(offsetMinutes);

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(leftSlideAnim, {
        toValue: isOffsetVisible ? 0 : -30,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(rightSlideAnim, {
        toValue: isOffsetVisible ? 0 : 30,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(topSlideAnim, {
        toValue: isOffsetVisible ? 0 : -20,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacityAnim, {
        toValue: isOffsetVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [displayOffset, isOffsetVisible, leftSlideAnim, opacityAnim, rightSlideAnim, topSlideAnim]);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    if (displayOffsetRef.current !== offsetMinutes) {
      displayOffsetRef.current = offsetMinutes;
      setDisplayOffset(offsetMinutes);
      lastGestureOffset.value = offsetMinutes;
      scrollX.value = clampScrollX(getScrollXForOffset(offsetMinutes));
    }
  }, [lastGestureOffset, offsetMinutes, scrollX]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setTick((t) => t + 1);

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive]);

  const syncOffsetDuringDrag = (newOffset: number) => {
    if (displayOffsetRef.current === newOffset) {
      return;
    }

    displayOffsetRef.current = newOffset;
    setDisplayOffset(newOffset);
    onOffsetChange(newOffset);
  };

  const handleGestureStart = () => {
    isDraggingRef.current = true;
  };

  const handleGestureFinalize = () => {
    isDraggingRef.current = false;
  };

  const handleGestureEnd = (nextOffset: number) => {
    isDraggingRef.current = false;

    if (displayOffsetRef.current !== nextOffset) {
      displayOffsetRef.current = nextOffset;
      setDisplayOffset(nextOffset);
    }

    onOffsetChange(nextOffset);
  };

  const handleResetPress = () => {
    displayOffsetRef.current = 0;
    setDisplayOffset(0);
    onOffsetChange(0);
    lastGestureOffset.value = 0;
    scrollX.value = clampScrollX(getScrollXForOffset(0));
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin(() => {
          cancelAnimation(scrollX);
          gestureStartScrollX.value = scrollX.value;
          handleGestureStart();
        })
        .onUpdate((event) => {
          const rawScrollX = gestureStartScrollX.value - event.translationX;
          const nextScrollX = clampScrollX(rawScrollX);
          scrollX.value = nextScrollX;
          const nextOffset = calculateOffsetFromScroll(nextScrollX);

          if (displayOffsetRef.current !== nextOffset) {
            lastGestureOffset.value = nextOffset;
            syncOffsetDuringDrag(nextOffset);
          }
        })
        .onEnd(() => {
          const finalScrollX = clampScrollX(scrollX.value);
          const finalOffset = calculateOffsetFromScroll(finalScrollX);
          const nextOffset = Math.abs(finalOffset) <= SNAP_TO_ZERO_THRESHOLD ? 0 : finalOffset;
          const nextScrollX = nextOffset === 0 ? getScrollXForOffset(0) : finalScrollX;

          scrollX.value = withTiming(nextScrollX, { duration: 140 });
          lastGestureOffset.value = nextOffset;
          handleGestureEnd(nextOffset);
        })
        .onFinalize(() => {
          handleGestureFinalize();
        }),
    [gestureStartScrollX, lastGestureOffset, scrollX]
  );

  const rulerTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -scrollX.value }],
  }));

  const ticks = useMemo(() => {
    const ticks = [];

    for (let i = 0; i < SIDE_DUMMY_TICKS; i++) {
      ticks.push(<View key={`dummy1_${i}`} style={styles.tickDummy} />)
    }

    for (let i = 0; i <= TOTAL_TICKS; i++) {
      const minutesFromStart = i * MINUTES_PER_TICK;
      const minutesFromCenter = minutesFromStart - HOURS_RANGE * 60;
      const isHourMark = minutesFromCenter % 60 === 0;
      const isZeroMark = minutesFromCenter === 0;

      ticks.push(
        <View key={i} style={styles.tickContainer}>
          <View
            style={[
              styles.tick,
              isHourMark && styles.hourTick,
              isZeroMark && styles.zeroTick,
            ]}
          />
        </View>
      );
    }

    for (let i = 0; i < SIDE_DUMMY_TICKS; i++) {
      ticks.push(<View key={`dummy2_${i}`} style={styles.tickDummy} />)
    }

    return ticks;
  }, [styles.hourTick, styles.tick, styles.tickContainer, styles.tickDummy, styles.zeroTick]);

  return (
    <View style={styles.container}>
      <RNAnimated.View
        style={[
          styles.resetButton,
          {
            opacity: opacityAnim,
            transform: [{ translateY: topSlideAnim }],
          },
        ]}
      >
        <Pressable onPress={handleResetPress} style={styles.resetButtonPressable}>
          <View style={styles.resetButtonIconBox}>
            <IconReset
              style={styles.resetButtonIcon}
              fill={theme.surface.button.subtleStrong}
            />
          </View>
        </Pressable>
      </RNAnimated.View>

      <View style={styles.timeContainer}>
        <RNAnimated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: leftSlideAnim }],
            },
          ]}
        >
          {getLocalTime(locale, timeFormat, 0)}
        </RNAnimated.Text>
        <Text style={styles.localTimeText}>
          {getLocalTime(locale, timeFormat, displayOffset)}
        </Text>
        <RNAnimated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: rightSlideAnim }],
            },
          ]}
        >
          {formatOffset(displayOffset)}
        </RNAnimated.Text>
      </View>

      <View style={styles.rulerContainer}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.rulerTrack, { width: RULER_WIDTH }, rulerTrackStyle]}>
            {ticks}
          </Animated.View>
        </GestureDetector>

        <View
          style={styles.centerIndicator}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}
