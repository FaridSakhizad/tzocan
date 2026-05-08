import { useEffect, useMemo, useState } from 'react';
import type * as SQLite from 'expo-sqlite';

import { useDatabase } from '@/hooks/use-database';
import { useI18n } from '@/hooks/use-i18n';

type CityAliasRow = {
  city_id: number;
  name: string;
};

function areLocalizedNameMapsEqual(
  left: Record<number, string>,
  right: Record<number, string>
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[Number(key)] === right[Number(key)]);
}

export function useLocalizedCityNames(cityIds: number[]) {
  const { db } = useDatabase();
  const { languageCode } = useI18n();
  const [localizedNames, setLocalizedNames] = useState<Record<number, string>>({});

  const normalizedCityIdsKey = useMemo(
    () => Array.from(new Set(cityIds)).sort((a, b) => a - b).join(','),
    [cityIds]
  );
  const normalizedCityIds = useMemo(
    () =>
      normalizedCityIdsKey.length > 0
        ? normalizedCityIdsKey.split(',').map((value) => Number(value))
        : [],
    [normalizedCityIdsKey]
  );

  useEffect(() => {
    if (!db || normalizedCityIds.length === 0) {
      setLocalizedNames((current) =>
        Object.keys(current).length === 0 ? current : {}
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const placeholders = normalizedCityIds.map(() => '?').join(', ');
        const rows = await (db as SQLite.SQLiteDatabase).getAllAsync<CityAliasRow>(
          `SELECT city_id, name
           FROM city_aliases
           WHERE locale = ?
             AND city_id IN (${placeholders})
           ORDER BY city_id ASC, is_preferred DESC, name ASC`,
          [languageCode, ...normalizedCityIds]
        );

        if (cancelled) {
          return;
        }

        const nextMap: Record<number, string> = {};

        rows.forEach((row) => {
          if (!nextMap[row.city_id]) {
            nextMap[row.city_id] = row.name;
          }
        });

        setLocalizedNames((current) =>
          areLocalizedNameMapsEqual(current, nextMap) ? current : nextMap
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load localized city names:', error);
          setLocalizedNames((current) =>
            Object.keys(current).length === 0 ? current : {}
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, languageCode, normalizedCityIdsKey]);

  return localizedNames;
}
