import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { CitySortPickerModal } from '@/components/city-sort-picker-modal';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { NotificationPickerModal } from '@/components/notification-picker-modal';
import { HourStrip } from '@/features/Timeline/HourStrip';
import { LocalReferenceStrip } from '@/features/Timeline/LocalReferenceStrip';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { CityOrderMode, useNotificationsSort } from '@/contexts/notifications-sort-context';
import { SelectedCity, useSelectedCities } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import { useScrollFit } from '@/hooks/use-scroll-fit';

import { getCityBaseName, getCityDisplayName } from '@/utils/city-display';
import { sortCitiesByOrder } from '@/utils/city-sorting';

import { TIME_REFRESH_INTERVAL_MS } from '@/constants/app-config';
import { DAY_TRANSITION_DURATION_MS } from './constants';

import {
  getFocusedDateTimeFromHourIndex,
  getHourIndexForDate,
  getLocalDayStart,
  getScrollOffsetForHourIndex,
  getTimelineHourIndicesForDay,
  shiftLocalDay,
  TIMELINE_CELL_WIDTH,
} from '@/utils/timeline-core';
import { formatInTimezone, formatPartsInTimezone } from '@/utils/abstract-timezone';

import Arrow1 from '@/assets/images/icon--arrow-1.svg';
import IconAddCity from '@/assets/images/icon--cities--outlined.svg';
import IconDelete from '@/assets/images/icon--delete-3.svg';
import IconReset from '@/assets/images/icon--reset-1.svg';

import IconCalendar from '@/assets/images/icon--calendar-2--outlined.svg';

import { createStyles } from './Timeline.styles';

