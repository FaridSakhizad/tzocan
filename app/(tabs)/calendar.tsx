import { useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';

const HOUR_BLOCK_SIZE = 64;
const HOURS_RANGE = 24;

function getTimezoneOffsetHours(timezone: string): number {
  const now = new Date();

  const localParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find(p => p.type === type)?.value || '0', 10);

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

function formatHourLabel(hour: number, timeFormat: '12h' | '24h'): { label: string; period?: string } {
  if (timeFormat === '24h') {
    return { label: hour.toString().padStart(2, '0') };
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return { label: hour12.toString(), period };
}

function getHoursForCity(timezone: string, offsetMinutes: number, timeFormat: '12h' | '24h'): { hour: number; label: string; period?: string }[] {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });

  const currentHour = parseInt(formatter.format(shiftedTime), 10);
  const hours: { hour: number; label: string; period?: string }[] = [];

  for (let i = -HOURS_RANGE; i < HOURS_RANGE; i++) {
    let hour = (currentHour + i) % 24;
    if (hour < 0) hour += 24;
    const formatted = formatHourLabel(hour, timeFormat);
    hours.push({
      hour,
      label: formatted.label,
      period: formatted.period,
    });
  }

  return hours;
}

export default function Calendar() {
  const { selectedCities, reorderCities, removeCity } = useSelectedCities();
  const { timeFormat, timeOffsetMinutes } = useSettings();
  const { isEditMode } = useEditMode();
  const scrollViewRefs = useRef<Map<number, ScrollView>>(new Map());
  const isScrolling = useRef<number | null>(null);

  const { offsetsMap, maxOffset } = useMemo(() => {
    if (selectedCities.length === 0) {
      return { offsetsMap: new Map<number, number>(), maxOffset: 0 };
    }
    const offsets = selectedCities.map(city => ({
      id: city.id,
      offset: getTimezoneOffsetHours(city.tz)
    }));
    const minOffset = Math.min(0, ...offsets.map(o => o.offset));
    const map = new Map<number, number>();
    offsets.forEach(o => map.set(o.id, o.offset - minOffset));
    const max = Math.max(0, ...Array.from(map.values()));
    return { offsetsMap: map, maxOffset: max };
  }, [selectedCities]);

  const initialScrollX = HOURS_RANGE * HOUR_BLOCK_SIZE;

  const handleScroll = useCallback((cityId: number) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrolling.current !== null && isScrolling.current !== cityId) {
      return;
    }

    isScrolling.current = cityId;
    const scrollX = event.nativeEvent.contentOffset.x;

    scrollViewRefs.current.forEach((ref, id) => {
      if (id !== cityId && ref) {
        ref.scrollTo({ x: scrollX, animated: false });
      }
    });
  }, []);

  const handleScrollEnd = useCallback(() => {
    isScrolling.current = null;
  }, []);

  const setScrollViewRef = useCallback((cityId: number) => (ref: ScrollView | null) => {
    if (ref) {
      scrollViewRefs.current.set(cityId, ref);
    } else {
      scrollViewRefs.current.delete(cityId);
    }
  }, []);

  const renderItem = useCallback(({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    const timezoneOffsetHours = offsetsMap.get(city.id) || 0;
    const hours = getHoursForCity(city.tz, timeOffsetMinutes, timeFormat);
    const leadingPadding = timezoneOffsetHours * HOUR_BLOCK_SIZE;
    const trailingPadding = (maxOffset - timezoneOffsetHours) * HOUR_BLOCK_SIZE;

    return (
      <ScaleDecorator>
        <View style={[styles.cityRow, isActive && styles.cityRowDragging]}>
          <Pressable
            onLongPress={isEditMode ? drag : undefined}
            style={styles.cityHeader}
          >
            {isEditMode && (
              <Pressable onPressIn={drag} style={styles.dragHandle}>
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}
            <Text style={styles.cityName} numberOfLines={1}>
              {city.customName || city.name}
            </Text>
            {isEditMode && (
              <Pressable onPress={() => removeCity(city.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>
          <ScrollView
            ref={setScrollViewRef(city.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll(city.id)}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            contentOffset={{ x: initialScrollX, y: 0 }}
            bounces={false}
          >
            <View style={styles.hoursContainer}>
              <View style={{ width: leadingPadding }} />
              {hours.map((hourData, idx) => (
                <View key={idx} style={styles.hourBlock}>
                  <Text style={styles.hourText}>
                    {hourData.label}
                    {hourData.period && <Text style={styles.periodText}>{hourData.period}</Text>}
                  </Text>
                </View>
              ))}
              <View style={{ width: trailingPadding }} />
            </View>
          </ScrollView>
        </View>
      </ScaleDecorator>
    );
  }, [isEditMode, timeFormat, timeOffsetMinutes, offsetsMap, maxOffset, handleScroll, handleScrollEnd, setScrollViewRef, removeCity, initialScrollX]);

  if (selectedCities.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No cities added yet.</Text>
          <Text style={styles.emptyHint}>Add cities to see their time comparison.</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <DraggableFlatList
          data={selectedCities}
          onDragEnd={({ data }) => reorderCities(data)}
          keyExtractor={(item) => `calendar-city-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  emptyHint: {
    fontSize: 14,
    color: '#7a7b92',
    marginTop: 8,
  },
  cityRow: {},
  cityRowDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  dragHandleText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  hoursContainer: {
    flexDirection: 'row',
  },
  hourBlock: {
    width: HOUR_BLOCK_SIZE,
    height: HOUR_BLOCK_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  hourText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#fff',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
