import { useState, useEffect, useMemo } from 'react';
import { Animated, Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from "expo-sqlite";

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';

import IconArrow from '@/assets/images/icon--arrow-1.svg';
import IconGlobe from '@/assets/images/icon--globe-1.svg';
import IconSearch from '@/assets/images/icon--search-1.svg';

import { useDatabase } from '@/hooks/use-database';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';
import { getUtcOffsetMinutesForTimezone } from '@/utils/timezone-offset';
import {
  formatGmtOffsetLabel,
  getAbstractTimezoneId,
  getFixedOffsetTimezoneForOffsetMinutes,
} from '@/utils/abstract-timezone';

export type CityRow = {
  id: number;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  lat: number;
  lon: number;
  pop: number;
  isAbstractTimezone?: boolean;
};

type SearchCityRow = CityRow & {
  localizedName?: string | null;
};

const ABSTRACT_TIMEZONE_OFFSETS_MINUTES = [
  -12 * 60,
  -11 * 60,
  -10 * 60,
  -(9 * 60 + 30),
  -9 * 60,
  -8 * 60,
  -7 * 60,
  -6 * 60,
  -5 * 60,
  -4 * 60,
  -(3 * 60 + 30),
  -3 * 60,
  -2 * 60,
  -1 * 60,
  0,
  1 * 60,
  2 * 60,
  3 * 60,
  3 * 60 + 30,
  4 * 60,
  4 * 60 + 30,
  5 * 60,
  5 * 60 + 30,
  5 * 60 + 45,
  6 * 60,
  6 * 60 + 30,
  7 * 60,
  8 * 60,
  8 * 60 + 45,
  9 * 60,
  9 * 60 + 30,
  10 * 60,
  10 * 60 + 30,
  11 * 60,
  12 * 60,
  13 * 60,
  13 * 60 + 45,
  14 * 60,
];

let cachedDistinctTimezones: string[] | null = null;
const SHOW_ABSTRACT_TIMEZONE_QUICK_BUTTONS = false;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

async function searchCitiesInDb(
  db: SQLite.SQLiteDatabase,
  prefix: string,
  languageCode: string
): Promise<SearchCityRow[]> {
  const normalizedPrefix = `${normalizeSearchText(prefix)}%`;

  return db.getAllAsync<SearchCityRow>(
    `WITH matched AS (
       SELECT id AS city_id, 1 AS match_rank
       FROM cities
       WHERE name_norm LIKE ?

       UNION ALL

       SELECT city_id, 0 AS match_rank
       FROM city_aliases
       WHERE locale = ?
         AND name_norm LIKE ?
     ),
     dedup AS (
       SELECT city_id, MIN(match_rank) AS match_rank
       FROM matched
       GROUP BY city_id
     )
     SELECT
       c.id,
       c.name,
       c.country,
       c.admin1,
       c.tz,
       c.lat,
       c.lon,
       c.pop,
       (
         SELECT alias.name
         FROM city_aliases AS alias
         WHERE alias.city_id = c.id
           AND alias.locale = ?
         ORDER BY alias.is_preferred DESC, alias.name ASC
         LIMIT 1
       ) AS localizedName
     FROM dedup AS d
     JOIN cities AS c
       ON c.id = d.city_id
     ORDER BY d.match_rank ASC, c.pop DESC, c.name ASC
     LIMIT 30`,
    [normalizedPrefix, languageCode, normalizedPrefix, languageCode]
  );
}

function parseOffsetValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, '');

  if (normalized === '0' || normalized === '+0' || normalized === '-0') {
    return 0;
  }

  const match = normalized.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, sign, hoursPart, minutesPart] = match;
  const hours = parseInt(hoursPart, 10);
  const minutes = minutesPart ? parseInt(minutesPart, 10) : 0;

  if (hours > 23 || minutes > 59) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;

  if (sign === '-') {
    return -totalMinutes;
  }

  return totalMinutes;
}

