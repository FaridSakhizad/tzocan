import { useRef, useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { CitySortPickerModal } from '@/components/city-sort-picker-modal';
import { TimeRuler } from '@/features/Cities/TimeRuler';
import { TIME_REFRESH_INTERVAL_MS } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import { useScrollFit } from '@/hooks/use-scroll-fit';
import { useAppTheme } from '@/contexts/app-theme-context';
import { CityOrderMode, useNotificationsSort } from '@/contexts/notifications-sort-context';
import { useSupportModal } from '@/contexts/support-modal-context';
import { getCityBaseName, getCityDisplayName } from '@/utils/city-display';
import { sortCitiesByOrder } from '@/utils/city-sorting';
import { getTimezoneDifferenceLabel } from '@/utils/timezone-offset';
import { getRelativeDayLabelForTimezone } from '@/utils/timezone-relative-day';
import { formatInTimezone, formatPartsInTimezone } from '@/utils/abstract-timezone';
import { SupportCtaButton } from '@/components/support-cta-button';

import IconDelete1 from '@/assets/images/icon--delete-1.svg';
import IconNotification2 from '@/assets/images/icon--notification-2.svg';
import IconNotificationsMultiple from '@/assets/images/icon--notifications-multiple-1.svg';

import IconDay from '@/assets/images/icon--day.svg';
import IconNight from '@/assets/images/icon--night.svg';
import IconMorning from '@/assets/images/icon--morning.svg';
import IconEvening from '@/assets/images/icon--evening.svg';

import IconAddCity from '@/assets/images/icon--cities--outlined.svg';
import { createStyles } from './Cities.styles';

function getLocalTime(timezone: string, locale: string, timeFormat: TimeFormat, now: Date): string {
  return formatInTimezone(now, timezone, locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

type DayPhase = 'morning' | 'day' | 'evening' | 'night';

function getDayPhaseForTimezone(timezone: string, now: Date): DayPhase {
  const parts = formatPartsInTimezone(now, timezone, 'en-US', {
    hour: '2-digit',
    hour12: false,
  });

  const hour = parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10);

  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'day';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'night';
}

export default function Cities() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t, locale } = useI18n();
  const { selectedCities, reorderCities, removeCity, addCity } = useSelectedCities();
  const { timeFormat, timeOffsetMinutes, setTimeOffsetMinutes } = useSettings();
  const { isEditMode } = useEditMode();
  const { sortState, setSortState, isSortPickerVisible, closeSortPicker } = useNotificationsSort();
  const { openSupportModal } = useSupportModal();
  const isFocused = useIsFocused();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));
  const [tick, setTick] = useState(1);
  const [cityPendingDelete, setCityPendingDelete] = useState<SelectedCity | null>(null);
  const [isAddCityModalVisible, setIsAddCityModalVisible] = useState(false);
  const [draftCityOrder, setDraftCityOrder] = useState<CityOrderMode>(sortState.cityOrder);
  const {
    scrollEnabled,
    handleContainerLayout,
    handleContentSizeChange,
  } = useScrollFit();
  const deleteButtonsOpacity = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;
  const dragHandleReveal = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;
  const dragHandleTranslateX = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  const dragHandleWidth = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 32],
  });
  const dragHandleOpacity = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    if (!isFocused || selectedCities.length === 0) {
      return;
    }

    setTick((t) => t * -1);

    const interval = setInterval(() => {
      setTick((t) => t * -1);
    }, TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isFocused, selectedCities.length]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(deleteButtonsOpacity, {
        toValue: isEditMode ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dragHandleReveal, {
        toValue: isEditMode ? 1 : 0,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start();
  }, [deleteButtonsOpacity, dragHandleReveal, isEditMode]);

  useEffect(() => {
    if (isSortPickerVisible && isFocused) {
      setDraftCityOrder(sortState.cityOrder);
    }
  }, [isFocused, isSortPickerVisible, sortState.cityOrder]);

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

  const referenceNow = useMemo(
    () => new Date(Date.now() + timeOffsetMinutes * 60 * 1000),
    [tick, timeOffsetMinutes]
  );

  const handleEditCity = (city: SelectedCity) => {
    if (!isEditMode) {
      router.replace({ pathname: '/edit-city', params: { cityId: city.id.toString() } });
    }
  };

  const handleOpenDeleteCityModal = (city: SelectedCity) => {
    setCityPendingDelete(city);
  };

  const handleCloseDeleteCityModal = () => {
    setCityPendingDelete(null);
  };

  const handleConfirmDeleteCity = () => {
    if (!cityPendingDelete) {
      return;
    }

    removeCity(cityPendingDelete.id);
    setCityPendingDelete(null);
  };

  const handleOpenAddCityModal = () => {
    setIsAddCityModalVisible(true);
  };

  const handleCloseAddCityModal = () => {
    setIsAddCityModalVisible(false);
  };

  const handleSaveCity = (city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  };

  const renderAddCityButton = () => {
    return (
      <Pressable onPress={handleOpenAddCityModal} style={styles.addCityFooterButton}>
        <Text style={styles.addCityFooterText}>{t('common.addCity')}</Text>
      </Pressable>
    );
  };

  const renderCityItem = (
    city: SelectedCity,
    index: number,
    options?: { drag?: () => void; isActive?: boolean; draggable?: boolean }
  ) => {
    const isActive = options?.isActive;
    const canDrag = Boolean(options?.draggable && sortState.cityOrder === 'none');
    const dayPhase = getDayPhaseForTimezone(city.tz, referenceNow);

    const relativeDayLabel = getRelativeDayLabelForTimezone(city.tz, t, referenceNow, new Date());

    const TimePeriodIcon =
      dayPhase === 'morning'
        ? IconMorning
        : dayPhase === 'day'
          ? IconDay
          : dayPhase === 'evening'
            ? IconEvening
            : IconNight;

    return (
      <Pressable
        onPress={() => handleEditCity(city)}
        onLongPress={canDrag ? options?.drag : undefined}
        disabled={isActive}
        style={[
          styles.cityItem,
          ((1 + index) === displayedCities.length) && styles.cityItemLast,
          isActive && styles.cityItemDragging
        ]}
      >
        <View style={styles.cityRow}>
          <Animated.View
            pointerEvents={isEditMode && canDrag ? 'auto' : 'none'}
            style={[
              styles.dragHandleReveal,
              {
                width: dragHandleWidth,
                opacity: dragHandleOpacity,
                transform: [{ translateX: dragHandleTranslateX }],
              },
            ]}
          >
            <Pressable
              onPressIn={isEditMode && canDrag ? options?.drag : undefined}
              disabled={!isEditMode || !canDrag}
              style={styles.dragHandle}
            >
              <Text style={styles.dragHandleText}>☰</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.cityItemTimePeriodIcon}>
            <TimePeriodIcon
              style={styles.cityItemTimePeriodIconSvg}
              fill={theme.text.primary}
            />
          </View>
          <View style={styles.cityInfo}>
            <Text style={styles.cityName}>
              {getCityDisplayName(city, localizedCityNames[city.cityId])}
            </Text>

            {city.customName && (
              <Text style={styles.cityOriginalName}>{getCityBaseName(city, localizedCityNames[city.cityId])}</Text>
            )}

            <View style={styles.cityMeta}>
              <Text style={styles.cityTimezone}>
                {getTimezoneDifferenceLabel(city.tz, t('common.same'), referenceNow)}
              </Text>
              {city.notifications && city.notifications.length > 0 && (
                <View style={styles.cityNotifications}>
                  {city.notifications.length === 1 && (
                    <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                  )}
                  {city.notifications.length === 2 && (
                    <>
                      <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                      <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                    </>
                  )}
                  {city.notifications.length > 2 && (
                    <>
                      <IconNotificationsMultiple style={styles.cityMultipleNotificationsIcon} fill={theme.text.primary} /><Text style={styles.cityNotificationCount}>({city.notifications.length})</Text>
                    </>
                  )}
                </View>
              )}
              {!!relativeDayLabel && (
                <Text style={styles.cityRelativeDayLabel}>{relativeDayLabel}</Text>
              )}
            </View>
          </View>
          <Text style={styles.cityTime}>
            {getLocalTime(city.tz, locale, timeFormat, referenceNow)}
          </Text>
          <Animated.View
            pointerEvents={isEditMode ? 'auto' : 'none'}
            style={[styles.deleteButtonBox, { opacity: deleteButtonsOpacity }]}
          >
            <Pressable
              onPress={isEditMode ? () => handleOpenDeleteCityModal(city) : undefined}
              disabled={!isEditMode}
              style={styles.deleteButton}
            >
              <IconDelete1
                style={styles.deleteButtonIcon}
                fill={theme.surface.card}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item: city, drag, isActive, getIndex }: RenderItemParams<SelectedCity>) => {
    const index = getIndex() || 0;

    return (
      <ScaleDecorator>
        {renderCityItem(city, index, { drag, isActive, draggable: true })}
      </ScaleDecorator>
    );
  };

  const handleApplyCitySort = () => {
    setSortState({
      ...sortState,
      cityOrder: draftCityOrder,
    });
    closeSortPicker();
  };

  return (
    <GestureHandlerRootView style={{flex: 1 }}>
      <View style={styles.supportButtonRow}>
        <SupportCtaButton onPress={openSupportModal} />
      </View>

      <View style={styles.mainView}>
        {selectedCities.length === 0 ? (
          <View style={styles.emptyState}>
            <Pressable
              onPress={handleOpenAddCityModal}
              style={styles.emptyStateButton}
            >
              <IconAddCity style={styles.emptyStateButtonIcon} fill={theme.surface.button.primary} />
              <Text style={styles.emptyStateButtonText}>{t('common.addCity')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer} onLayout={handleContainerLayout}>
            {sortState.cityOrder === 'none' ? (
              <DraggableFlatList
                style={styles.citiesList}
                data={selectedCities}
                onDragEnd={({data}) => reorderCities(data)}
                keyExtractor={(item) => `city-${item.id}`}
                renderItem={renderItem}
                ListFooterComponent={renderAddCityButton}
                onContentSizeChange={handleContentSizeChange}
                scrollEnabled={scrollEnabled}
              />
            ) : (
              <ScrollView
                style={styles.citiesList}
                onContentSizeChange={handleContentSizeChange}
                scrollEnabled={scrollEnabled}
              >
                {displayedCities.map((city, index) => (
                  <View key={`sorted-city-${city.id}`}>
                    {renderCityItem(city, index)}
                  </View>
                ))}
                {renderAddCityButton()}
              </ScrollView>
            )}
          </View>
        )}
        <View
          pointerEvents={isEditMode ? 'none' : 'auto'}
          style={isEditMode ? styles.timeRulerDisabled : undefined}
        >
          <TimeRuler
            offsetMinutes={timeOffsetMinutes}
            onOffsetChange={setTimeOffsetMinutes}
            timeFormat={timeFormat}
            isActive={isFocused}
          />
        </View>

        <DeleteCityModal
          visible={Boolean(cityPendingDelete)}
          cityName={cityPendingDelete ? getCityDisplayName(cityPendingDelete, localizedCityNames[cityPendingDelete.cityId]) : t('city.fallbackName')}
          onClose={handleCloseDeleteCityModal}
          onConfirm={handleConfirmDeleteCity}
        />

        <AddCityModal
          visible={isAddCityModalVisible}
          onClose={handleCloseAddCityModal}
          onSave={handleSaveCity}
        />

        <CitySortPickerModal
          visible={isFocused && isSortPickerVisible}
          cityOrder={draftCityOrder}
          onChangeCityOrder={setDraftCityOrder}
          onClose={closeSortPicker}
          onApply={handleApplyCitySort}
        />
      </View>
    </GestureHandlerRootView>
  );
}
