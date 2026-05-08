import { useRef, useMemo, useState, useEffect } from 'react';
import { View, ScrollView, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable, Animated } from 'react-native';

import IconReset from '@/assets/images/icon--reset-1.svg';
import { TIME_REFRESH_INTERVAL_MS } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';

import { useAppTheme } from '@/contexts/app-theme-context';
import { HOURS_RANGE, MINUTES_PER_TICK, TICK_WIDTH, TOTAL_MINUTES, SNAP_TO_ZERO_THRESHOLD } from '@/features/Cities/constants';
import { createStyles } from '@/features/Cities/TimeRuler.styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TOTAL_TICKS = TOTAL_MINUTES / MINUTES_PER_TICK;
const NUMBER_OF_DUMMIES = Math.ceil(SCREEN_WIDTH / TICK_WIDTH);
const RULER_WIDTH = TOTAL_TICKS * TICK_WIDTH + NUMBER_OF_DUMMIES * TICK_WIDTH;

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

export function TimeRuler({ offsetMinutes, onOffsetChange, timeFormat, isActive = true }: TimeRulerProps) {
  const { theme } = useAppTheme();
  const { locale } = useI18n();

  const styles = useMemo(() => createStyles(theme, SCREEN_WIDTH), [theme]);

  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const displayOffsetRef = useRef(offsetMinutes);
  const initialScrollXRef = useRef(getScrollXForOffset(offsetMinutes));

  const [displayOffset, setDisplayOffset] = useState(offsetMinutes);
  const [, setTick] = useState(0);

  const leftSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : -30)).current;
  const rightSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : 30)).current;
  const topSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : -20)).current;
  const opacityAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 1 : 0)).current;
  const isOffsetVisible = displayOffset !== 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(leftSlideAnim, {
        toValue: isOffsetVisible ? 0 : -30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rightSlideAnim, {
        toValue: isOffsetVisible ? 0 : 30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(topSlideAnim, {
        toValue: isOffsetVisible ? 0 : -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isOffsetVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [displayOffset, isOffsetVisible, leftSlideAnim, opacityAnim, rightSlideAnim, topSlideAnim]);

  useEffect(() => {
    if (isScrolling.current || isProgrammaticScroll.current) {
      return;
    }

    if (displayOffsetRef.current !== offsetMinutes) {
      displayOffsetRef.current = offsetMinutes;
      setDisplayOffset(offsetMinutes);
      scrollViewRef.current?.scrollTo({ x: getScrollXForOffset(offsetMinutes), animated: false });
    }
  }, [offsetMinutes]);

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

  const calculateOffsetFromScroll = (scrollX: number) => {
    return Math.round(scrollX + SCREEN_WIDTH / 2 - RULER_WIDTH / 2 - TICK_WIDTH / 2);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isScrolling.current) {
       return;
    }

    const scrollX = event.nativeEvent.contentOffset.x;

    const newOffset = calculateOffsetFromScroll(scrollX);

    const leftThreshold = RULER_WIDTH / 2 - (NUMBER_OF_DUMMIES * TICK_WIDTH / 2);

    if (newOffset < 0 && Math.abs(newOffset) > leftThreshold) {
      return;
    }

    if (newOffset > TOTAL_MINUTES / 2) {
      return;
    }

    if (displayOffsetRef.current !== newOffset) {
      displayOffsetRef.current = newOffset;
      setDisplayOffset(newOffset);
      onOffsetChange(newOffset);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrolling.current = true;
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;

      return;
    }

    const scrollX = event.nativeEvent.contentOffset.x;

    const newOffset = calculateOffsetFromScroll(scrollX);

    isScrolling.current = false;

    if (scrollX > (TOTAL_MINUTES)) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current?.scrollTo({ x: TOTAL_MINUTES + TICK_WIDTH / 2, animated: true });
      return;
    }

    if (scrollX < (TICK_WIDTH / 2)) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current?.scrollTo({ x: TICK_WIDTH / 2, animated: true });
      return;
    }

    if (Math.abs(newOffset) <= SNAP_TO_ZERO_THRESHOLD) {
      isProgrammaticScroll.current = true;
      displayOffsetRef.current = 0;
      setDisplayOffset(0);
      onOffsetChange(0);
      scrollViewRef.current?.scrollTo({ x: getScrollXForOffset(0), animated: true });
      return;
    }

    if (displayOffsetRef.current !== newOffset) {
      displayOffsetRef.current = newOffset;
      setDisplayOffset(newOffset);
    }
    onOffsetChange(newOffset);
  };

  const handleResetPress = () => {
    isProgrammaticScroll.current = true;

    displayOffsetRef.current = 0;
    setDisplayOffset(0);
    onOffsetChange(0);

    const scrollX = getScrollXForOffset(0);
    scrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
  }

  const ticks = useMemo(() => {
    const ticks = [];

    const numberOfDummies = Math.ceil(SCREEN_WIDTH / 2 / TICK_WIDTH);

    for (let i = 0; i < numberOfDummies; i++) {
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

    for (let i = 0; i < numberOfDummies; i++) {
      ticks.push(<View key={`dummy2_${i}`} style={styles.tickDummy} />)
    }

    return ticks;
  }, [styles.hourTick, styles.tick, styles.tickContainer, styles.tickDummy, styles.zeroTick]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.resetButton,
          {
            opacity: opacityAnim,
            transform: [{ translateY: topSlideAnim }],
          },
        ]}
      >
        <Pressable onPress={handleResetPress} style={styles.resetButtonPressable}>
          <IconReset
            style={styles.resetButtonIcon}
            fill={theme.surface.button.subtleStrong}
          />
        </Pressable>
      </Animated.View>

      <View style={styles.timeContainer}>
        <Animated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: leftSlideAnim }],
            },
          ]}
        >
          {getLocalTime(locale, timeFormat, 0)}
        </Animated.Text>
        <Pressable onPress={handleResetPress}>
          <Text style={styles.localTimeText}>
            {getLocalTime(locale, timeFormat, displayOffset)}
          </Text>
        </Pressable>
        <Animated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: rightSlideAnim }],
            },
          ]}
        >
          {formatOffset(displayOffset)}
        </Animated.Text>
      </View>

      <View style={styles.rulerContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={4}
          contentContainerStyle={styles.scrollContent}
          contentOffset={{ x: initialScrollXRef.current, y: 0 }}
          decelerationRate={0}
          disableIntervalMomentum
          alwaysBounceHorizontal={false}
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
        >
          {ticks}
        </ScrollView>

        <View
          style={styles.centerIndicator}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}