function parseRelativeOffsetQuery(query: string) {
  return parseOffsetValue(query);
}

type ParsedGmtOffsetQuery =
  | {
      kind: 'exact';
      offsetMinutes: number;
    }
  | {
      kind: 'prefix';
      sign: '+' | '-';
      hours: number;
    };

function parseGmtOffsetQuery(query: string): ParsedGmtOffsetQuery | null {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(utc|gtm)\b/, 'gmt');

  const match = normalized.match(/^gmt(?:\s+)?([+-]?\s*\d{1,2}(?::?\d{2})?)$/);

  if (!match) {
    return null;
  }

  const normalizedOffset = match[1].replace(/\s+/g, '');
  const parsedOffset = parseOffsetValue(normalizedOffset);

  if (parsedOffset === null) {
    return null;
  }

  if (normalizedOffset.includes(':')) {
    return {
      kind: 'exact',
      offsetMinutes: parsedOffset,
    };
  }

  const prefixMatch = normalizedOffset.match(/^([+-]?)(\d{1,2})$/);

  if (!prefixMatch) {
    return {
      kind: 'exact',
      offsetMinutes: parsedOffset,
    };
  }

  const [, signRaw, hoursPart] = prefixMatch;
  const sign: '+' | '-' = signRaw === '-' ? '-' : '+';
  const hours = parseInt(hoursPart, 10);

  return {
    kind: 'prefix',
    sign,
    hours,
  };
}

async function getDistinctTimezones(db: SQLite.SQLiteDatabase) {
  if (cachedDistinctTimezones) {
    return cachedDistinctTimezones;
  }

  const rows = await db.getAllAsync<{ tz: string }>(
    `SELECT DISTINCT tz
     FROM cities`
  );

  cachedDistinctTimezones = rows.map((row) => row.tz);
  return cachedDistinctTimezones;
}

async function searchCitiesByTimezones(
  db: SQLite.SQLiteDatabase,
  timezones: string[],
  languageCode: string
): Promise<SearchCityRow[]> {
  if (timezones.length === 0) {
    return [];
  }

  const placeholders = timezones.map(() => '?').join(', ');

  return db.getAllAsync<SearchCityRow>(
    `SELECT
       c.id,
       c.name,
       c.country,
       c.admin1,
       c.tz,
       c.lat,
       c.lon,
       c.pop,
       (
         SELECT alias.name
         FROM city_aliases AS alias
         WHERE alias.city_id = c.id
           AND alias.locale = ?
         ORDER BY alias.is_preferred DESC, alias.name ASC
         LIMIT 1
       ) AS localizedName
     FROM cities AS c
     WHERE c.tz IN (${placeholders})
     ORDER BY c.pop DESC, c.name ASC
     LIMIT 30`,
    [languageCode, ...timezones]
  );
}

async function searchCitiesByRelativeOffsetInDb(
  db: SQLite.SQLiteDatabase,
  offsetMinutes: number,
  languageCode: string
) {
  const now = new Date();
  const localOffsetMinutes = -now.getTimezoneOffset();
  const distinctTimezones = await getDistinctTimezones(db);
  const matchingTimezones = distinctTimezones.filter(
    (timezone) => getUtcOffsetMinutesForTimezone(timezone, now) - localOffsetMinutes === offsetMinutes
  );

  return searchCitiesByTimezones(db, matchingTimezones, languageCode);
}

async function searchCitiesByUtcOffsetsInDb(
  db: SQLite.SQLiteDatabase,
  offsetMinutesList: number[],
  languageCode: string
) {
  const now = new Date();
  const distinctTimezones = await getDistinctTimezones(db);
  const matchingTimezones = distinctTimezones.filter(
    (timezone) => offsetMinutesList.includes(getUtcOffsetMinutesForTimezone(timezone, now))
  );

  return searchCitiesByTimezones(db, matchingTimezones, languageCode);
}

