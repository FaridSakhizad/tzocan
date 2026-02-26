import { useCallback } from 'react';
import { Text, View, StyleSheet, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useEditMode } from '@/contexts/edit-mode-context';

export default function Notifications() {
  const router = useRouter();
  const { selectedCities, reorderCities, removeCity, toggleNotification } = useSelectedCities();
  const { isEditMode } = useEditMode();

  const citiesWithNotifications = selectedCities.filter(
    city => city.notifications && city.notifications.length > 0
  );

  const totalNotifications = citiesWithNotifications.reduce(
    (sum, city) => sum + (city.notifications?.length || 0),
    0
  );

  const handleToggleNotification = async (cityId: number, notificationId: string, enabled: boolean) => {
    await toggleNotification(cityId, notificationId, enabled);
  };

  const handleCityPress = (cityId: number) => {
    if (!isEditMode) {
      router.push({ pathname: '/edit-city', params: { cityId: cityId.toString() } });
    }
  };

  const handleDelete = (cityId: number) => {
    removeCity(cityId);
  };

  const renderItem = useCallback(({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.cityGroup, isActive && styles.cityGroupDragging]}>
          <Pressable
            onPress={() => handleCityPress(city.id)}
            onLongPress={isEditMode ? drag : undefined}
            style={styles.cityHeader}
          >
            {isEditMode && (
              <Pressable onPressIn={drag} style={styles.dragHandle}>
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}
            <Text style={styles.cityName}>{city.customName || city.name}</Text>
            {isEditMode && (
              <Pressable onPress={() => handleDelete(city.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>

          {city.notifications?.map(notification => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTime}>
                  {notification.hour.toString().padStart(2, '0')}:{notification.minute.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.notificationDate}>
                  {notification.isDaily || !notification.day
                    ? 'Daily'
                    : `${notification.day?.toString().padStart(2, '0')}/${notification.month?.toString().padStart(2, '0')}/${notification.year}`}
                </Text>
              </View>
              <Switch
                value={notification.enabled}
                onValueChange={(value) => handleToggleNotification(city.id, notification.id, value)}
                trackColor={{ false: '#3e3f56', true: '#4CAF50' }}
                thumbColor={notification.enabled ? '#fff' : '#9a9bb2'}
              />
            </View>
          ))}
        </View>
      </ScaleDecorator>
    );
  }, [isEditMode]);

  if (totalNotifications === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notifications yet</Text>
          <Text style={styles.emptyStateHint}>
            Tap on a city to add notifications
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <DraggableFlatList
          data={citiesWithNotifications}
          onDragEnd={({ data }) => {
            // Merge reordered cities with notifications back into full list
            const citiesWithoutNotifications = selectedCities.filter(
              city => !city.notifications || city.notifications.length === 0
            );
            reorderCities([...data, ...citiesWithoutNotifications]);
          }}
          keyExtractor={(item) => `notification-city-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#7a7b92',
    marginTop: 8,
  },
  cityGroup: {
    marginBottom: 24,
  },
  cityGroupDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0.5)',
    borderRadius: 8,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTime: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
  },
  notificationDate: {
    fontSize: 14,
    color: '#9a9bb2',
    marginTop: 2,
  },
});
