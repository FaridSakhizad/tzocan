import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSelectedCities, CityNotification } from '@/contexts/selected-cities-context';

export default function EditCity() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { selectedCities, updateCityName, addNotification, updateNotification, removeNotification, toggleNotification } = useSelectedCities();

  const city = selectedCities.find(c => c.id === Number(cityId));

  const [editName, setEditName] = useState(city?.customName || '');
  const [notificationDate, setNotificationDate] = useState(() => new Date());
  const [notificationTime, setNotificationTime] = useState(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'type' | 'date' | 'time'>('type');
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [isDaily, setIsDaily] = useState(false);

  useEffect(() => {
    if (city) {
      setEditName(city.customName || '');
    }
  }, [city?.customName]);

  if (!city) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.errorText}>City not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleNameChange = (text: string) => {
    setEditName(text);
    updateCityName(city.id, text.trim());
  };

  const handleSaveNotification = async () => {
    const hour = notificationTime.getHours();
    const minute = notificationTime.getMinutes();

    const year = isDaily ? undefined : notificationDate.getFullYear();
    const month = isDaily ? undefined : notificationDate.getMonth() + 1;
    const day = isDaily ? undefined : notificationDate.getDate();

    if (editingNotificationId) {
      await updateNotification(city.id, editingNotificationId, hour, minute, year, month, day);
    } else {
      await addNotification(city.id, hour, minute, year, month, day);
    }

    setShowDateTimePicker(false);
    setPickerMode('type');
    setEditingNotificationId(null);
    setIsDaily(false);
    setNotificationDate(new Date());
    const defaultTime = new Date();
    defaultTime.setHours(12, 0, 0, 0);
    setNotificationTime(defaultTime);
  };

  const handleEditNotification = (notification: CityNotification) => {
    const notificationIsDaily = notification.isDaily || !notification.year || !notification.month || !notification.day;
    setIsDaily(notificationIsDaily);

    if (!notificationIsDaily && notification.year && notification.month && notification.day) {
      const date = new Date(notification.year, notification.month - 1, notification.day);
      setNotificationDate(date);
    } else {
      setNotificationDate(new Date());
    }

    const time = new Date();
    time.setHours(notification.hour, notification.minute, 0, 0);
    setNotificationTime(time);

    setEditingNotificationId(notification.id);
    setPickerMode(notificationIsDaily ? 'time' : 'date');
    setShowDateTimePicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setNotificationDate(selectedDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setNotificationTime(selectedDate);
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    await removeNotification(city.id, notificationId);
  };

  const handleToggleNotification = async (notificationId: string, enabled: boolean) => {
    await toggleNotification(city.id, notificationId, enabled);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Custom Name</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={city.name || 'Enter custom name...'}
            placeholderTextColor="#7a7b92"
            value={editName}
            onChangeText={handleNameChange}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {editName.length > 0 && (
            <Pressable style={styles.clearButton} onPress={() => handleNameChange('')}>
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.hint}>
          Leave empty to use original name: {city.name}
        </Text>

        <View style={styles.notificationsSection}>
          <Text style={styles.notificationsSectionTitle}>Notifications</Text>
          <Text style={styles.notificationsSectionHint}>
            Get notified when it's a specific time in {city.customName || city.name}
          </Text>

          {city.notifications && city.notifications.length > 0 && (
            <View style={styles.notificationsList}>
              {city.notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationDateTime}>
                    <Text style={styles.notificationDate}>
                      {notification.isDaily || !notification.day
                        ? 'Daily'
                        : `${notification.day?.toString().padStart(2, '0')}/${notification.month?.toString().padStart(2, '0')}/${notification.year}`}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {notification.hour.toString().padStart(2, '0')}:{notification.minute.toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.notificationActions}>
                    <Switch
                      value={notification.enabled}
                      onValueChange={(value) => handleToggleNotification(notification.id, value)}
                      trackColor={{ false: '#3e3f56', true: '#4CAF50' }}
                      thumbColor={notification.enabled ? '#fff' : '#9a9bb2'}
                    />
                    <Pressable
                      onPress={() => handleEditNotification(notification)}
                      style={styles.editNotificationButton}
                    >
                      <Text style={styles.editNotificationText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveNotification(notification.id)}
                      style={styles.deleteNotificationButton}
                    >
                      <Text style={styles.deleteNotificationText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addNotificationContainer}>
            {!showDateTimePicker ? (
              <Pressable style={styles.showPickerButton} onPress={() => setShowDateTimePicker(true)}>
                <Text style={styles.showPickerButtonText}>+ Add Notification</Text>
              </Pressable>
            ) : (
              <View>
                <Text style={styles.pickerTitle}>
                  {editingNotificationId ? 'Edit Notification' : 'New Notification'}
                </Text>
                {pickerMode === 'type' ? (
                  <>
                    <Text style={styles.addNotificationLabel}>Select notification type:</Text>
                    <View style={styles.typeButtons}>
                      <Pressable
                        style={[styles.typeButton, isDaily && styles.typeButtonActive]}
                        onPress={() => setIsDaily(true)}
                      >
                        <Text style={[styles.typeButtonText, isDaily && styles.typeButtonTextActive]}>Daily</Text>
                        <Text style={styles.typeButtonHint}>Repeats every day</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.typeButton, !isDaily && styles.typeButtonActive]}
                        onPress={() => setIsDaily(false)}
                      >
                        <Text style={[styles.typeButtonText, !isDaily && styles.typeButtonTextActive]}>One-time</Text>
                        <Text style={styles.typeButtonHint}>Specific date</Text>
                      </Pressable>
                    </View>
                    <View style={styles.pickerButtons}>
                      <Pressable style={styles.cancelPickerButton} onPress={() => {
                        setShowDateTimePicker(false);
                        setEditingNotificationId(null);
                        setIsDaily(false);
                      }}>
                        <Text style={styles.cancelPickerButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable style={styles.confirmPickerButton} onPress={() => setPickerMode(isDaily ? 'time' : 'date')}>
                        <Text style={styles.confirmPickerButtonText}>Next</Text>
                      </Pressable>
                    </View>
                  </>
                ) : pickerMode === 'date' ? (
                  <>
                    <Text style={styles.addNotificationLabel}>Select date:</Text>
                    <DateTimePicker
                      value={notificationDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      style={styles.datePicker}
                      textColor="#fff"
                      minimumDate={new Date()}
                    />
                    <View style={styles.pickerButtons}>
                      <Pressable style={styles.cancelPickerButton} onPress={() => setPickerMode('type')}>
                        <Text style={styles.cancelPickerButtonText}>Back</Text>
                      </Pressable>
                      <Pressable style={styles.confirmPickerButton} onPress={() => setPickerMode('time')}>
                        <Text style={styles.confirmPickerButtonText}>Next</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.addNotificationLabel}>
                      {isDaily
                        ? 'Select time (daily):'
                        : `Select time for ${notificationDate.getDate()}/${notificationDate.getMonth() + 1}/${notificationDate.getFullYear()}:`}
                    </Text>
                    <DateTimePicker
                      value={notificationTime}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.timePicker}
                      textColor="#fff"
                    />
                    <View style={styles.pickerButtons}>
                      <Pressable style={styles.cancelPickerButton} onPress={() => setPickerMode(isDaily ? 'type' : 'date')}>
                        <Text style={styles.cancelPickerButtonText}>Back</Text>
                      </Pressable>
                      <Pressable style={styles.confirmPickerButton} onPress={handleSaveNotification}>
                        <Text style={styles.confirmPickerButtonText}>{editingNotificationId ? 'Save' : 'Add'}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#9a9bb2',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#5a5b73',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9a9bb2',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#7a7b92',
    marginTop: 8,
    marginBottom: 24,
  },
  notificationsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  notificationsSectionHint: {
    fontSize: 12,
    color: '#7a7b92',
    marginBottom: 16,
  },
  notificationsList: {
    marginBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationDateTime: {
    flexDirection: 'column',
  },
  notificationDate: {
    fontSize: 14,
    color: '#9a9bb2',
  },
  notificationTime: {
    fontSize: 24,
    fontWeight: '300',
    color: '#fff',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editNotificationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 6,
  },
  editNotificationText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteNotificationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: 6,
  },
  deleteNotificationText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  addNotificationContainer: {
    marginTop: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  addNotificationLabel: {
    fontSize: 14,
    color: '#9a9bb2',
    marginBottom: 8,
  },
  showPickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  showPickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  datePicker: {
    height: 150,
    marginBottom: 12,
  },
  timePicker: {
    height: 150,
    marginBottom: 12,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelPickerButton: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelPickerButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmPickerButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmPickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  typeButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  typeButtonHint: {
    color: '#7a7b92',
    fontSize: 12,
    marginTop: 4,
  },
});