function createAbstractTimezoneRow(offsetMinutes: number): SearchCityRow | null {
  const timezone = getFixedOffsetTimezoneForOffsetMinutes(offsetMinutes);

  if (!timezone) {
    return null;
  }

  return {
    id: getAbstractTimezoneId(offsetMinutes),
    name: formatGmtOffsetLabel(offsetMinutes),
    country: '',
    admin1: null,
    tz: timezone,
    lat: 0,
    lon: 0,
    pop: 0,
    isAbstractTimezone: true,
  };
}

function getMatchingAbstractTimezoneRowsForGmtQuery(parsedQuery: ParsedGmtOffsetQuery) {
  if (parsedQuery.kind === 'exact') {
    const row = createAbstractTimezoneRow(parsedQuery.offsetMinutes);
    return row ? [row] : [];
  }

  return ABSTRACT_TIMEZONE_OFFSETS_MINUTES
    .filter((offsetMinutes) => {
      if (parsedQuery.sign === '+') {
        return offsetMinutes >= 0 && Math.floor(offsetMinutes / 60) === parsedQuery.hours;
      }

      return offsetMinutes < 0 && Math.floor(Math.abs(offsetMinutes) / 60) === parsedQuery.hours;
    })
    .map((offsetMinutes) => createAbstractTimezoneRow(offsetMinutes))
    .filter((city): city is SearchCityRow => city !== null);
}

type AddCityModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (city: CityRow) => void;
};

type AbstractTimezoneQuickButtonsProps = {
  fractionalTimezoneRows: SearchCityRow[];
  fullHourTimezoneRows: SearchCityRow[];
  onSelect: (city: SearchCityRow) => void;
  styles: ReturnType<typeof createStyles>;
};

