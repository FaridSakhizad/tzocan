import { useState, useEffect, useMemo } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from "expo-sqlite";

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';
import { useDatabase } from '@/hooks/use-database';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LoadingSpinner } from '@/components/loading-spinner';

export type CityRow = {
  id: number;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  lat: number;
  lon: number;
  pop: number;
};

type SearchCityRow = CityRow & {
  localizedName?: string | null;
};

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

type AddCityModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (city: CityRow) => void;
};

export function AddCityModal({ visible, onClose, onSave }: AddCityModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { t, languageCode } = useI18n();
  const { db, error: dbError, isLoading: isDatabaseLoading } = useDatabase();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<SearchCityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCities([]);
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
        const results = await searchCitiesInDb(db as SQLite.SQLiteDatabase, query, languageCode);
        setCities(results);
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
    const { id, name, country, admin1, tz, lat, lon, pop } = city;
    Keyboard.dismiss();
    onSave({ id, name, country, admin1, tz, lat, lon, pop });
    setQuery('');
    setCities([]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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

                <TextInput
                  style={styles.input}
                  placeholder={t('addCity.searchPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                  }}
                  onBlur={() => Keyboard.dismiss()}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />

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

                {!isLoading && cities.length > 0 && (
                  <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                    {cities.map((city) => (
                      <Pressable
                        key={`${city.id}-${city.name}-${city.country}`}
                        onPress={() => handleSave(city)}
                        style={({ pressed }) => [
                          styles.cityItem,
                          pressed && styles.cityItemPressed,
                        ]}
                      >
                        <Text style={styles.cityText}>
                          {city.localizedName || city.name}, {city.country}
                        </Text>
                        {!!city.localizedName && city.localizedName !== city.name && (
                          <Text style={styles.citySecondaryText}>{city.name}</Text>
                        )}
                        <Text style={styles.cityTimezone}>{city.tz}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
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
    input: {
      borderWidth: 1,
      borderColor: theme.border.field,
      borderRadius: theme.radius.md,
      padding: 12,
      fontSize: theme.typography.control.fontSize,
      marginLeft: theme.spacing.screenX,
      marginRight: theme.spacing.screenX,
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
  });
}