function clampOffset(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTimezoneOffsetHours(timezone: string, now = new Date()) {
  const localParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const targetParts = formatPartsInTimezone(now, timezone, 'en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  const localMinutes = getPart(localParts, 'hour') * 60 + getPart(localParts, 'minute');
  const targetMinutes = getPart(targetParts, 'hour') * 60 + getPart(targetParts, 'minute');

  let diffMinutes = targetMinutes - localMinutes;

  if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  }

  return diffMinutes / 60;
}

function getCurrentTimeInTimezone(
  timezone: string,
  locale: string,
  timeFormat: string,
  now = new Date()
) {
  return formatInTimezone(now, timezone, locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

export default function TimelineScreen() {
  const { theme } = useAppTheme();
  const { locale, t } = useI18n();
  const { selectedCities, reorderCities, addCity, removeCity } = useSelectedCities();
  const { timeFormat } = useSettings();
  const { isEditMode } = useEditMode();
  const { sortState, setSortState, isSortPickerVisible, closeSortPicker } = useNotificationsSort();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedDay, setSelectedDay] = useState(() => getLocalDayStart(new Date()));
  const initialFocusedHourIndexRef = useRef(getHourIndexForDate(new Date()));
  const [focusedHourIndex, setFocusedHourIndex] = useState(initialFocusedHourIndexRef.current);
  const [dragging, setDragging] = useState(false);
  const [isAddCityModalVisible, setIsAddCityModalVisible] = useState(false);
  const [cityPendingDelete, setCityPendingDelete] = useState<SelectedCity | null>(null);
  const [draftCityOrder, setDraftCityOrder] = useState<CityOrderMode>(sortState.cityOrder);
  const [isDayTransitioning, setIsDayTransitioning] = useState(false);
  const [isDayPickerVisible, setIsDayPickerVisible] = useState(false);
  const [pickerDraftDay, setPickerDraftDay] = useState(() => getLocalDayStart(new Date()));
  const {
    scrollEnabled,
    handleContainerLayout,
    handleContentSizeChange,
  } = useScrollFit();
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isDayTransitioningRef = useRef(false);
  const previousTodayRef = useRef(getLocalDayStart(new Date()));
  const previousCurrentHourIndexRef = useRef(getHourIndexForDate(new Date()));

  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );

  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));

  const displayedCities = useMemo(
    () =>
      sortCitiesByOrder(
        selectedCities,
        sortState.cityOrder,
        locale,
        (city) => getCityDisplayName(city, localizedCityNames[city.cityId])
      ),
    [locale, localizedCityNames, selectedCities, sortState.cityOrder]
  );

  const offsetsMap = useMemo(() => {
    const nextMap = new Map<number, number>();

    displayedCities.forEach((city) => {
      nextMap.set(city.id, getTimezoneOffsetHours(city.tz, nowDate));
    });

    return nextMap;
  }, [displayedCities, nowDate]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setNowMs(Date.now());

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isFocused]);

  useEffect(() => {
    const nextToday = getLocalDayStart(nowDate);
    const previousToday = previousTodayRef.current;
    const nextCurrentHourIndex = getHourIndexForDate(nowDate);
    const previousCurrentHourIndex = previousCurrentHourIndexRef.current;

    if (
      nextToday.getTime() !== previousToday.getTime() &&
      selectedDay.getTime() === previousToday.getTime() &&
      !isDayTransitioningRef.current
    ) {
      const previousTodayHourIndex = getHourIndexForDate(previousToday);
      const focusedHourWasOnPreviousToday =
        focusedHourIndex >= previousTodayHourIndex &&
        focusedHourIndex <= previousTodayHourIndex + 23;

      setSelectedDay(nextToday);

      if (focusedHourIndex === previousCurrentHourIndex) {
        setFocusedHourIndex(nextCurrentHourIndex);
      } else if (focusedHourWasOnPreviousToday) {
        const offsetWithinDay = focusedHourIndex - previousTodayHourIndex;
        setFocusedHourIndex(getHourIndexForDate(nextToday) + offsetWithinDay);
      }
    }

    previousTodayRef.current = nextToday;
    previousCurrentHourIndexRef.current = nextCurrentHourIndex;
  }, [focusedHourIndex, nowDate, selectedDay]);

  useEffect(() => {
    if (isSortPickerVisible && isFocused) {
      setDraftCityOrder(sortState.cityOrder);
    }
  }, [isFocused, isSortPickerVisible, sortState.cityOrder]);

  const hourIndices = useMemo(() => getTimelineHourIndicesForDay(selectedDay), [selectedDay]);
  const startHourIndex = hourIndices[0] ?? getHourIndexForDate(selectedDay);
  const focusedDayStartHourIndex = getHourIndexForDate(selectedDay);
  const sidePad = Math.max(0, width / 2 - TIMELINE_CELL_WIDTH / 2);
  const timelineWidth = hourIndices.length * TIMELINE_CELL_WIDTH + sidePad * 2;
  const firstFocusableHourIndex = focusedDayStartHourIndex;
  const lastFocusableHourIndex = focusedDayStartHourIndex + 23;
  const minScrollX = clampOffset(
    getScrollOffsetForHourIndex(firstFocusableHourIndex, startHourIndex, width, sidePad, TIMELINE_CELL_WIDTH),
    0,
    Math.max(0, timelineWidth - width)
  );
  const maxScrollX = clampOffset(
    getScrollOffsetForHourIndex(lastFocusableHourIndex, startHourIndex, width, sidePad, TIMELINE_CELL_WIDTH),
    0,
    Math.max(0, timelineWidth - width)
  );

  const x = useSharedValue(0);
  const edgePull = useSharedValue(0);
  const hasInitializedScrollRef = useRef(false);

  const applyScrollOffsetForHourIndex = useCallback(
    (hourIndex: number, animated: boolean) => {
      const targetOffset = clampOffset(
        getScrollOffsetForHourIndex(hourIndex, startHourIndex, width, sidePad, TIMELINE_CELL_WIDTH),
        minScrollX,
        maxScrollX
      );

      if (animated) {
        x.value = targetOffset;
        return;
      }

      x.value = targetOffset;
    },
    [maxScrollX, minScrollX, sidePad, startHourIndex, width, x]
  );

  useLayoutEffect(() => {
    if (!hasInitializedScrollRef.current) {
      hasInitializedScrollRef.current = true;
      applyScrollOffsetForHourIndex(focusedHourIndex, false);
      return;
    }

    applyScrollOffsetForHourIndex(focusedHourIndex, false);
  }, [applyScrollOffsetForHourIndex, focusedHourIndex, selectedDay]);

  const handleOpenAddCityModal = useCallback(() => {
    setIsAddCityModalVisible(true);
  }, []);

  const handleCloseAddCityModal = useCallback(() => {
    setIsAddCityModalVisible(false);
  }, []);

  const handleSaveCity = useCallback((city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  }, [addCity]);

  const handleOpenDeleteCityModal = useCallback((city: SelectedCity) => {
    setCityPendingDelete(city);
  }, []);

  const handleCloseDeleteCityModal = useCallback(() => {
    setCityPendingDelete(null);
  }, []);

  const handleConfirmDeleteCity = useCallback(() => {
    if (!cityPendingDelete) {
      return;
    }

    removeCity(cityPendingDelete.id);
    setCityPendingDelete(null);
  }, [cityPendingDelete, removeCity]);

  const handleTimelineInteraction = useCallback(() => {
    // explicit no-op to keep interaction hook shape stable
  }, []);

  const handleTimelineScrollSettled = useCallback((nextFocusedHourIndex: number) => {
    const clampedHourIndex = Math.max(
      firstFocusableHourIndex,
      Math.min(lastFocusableHourIndex, nextFocusedHourIndex)
    );
    setFocusedHourIndex(clampedHourIndex);
  }, [firstFocusableHourIndex, lastFocusableHourIndex]);

  const runDayTransition = useCallback((updateDay: () => void) => {
    if (isDayTransitioningRef.current) {
      return;
    }

    isDayTransitioningRef.current = true;
    setIsDayTransitioning(true);

    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: DAY_TRANSITION_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isDayTransitioningRef.current = false;
        setIsDayTransitioning(false);
        contentOpacity.setValue(1);
        return;
      }

      updateDay();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: DAY_TRANSITION_DURATION_MS,
            useNativeDriver: true,
          }).start(() => {
            isDayTransitioningRef.current = false;
            setIsDayTransitioning(false);
          });
        });
      });
    });
  }, [contentOpacity]);

  const handleResetTimeline = useCallback(() => {
    runDayTransition(() => {
      const today = getLocalDayStart(new Date());
      setSelectedDay(today);
      setFocusedHourIndex(getHourIndexForDate(new Date()));
    });
  }, [runDayTransition]);

  const shiftDayBy = useCallback((offsetDays: number) => {
    runDayTransition(() => {
      const nextDay = shiftLocalDay(selectedDay, offsetDays);
      const currentOffsetWithinDay = focusedHourIndex - getHourIndexForDate(selectedDay);
      const nextFocusedHourIndex = getHourIndexForDate(nextDay) + currentOffsetWithinDay;

      setSelectedDay(nextDay);
      setFocusedHourIndex(nextFocusedHourIndex);
    });
  }, [focusedHourIndex, runDayTransition, selectedDay]);

  const handleEdgeNavigateDayBackward = useCallback(() => {
    runDayTransition(() => {
      const nextDay = shiftLocalDay(selectedDay, -1);
      const nextFocusedHourIndex = getHourIndexForDate(nextDay) + 23;

      setSelectedDay(nextDay);
      setFocusedHourIndex(nextFocusedHourIndex);
    });
  }, [runDayTransition, selectedDay]);

  const handleEdgeNavigateDayForward = useCallback(() => {
    runDayTransition(() => {
      const nextDay = shiftLocalDay(selectedDay, 1);
      const nextFocusedHourIndex = getHourIndexForDate(nextDay);

      setSelectedDay(nextDay);
      setFocusedHourIndex(nextFocusedHourIndex);
    });
  }, [runDayTransition, selectedDay]);

  const handleOpenDayPicker = useCallback(() => {
    if (isDayTransitioningRef.current) {
      return;
    }

    setPickerDraftDay(selectedDay);
    setIsDayPickerVisible(true);
  }, [selectedDay]);

  const handleCloseDayPicker = useCallback(() => {
    setIsDayPickerVisible(false);
  }, []);

  const handlePickerDayChange = useCallback(
    (_event: DateTimePickerEvent, nextDate?: Date) => {
      if (!nextDate) {
        return;
      }

      setPickerDraftDay(getLocalDayStart(nextDate));
    },
    []
  );

  const handleApplyPickedDay = useCallback(() => {
    const nextDay = getLocalDayStart(pickerDraftDay);
    const currentDay = getLocalDayStart(selectedDay);

    setIsDayPickerVisible(false);

    if (nextDay.getTime() === currentDay.getTime()) {
      return;
    }

    runDayTransition(() => {
      const currentOffsetWithinDay = focusedHourIndex - getHourIndexForDate(selectedDay);
      const nextFocusedHourIndex = getHourIndexForDate(nextDay) + currentOffsetWithinDay;

      setSelectedDay(nextDay);
      setFocusedHourIndex(nextFocusedHourIndex);
    });
  }, [focusedHourIndex, pickerDraftDay, runDayTransition, selectedDay]);

  const handleApplyCitySort = useCallback(() => {
    setSortState({
      ...sortState,
      cityOrder: draftCityOrder,
    });
    closeSortPicker();
  }, [closeSortPicker, draftCityOrder, setSortState, sortState]);

  const focusedDateTime = useMemo(
    () => getFocusedDateTimeFromHourIndex(focusedHourIndex),
    [focusedHourIndex]
  );

  const selectedDayLabel = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const includeYear = focusedDateTime.getFullYear() !== currentYear;
    const parts = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).formatToParts(focusedDateTime);

    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const year = parts.find((part) => part.type === 'year')?.value ?? '';

    return {
      monthDay: `${month}, ${day}`,
      year: includeYear && year ? year : null,
    };
  }, [focusedDateTime, locale]);

  const renderCityRow = useCallback(
    (
      city: SelectedCity,
      options?: { drag?: () => void; isActive?: boolean; draggable?: boolean }
    ) => {
      const timezoneOffset = offsetsMap.get(city.id) || 0;
      const canDrag = Boolean(options?.draggable && sortState.cityOrder === 'none');
      const timeZoneLabel =
        timezoneOffset === 0
          ? `, ${t('common.same')}`
          : timezoneOffset > 0
            ? `, +${timezoneOffset}`
            : `, ${timezoneOffset}`;

      return (
        <Pressable
          onLongPress={canDrag ? options?.drag : undefined}
          delayLongPress={150}
          style={[styles.listItem, options?.isActive && styles.listItemDragging]}
        >
          <View style={styles.listItemHeader}>
            {isEditMode && canDrag && (
              <Pressable onPress={options?.drag} style={styles.dragHandle}>
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}

            <Text style={styles.listItemTitle} numberOfLines={1}>
              <Text style={styles.listItemTitleCity}>
                {getCityDisplayName(city, localizedCityNames[city.cityId])}
                {city.customName && (
                  <> ({getCityBaseName(city, localizedCityNames[city.cityId])})</>
                )}
              </Text>
              <Text style={styles.listItemTitleTimeOffset}>{timeZoneLabel}</Text>
            </Text>

            <Text style={styles.listItemCurrentTime} numberOfLines={1}>
              {getCurrentTimeInTimezone(city.tz, locale, timeFormat, nowDate)}
            </Text>

            {isEditMode && (
              <Pressable
                onPress={() => handleOpenDeleteCityModal(city)}
                style={styles.deleteButton}
              >
                <IconDelete fill={theme.text.warning} style={styles.deleteButtonIcon} />
              </Pressable>
            )}
          </View>

          <View style={styles.timelineRowContainer}>
            <HourStrip
              x={x}
              edgePull={edgePull}
              minX={minScrollX}
              maxX={maxScrollX}
              enabled={!dragging && !isEditMode}
              locale={locale}
              sidePad={sidePad}
              city={city}
              hourIndices={hourIndices}
              timelineWidth={timelineWidth}
              timeFormat={timeFormat}
              width={width}
              onUserInteraction={handleTimelineInteraction}
              onScrollSettled={handleTimelineScrollSettled}
              onNavigateDayBackward={() => shiftDayBy(-1)}
              onNavigateDayForward={() => shiftDayBy(1)}
              onEdgeNavigateDayBackward={handleEdgeNavigateDayBackward}
              onEdgeNavigateDayForward={handleEdgeNavigateDayForward}
            />
          </View>
        </Pressable>
      );
    },
    [
      dragging,
      handleOpenDeleteCityModal,
      handleTimelineInteraction,
      handleTimelineScrollSettled,
      hourIndices,
      isEditMode,
      locale,
      localizedCityNames,
      maxScrollX,
      minScrollX,
      nowDate,
      offsetsMap,
      shiftDayBy,
      sidePad,
      sortState.cityOrder,
      styles,
      t,
      theme.text.warning,
      timeFormat,
      timelineWidth,
      width,
      x,
    ]
  );

  const renderItem = useCallback(
    ({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => (
      <ScaleDecorator>{renderCityRow(city, { drag, isActive, draggable: true })}</ScaleDecorator>
    ),
    [renderCityRow]
  );

  const renderAddCityFooter = useCallback(() => {
    return (
      <View style={styles.addCityFooter}>
        <Pressable onPress={handleOpenAddCityModal} style={styles.addCityTile}>
          <Text style={styles.addCityTileText}>+</Text>
        </Pressable>
      </View>
    );
  }, [handleOpenAddCityModal, styles]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View style={[styles.timelineContent, { opacity: contentOpacity }]}>
        <View style={styles.referenceRow}>
          <View style={styles.referenceRowHeader}>
            <Text style={styles.referenceRowTitle} numberOfLines={1}>
              {t('common.yourTime')}
            </Text>

            <Text style={styles.referenceRowCurrentTime} numberOfLines={1}>
              {getCurrentTimeInTimezone(localTimezone, locale, timeFormat, nowDate)}
            </Text>
          </View>

          <View style={styles.timelineRowContainer}>
            <LocalReferenceStrip
              x={x}
              edgePull={edgePull}
              minX={minScrollX}
              maxX={maxScrollX}
              enabled={!dragging && !isEditMode}
              locale={locale}
              sidePad={sidePad}
              hourIndices={hourIndices}
              timelineWidth={timelineWidth}
              timeFormat={timeFormat}
              timezone={localTimezone}
              width={width}
              onUserInteraction={handleTimelineInteraction}
              onScrollSettled={handleTimelineScrollSettled}
              onNavigateDayBackward={() => shiftDayBy(-1)}
              onNavigateDayForward={() => shiftDayBy(1)}
              onEdgeNavigateDayBackward={handleEdgeNavigateDayBackward}
              onEdgeNavigateDayForward={handleEdgeNavigateDayForward}
            />
          </View>
        </View>

        <View style={styles.listContentContainer} onLayout={handleContainerLayout}>
          {selectedCities.length < 1 ? (
            <View style={styles.emptyStateContainer}>
              <Pressable onPress={handleOpenAddCityModal} style={styles.emptyStateButton}>
                <IconAddCity
                  style={styles.emptyStateButtonIcon}
                  fill={theme.surface.button.primary}
                />
                <Text style={styles.emptyStateButtonText}>{t('common.addCity')}</Text>
              </Pressable>
            </View>
          ) : sortState.cityOrder === 'none' ? (
            <DraggableFlatList
              contentContainerStyle={styles.listContent}
              data={selectedCities}
              keyExtractor={(city) => `${city.id}`}
              renderItem={renderItem}
              ListFooterComponent={renderAddCityFooter}
              onContentSizeChange={handleContentSizeChange}
              onDragBegin={() => setDragging(true)}
              onDragEnd={({ data }) => {
                reorderCities(data);
                setDragging(false);
              }}
              activationDistance={12}
              scrollEnabled={scrollEnabled && (!isEditMode || !dragging)}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              onContentSizeChange={handleContentSizeChange}
              scrollEnabled={scrollEnabled}
            >
              {displayedCities.map((city) => (
                <View key={`sorted-city-${city.id}`}>{renderCityRow(city)}</View>
              ))}
              {renderAddCityFooter()}
            </ScrollView>
          )}
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.middleMarker,
            {
              left: width / 2 - TIMELINE_CELL_WIDTH / 2,
            },
          ]}
        />
      </Animated.View>

      <View style={styles.daySelectorBar}>
        <Pressable
          style={styles.daySwitchButton}
          onPress={() => shiftDayBy(-1)}
          disabled={isDayTransitioning}
        >
          <View style={styles.daySwitchButtonBg}>
            <Arrow1
              style={[styles.daySelectorButtonIcon, styles.daySelectorButtonIconRight]}
              fill={theme.text.primary}
            />
          </View>
        </Pressable>

        <Pressable style={styles.resetButton} onPress={handleResetTimeline}>
          <View style={styles.resetButtonBg}>
            <IconReset
              style={styles.resetButtonIcon}
              fill={theme.text.primary}
            />
          </View>
        </Pressable>

        <Pressable
          style={styles.daySelectorCenter}
          onPress={handleOpenDayPicker}
          disabled={isDayTransitioning}
        >
          <Text style={styles.daySelectorWeekdayText}>
            {focusedDateTime.toLocaleDateString(locale, {
              weekday: 'long',
            })}
          </Text>
          <Text style={styles.daySelectorDateText}>{selectedDayLabel.monthDay}</Text>
          {selectedDayLabel.year && (<Text style={styles.daySelectorYearText}>{selectedDayLabel.year}</Text>)}
        </Pressable>

        <Pressable
          style={styles.selectDayButton}
          onPress={handleOpenDayPicker}
          disabled={isDayTransitioning}
        >
          <View style={styles.selectDayButtonBg}>
            <IconCalendar
              style={styles.selectDayButtonIcon}
              fill={theme.text.primary}
            />
          </View>
        </Pressable>

        <Pressable
          style={styles.daySwitchButton}
          onPress={() => shiftDayBy(1)}
          disabled={isDayTransitioning}
        >
          <View style={styles.daySwitchButtonBg}>
            <Arrow1 style={styles.daySelectorButtonIcon} fill={theme.text.primary} />
          </View>
        </Pressable>
      </View>

      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <DeleteCityModal
        visible={Boolean(cityPendingDelete)}
        cityName={
          cityPendingDelete
            ? getCityDisplayName(cityPendingDelete, localizedCityNames[cityPendingDelete.cityId])
            : t('city.fallbackName')
        }
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />

      <CitySortPickerModal
        visible={isFocused && isSortPickerVisible}
        cityOrder={draftCityOrder}
        onChangeCityOrder={setDraftCityOrder}
        onClose={closeSortPicker}
        onApply={handleApplyCitySort}
      />

      <NotificationPickerModal
        visible={isDayPickerVisible}
        title={t('timeline.chooseDay')}
        onClose={handleCloseDayPicker}
        onApply={handleApplyPickedDay}
      >
        <DateTimePicker
          value={pickerDraftDay}
          mode="date"
          display="spinner"
          onChange={handlePickerDayChange}
          style={styles.datePicker}
          textColor={theme.text.primary}
        />
      </NotificationPickerModal>
    </GestureHandlerRootView>
  );
}