function AbstractTimezoneQuickButtons({
  fractionalTimezoneRows,
  fullHourTimezoneRows,
  onSelect,
  styles,
}: AbstractTimezoneQuickButtonsProps) {
  return (
    <View style={styles.timezoneSection}>
      <View style={styles.timezoneGrid}>
        {fullHourTimezoneRows.map((city) => (
          <Pressable
            key={`abstract-timezone-${city.id}`}
            onPress={() => onSelect(city)}
            style={({ pressed }) => [
              styles.timezoneButton,
              pressed && styles.timezoneButtonPressed,
            ]}
          >
            <Text style={styles.timezoneButtonText}>{city.name.replace('GMT', '')}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fractionalTimezoneSection}>
        <Text style={styles.fractionalTimezoneSectionTitle}>Fractional GMT / UTC</Text>

        <View style={styles.fractionalTimezoneGrid}>
          {fractionalTimezoneRows.map((city) => (
            <Pressable
              key={`abstract-fractional-timezone-${city.id}`}
              onPress={() => onSelect(city)}
              style={({ pressed }) => [
                styles.fractionalTimezoneButton,
                pressed && styles.timezoneButtonPressed,
              ]}
            >
              <Text style={styles.fractionalTimezoneButtonText}>{city.name.replace('GMT', '')}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

type AbstractTimezonePickerProps = {
  searchInputFocused: boolean;
  triggerLabel: string;
  options: SearchCityRow[];
  onSelect: (city: SearchCityRow) => void;
  theme: UiTheme;
  styles: ReturnType<typeof createStyles>;
};

function AbstractTimezonePicker({
  searchInputFocused,
  triggerLabel,
  onSelect,
  options,
  theme,
  styles,
}: AbstractTimezonePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isVisuallyActive = isExpanded && !searchInputFocused;

  useEffect(() => {
    if (searchInputFocused) {
      setIsExpanded(false);
    }
  }, [searchInputFocused]);

  return (
    <View style={styles.timezonePickerSection}>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setIsExpanded((prev) => !prev);
        }}
        style={({ pressed }) => [
          styles.timezonePickerTrigger,
          pressed && styles.timezonePickerTriggerPressed,
        ]}
      >
        <IconGlobe
          fill={theme.text.primary}
          style={[
            styles.timezonePickerIcon,
            isVisuallyActive && styles.timezonePickerIconExpanded,
          ]}
        />

        <Text style={[
          styles.timezonePickerTriggerText,
          isVisuallyActive && styles.timezonePickerTriggerTextExpanded,
        ]}>{triggerLabel}</Text>

        <IconArrow
          fill={theme.text.primary}
          style={[
            styles.timezonePickerTriggerIcon,
            isVisuallyActive && styles.timezonePickerTriggerIconExpanded,
          ]}
        />
      </Pressable>

      {isExpanded && !searchInputFocused && (
        <ScrollView
          style={styles.timezonePickerListScroll}
          contentContainerStyle={styles.timezonePickerList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {options.map((city) => (
            <Pressable
              key={`timezone-option-${city.id}`}
              onPress={() => {
                setIsExpanded(false);
                onSelect(city);
              }}
              style={({ pressed }) => [
                styles.cityItem,
                styles.timezonePickerItemCard,
                pressed && styles.cityItemPressed,
              ]}
            >
              <Text style={styles.cityText}>{city.name.replace('GMT', '')}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function AddCityModal({ visible, onClose, onSave }: AddCityModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { t, languageCode } = useI18n();
  const { db, error: dbError, isLoading: isDatabaseLoading } = useDatabase();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<SearchCityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const hasActiveQuery = query.trim().length > 0;
  const isSearchInputIconActive = isSearchInputFocused || cities.length > 0;

  const { abstractTimezoneRows, fullHourTimezoneRows, fractionalTimezoneRows } = useMemo(
    () => {
      const rows = ABSTRACT_TIMEZONE_OFFSETS_MINUTES.map((offsetMinutes) =>
        createAbstractTimezoneRow(offsetMinutes)
      ).filter((city): city is SearchCityRow => city !== null);

      return {
        abstractTimezoneRows: rows,
        fullHourTimezoneRows: rows.filter((city) => !city.name.includes(':')),
        fractionalTimezoneRows: rows.filter((city) => city.name.includes(':')),
      };
    },
    []
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCities([]);
      setIsSearchInputFocused(false);
      return;
    }

    if (query.length <= 1) {
      setCities([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!db) {
        return;
      }

      setIsLoading(true);

      try {
        const gmtOffsetQuery = parseGmtOffsetQuery(query);
        const relativeOffsetQueryMinutes =
          gmtOffsetQuery === null ? parseRelativeOffsetQuery(query) : null;

        if (gmtOffsetQuery !== null) {
          const abstractTimezoneResults = getMatchingAbstractTimezoneRowsForGmtQuery(gmtOffsetQuery);
          const timezoneResults = await searchCitiesByUtcOffsetsInDb(
            db as SQLite.SQLiteDatabase,
            abstractTimezoneResults.map((city) => parseOffsetValue(city.name.replace('GMT', '')) || 0),
            languageCode
          );

          setCities(
            [...abstractTimezoneResults, ...timezoneResults]
          );
        } else if (relativeOffsetQueryMinutes !== null) {
          const results = await searchCitiesByRelativeOffsetInDb(
            db as SQLite.SQLiteDatabase,
            relativeOffsetQueryMinutes,
            languageCode
          );
          setCities(results);
        } else {
          const results = await searchCitiesInDb(
            db as SQLite.SQLiteDatabase,
            query,
            languageCode
          );
          setCities(results);
        }
      } catch (error) {
        console.error('Failed to search cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, visible, db, languageCode]);

  const handleSave = (city: SearchCityRow) => {
    const { id, name, country, admin1, tz, lat, lon, pop, isAbstractTimezone } = city;
    Keyboard.dismiss();
    onSave({ id, name, country, admin1, tz, lat, lon, pop, isAbstractTimezone });
    setQuery('');
    setCities([]);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backgroundImage, { opacity }]}>
        <ImageBackground
          source={theme.image.modalBackgroundSource}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.modalBg}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View
                style={[
                  styles.safeArea,
                  {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                  },
                ]}
              >
                <View style={styles.modalContent}>
                  <View style={styles.header}>
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                      <IconCancelOutlined
                        fill={theme.text.primary}
                      />
                    </Pressable>

                    <Text style={styles.title}>{t('common.addCity')}</Text>

                    <View style={styles.confirmButtonPlaceholder}>
                      <IconConfirmOutlined
                        fill={theme.text.placeholder}
                      />
                    </View>
                  </View>

                  <View style={styles.searchInputBox}>
                    <IconSearch
                      fill={theme.text.primary}
                      style={[
                        styles.searchInputIcon,
                        isSearchInputIconActive && styles.searchInputIconActive,
                      ]}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={t('addCity.searchPlaceholder')}
                      placeholderTextColor={theme.text.placeholder}
                      value={query}
                      onChangeText={(value) => {
                        setQuery(value);
                      }}
                      onFocus={() => {
                        setIsSearchInputFocused(true);
                      }}
                      onBlur={() => {
                        setIsSearchInputFocused(false);
                        Keyboard.dismiss();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>

                  {isLoading && (
                    <View style={styles.loadingBlock}>
                      <LoadingSpinner />
                    </View>
                  )}

                  {!isLoading && !isDatabaseLoading && !!dbError && (
                    <Text style={styles.helperText}>
                      {t('addCity.databaseUnavailable')}
                    </Text>
                  )}

                  {!isLoading && !isDatabaseLoading && !dbError && query.length > 1 && cities.length === 0 && (
                    <Text style={styles.helperText}>
                      {t('common.noResults')}
                    </Text>
                  )}

                  {!hasActiveQuery && cities.length === 0 && (
                    <>
                      {SHOW_ABSTRACT_TIMEZONE_QUICK_BUTTONS && (
                        <AbstractTimezoneQuickButtons
                          fractionalTimezoneRows={fractionalTimezoneRows}
                          fullHourTimezoneRows={fullHourTimezoneRows}
                          onSelect={handleSave}
                          styles={styles}
                        />
                      )}

                      <AbstractTimezonePicker
                        options={abstractTimezoneRows}
                        onSelect={handleSave}
                        searchInputFocused={isSearchInputFocused}
                        theme={theme}
                        triggerLabel={t('addCity.chooseTimezone')}
                        styles={styles}
                      />
                    </>
                  )}

                  {!isLoading && (
                    <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                      {cities.length > 0 && cities.map((city) => (
                        <Pressable
                          key={`${city.id}-${city.name}-${city.country}`}
                          onPress={() => handleSave(city)}
                          style={({ pressed }) => [
                            styles.cityItem,
                            pressed && styles.cityItemPressed,
                          ]}
                        >
                          <Text style={styles.cityText}>
                            {city.localizedName || city.name}
                            {!!city.country && `, ${city.country}`}
                          </Text>
                          {!city.isAbstractTimezone && !!city.localizedName && city.localizedName !== city.name && (
                            <Text style={styles.citySecondaryText}>{city.name}</Text>
                          )}
                          {!city.isAbstractTimezone && (
                            <Text style={styles.cityTimezone}>{city.tz}</Text>
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ImageBackground>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    safeArea: {
      flex: 1,
    },
    modalBg: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    modalContent: {
      minHeight: '100%',
      maxHeight: '100%',
    },
    header: {
      paddingHorizontal: 23,
      paddingTop: 10,
      paddingBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 16,
      color: theme.text.primary,
    },
    cancelButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButton: {
      width: 50,
      height: 50,
    },
    confirmButtonPlaceholder: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchInputBox: {
      position: 'relative',
      marginLeft: theme.spacing.screenX,
      marginRight: theme.spacing.screenX,
    },
    searchInputIcon: {
      position: 'absolute',
      left: 13,
      top: 15,
      bottom: 0,
      width: 16,
      height: 16,
      opacity: 0.44
    },
    searchInputIconActive: {
      opacity: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border.field,
      borderRadius: theme.radius.md,
      padding: 12,
      paddingLeft: 34,
      fontSize: theme.typography.control.fontSize,
      marginBottom: 16,
      backgroundColor: theme.surface.field,
      color: theme.text.primary,
    },
    loadingBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    helperText: {
      marginHorizontal: theme.spacing.screenX,
      marginBottom: 12,
      color: theme.text.helper,
      textAlign: 'center',
    },
    resultsList: {
      flex: 1,
      paddingHorizontal: theme.spacing.screenX,
    },
    cityItem: {
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      marginBottom: 6,
    },
    cityItemPressed: {
      backgroundColor: theme.overlay.strong,
    },
    cityText: {
      fontSize: theme.typography.control.fontSize,
      lineHeight: 16,
      color: theme.text.primary,
      marginBottom: 1,
    },
    citySecondaryText: {
      fontSize: 13,
      lineHeight: 15,
      color: theme.text.secondary,
      marginBottom: 2,
    },
    cityTimezone: {
      fontSize: 13,
      lineHeight: 13,
      color: theme.text.secondary,
    },
    timezoneSection: {
      paddingTop: 14,
      paddingBottom: 20,
      display: 'flex',
    },
    timezonePickerSection: {
      paddingTop: 14,
      paddingBottom: 20,
      marginLeft: theme.spacing.screenX,
      marginRight: theme.spacing.screenX,
    },
    timezonePickerTrigger: {
      borderWidth: 1,
      borderColor: theme.border.field,
      borderRadius: theme.radius.md,
      padding: 12,
      fontSize: theme.typography.control.fontSize,
      marginBottom: 6,
      backgroundColor: theme.surface.field,
      color: theme.text.primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    timezonePickerTriggerPressed: {
      backgroundColor: theme.overlay.medium,
    },
    timezonePickerTriggerText: {
      fontSize: theme.typography.control.fontSize,
      color: theme.text.primary,
      opacity: 0.44
    },
    timezonePickerTriggerTextExpanded: {
      opacity: 1
    },
    timezonePickerIcon: {
      marginRight: 6,
      opacity: 0.44
    },
    timezonePickerIconExpanded: {
      opacity: 1,
    },
    timezonePickerTriggerIcon: {
      marginLeft: 'auto',
      marginRight: 4,
      opacity: 0.44,
      transform: [{ rotate: '90deg' }],
    },
    timezonePickerTriggerIconExpanded: {
      transform: [{ rotate: '-90deg' }],
      opacity: 1,
    },
    timezonePickerList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      columnGap: '2%',
      rowGap: 6,
      paddingBottom: 2,
    },
    timezonePickerItemCard: {
      alignItems: 'center',
      width: '23.5%',
      fontSize: 13,
      paddingLeft: 9,
      paddingBottom: 9,
      marginBottom: 0,
    },
    timezonePickerListScroll: {
      marginTop: 8,
    },
    timezoneGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      columnGap: '2%',
      rowGap: 8,
    },
    fractionalTimezoneSection: {
      paddingTop: 18,
    },
    fractionalTimezoneSectionTitle: {
      fontSize: 13,
      lineHeight: 16,
      color: theme.text.helper,
      textAlign: 'center',
      marginBottom: 12,
    },
    fractionalTimezoneGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      columnGap: '2%',
      rowGap: 8,
    },
    timezoneButton: {
      width: '15%',
      minHeight: 38,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    timezoneButtonPressed: {
      backgroundColor: theme.overlay.strong,
    },
    timezoneButtonText: {
      fontSize: 13,
      lineHeight: 16,
      color: theme.text.primary,
      textAlign: 'center',
    },
    fractionalTimezoneButton: {
      width: '15%',
      minHeight: 38,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    fractionalTimezoneButtonText: {
      fontSize: 13,
      lineHeight: 16,
      color: theme.text.primary,
      textAlign: 'center',
    },
  });
}
