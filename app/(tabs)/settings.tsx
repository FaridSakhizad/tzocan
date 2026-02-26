import { Text, View, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/settings-context';

export default function Settings() {
  const { timeFormat, setTimeFormat } = useSettings();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>24-hour format</Text>
            <Text style={styles.settingHint}>
              {timeFormat === '24h' ? 'Using 24-hour format (e.g., 14:30)' : 'Using 12-hour format (e.g., 2:30 PM)'}
            </Text>
          </View>
          <Switch
            value={timeFormat === '24h'}
            onValueChange={(value) => setTimeFormat(value ? '24h' : '12h')}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor="white"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingHint: {
    fontSize: 13,
    color: '#9a9bb2',
    marginTop: 4,
  },
});
