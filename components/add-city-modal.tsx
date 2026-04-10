import { useState, useEffect } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useDatabase } from '@/hooks/use-database';
import * as SQLite from "expo-sqlite";

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

async function searchCitiesInDb(db: SQLite.SQLiteDatabase, prefix: string): Promise<CityRow[]> {
  const p = prefix + "%";

  return db.getAllAsync<CityRow>(
    `SELECT id, name, country, admin1, tz, lat, lon, pop
     FROM cities
     WHERE name_norm LIKE ?
     ORDER BY pop DESC
     LIMIT 30`,
    [p]
  );
}

type AddCityModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (city: CityRow) => void;
};

export function AddCityModal({ visible, onClose, onSave }: AddCityModalProps) {
  const { db } = useDatabase();
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityRow[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCities([]);
      setSelectedCity(null);
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
        const results = await searchCitiesInDb(db as SQLite.SQLiteDatabase, query);
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
  }, [query, visible, db]);

  const handleCityPress = (city: CityRow) => {
    setSelectedCity(city);
  };

  const handleSave = () => {
    if (!selectedCity) {
      return;
    }

    onSave(selectedCity);
    setQuery('');
    setCities([]);
    setSelectedCity(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Add City</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Search for a city..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {isLoading && <Text style={styles.loading}>Loading...</Text>}

          <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
            {cities.map((city) => (
              <Pressable
                key={`${city.id}-${city.name}-${city.country}`}
                onPress={() => handleCityPress(city)}
                style={({ pressed }) => [
                  styles.cityItem,
                  selectedCity?.id === city.id && styles.cityItemSelected,
                  pressed && styles.cityItemPressed,
                ]}
              >
                <Text style={styles.cityText}>{city.name}, {city.country}</Text>
                <Text style={styles.cityTimezone}>{city.tz}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.footerSecondaryButton} onPress={onClose}>
              <Text style={styles.footerSecondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerPrimaryButton, !selectedCity && styles.footerPrimaryButtonDisabled]}
              onPress={handleSave}
              disabled={!selectedCity}
            >
              <Text style={styles.footerPrimaryButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '60%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(90, 91, 115, 0.8)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(74, 75, 99, 0.8)',
    color: '#fff',
  },
  loading: {
    color: '#9a9bb2',
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4b63',
  },
  cityItemPressed: {
    backgroundColor: '#4a4b63',
  },
  cityItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  cityTimezone: {
    fontSize: 14,
    color: '#9a9bb2',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerSecondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerSecondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  footerPrimaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  footerPrimaryButtonText: {
    color: 'rgba(62, 63, 86, 1)',
    fontSize: 16,
    fontWeight: '600',
  },
});
