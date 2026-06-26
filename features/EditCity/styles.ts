import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    errorText: {
      fontSize: 18,
      color: theme.text.muted,
      textAlign: 'center',
      marginBottom: 16,
    },
    backButton: {
      backgroundColor: theme.surface.button.subtleStrong,
      paddingVertical: 14,
      borderRadius: theme.radius.md,
      alignItems: 'center',
    },
    backButtonText: {
      color: theme.text.primary,
      fontSize: theme.typography.control.fontSize,
      fontWeight: '600',
    },
    editCityHeader: {
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: theme.spacing.screenX,
    },
    supportButtonRow: {
      paddingBottom: 16,
    },
    cityName: {
      fontSize: 20,
      lineHeight: 30,
      fontWeight: 'bold',
      color: theme.text.primary,
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    cityCountry: {
      fontSize: 13,
      color: theme.text.primary,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    cityTimeInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    cityTimezone: {
      fontSize: 15,
      color: theme.text.primary,
      fontWeight: 'bold',
    },
    cityRelativeDayLabel: {
      backgroundColor: theme.surface.button.primary,
      borderRadius: theme.radius.pillMd,
      height: 18,
      lineHeight: 18,
      fontSize: 11,
      color: theme.text.onLight,
      paddingHorizontal: 9,
    },
    inputContainer: {
      position: 'relative',
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      height: 40,
      fontSize: 15,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.border.field,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      position: 'relative',
      zIndex: 1,
    },
    clearButton: {
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
      width: 24,
      height: 24,
      position: 'absolute',
      zIndex: 10,
      top: 8,
      right: 8,
    },
    clearButtonText: {
      color: theme.text.primary,
      fontSize: 16,
    },
    hint: {
      fontSize: 12,
      color: theme.text.helper,
      marginTop: 8,
      marginBottom: 24,
    },
    notificationsSection: {},
    notificationsSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: 4,
    },
    notificationsList: {},
    addNotificationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 18,
      marginBottom: 12,
    },
    addNotificationIconBox: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    addNotificationIcon: {
      width: 18,
      height: 18,
    },
    addNotificationButtonText: {
      fontSize: 16,
      color: theme.text.primary,
    },
    notificationItem: {
      paddingTop: 17,
      paddingBottom: 22,
      paddingHorizontal: theme.spacing.screenX,
      backgroundColor: theme.surface.cardSoft,
    },
    notificationItemEven: {
      backgroundColor: theme.surface.cardAlt,
    },
    notificationItemDisabled: {
      opacity: 0.5,
    },
    notificationDetails: {
      flexDirection: 'column',
      gap: 4,
      marginBottom: 18,
      paddingHorizontal: 2,
    },
    notificationLabel: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      color: theme.text.primary,
    },
    notificationLabelEmpty: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '300',
      color: theme.text.primary,
    },
    notificationNotes: {
      fontSize: 15,
      lineHeight: 18,
      color: theme.text.primary,
    },
    notificationUrl: {
      fontSize: 15,
      lineHeight: 18,
      color: theme.text.warning,
    },
    notificationInactiveReason: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 16,
      color: theme.text.helper,
    },
    notificationDateTime: {
      flexDirection: 'column',
      gap: 18,
      paddingHorizontal: 2,
    },
    notificationTime: {
      flexDirection: 'column',
      gap: 7,
    },
    notificationCityTime: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    notificationCityTimeIcon: {
      width: 16,
      height: 16,
    },
    notificationCityTimeText: {
      fontSize: 15,
      color: theme.text.primary,
    },
    notificationLocalTime: {
      gap: 4,
    },
    notificationLocalTimePrimaryRow: {
      flexDirection: 'row',
      gap: 3,
    },
    notificationLocalTimeLabel: {
      fontSize: 15,
      color: theme.text.secondary,
    },
    notificationLocalTimeText: {
      fontSize: 15,
      color: theme.text.primary,
    },
    notificationTimeLeftTitle: {
      fontSize: 15,
      color: theme.text.secondary,
      paddingLeft: 1,
    },
    notificationTimeLeft: {
      fontSize: 15,
      color: theme.text.primary,
      paddingLeft: 1,
    },
    notificationLocalDayShiftText: {
      fontSize: 11,
      paddingHorizontal: 7,
      height: 14,
      borderRadius: theme.radius.pillSm,
      lineHeight: 13,
      backgroundColor: theme.surface.button.primary,
      color: theme.text.onLight,
      marginBottom: -2,
      marginLeft: 7,
    },
    notificationDate: {
      flexDirection: 'column',
      gap: 7,
    },
    notificationCityDate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    notificationCityDateIcon: {
      width: 14,
      height: 14,
      margin: 1,
    },
    notificationCityDateText: {
      fontSize: 15,
      color: theme.text.primary,
    },
    notificationLocalDate: {
      flexDirection: 'row',
      gap: 3,
      alignItems: 'center'
    },
    notificationLocalDateLabel: {
      fontSize: 15,
      color: theme.text.secondary,
    },
    notificationLocalDateText: {
      fontSize: 15,
      color: theme.text.primary,
    },
    notificationLocalDateShiftText: {
      fontSize: 11,
      paddingHorizontal: 7,
      height: 14,
      borderRadius: theme.radius.pillSm,
      lineHeight: 13,
      backgroundColor: theme.surface.button.primary,
      color: theme.text.onLight,
      marginBottom: -2,
      marginLeft: 7,
    },
    notificationLocalDateShiftTextYear: {
      backgroundColor: theme.text.warning,
    },
    notificationRepeat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    notificationRepeatIcon: {
      width: 17,
      height: 15,
    },
    notificationRepeatText: {
      fontSize: 15,
      color: theme.text.primary,
    },
    notificationActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 20,
    },
    editNotificationButton: {
      width: 30,
      height: 24,
      backgroundColor: theme.surface.button.subtle,
      borderRadius: 15,
    },
    editNotificationIcon: {
      width: 12,
      height: 12,
      margin: 'auto',
    },
    toggleNotificationSwitch: {
      width: 33,
      height: 17,
      borderRadius: 9,
      backgroundColor: theme.surface.button.subtle,
      padding: 3,
    },
    toggleNotificationSwitchThumb: {
      width: 11,
      height: 11,
      backgroundColor: theme.surface.button.primary,
      borderRadius: 6,
      position: 'absolute',
      top: 3,
      left: 3,
    },
    deleteNotificationButton: {
      width: 30,
      height: 24,
      backgroundColor: theme.surface.button.subtle,
      borderRadius: 15,
    },
    deleteNotificationIcon: {
      width: 12,
      height: 12,
      margin: 'auto',
    },
  });
}
