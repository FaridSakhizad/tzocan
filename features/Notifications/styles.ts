import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    listContent: {},
    timeSortedList: {
      flex: 1,
    },
    timeSortedListContent: {
      paddingBottom: 12,
    },
    sortPickerContent: {
      padding: 20,
      gap: 20,
    },
    sortPickerSectionSeparator: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    sortPickerSection: {
      gap: 14,
    },
    sortPickerAnimatedSection: {
      overflow: 'hidden'
    },
    sortPickerSectionTitle: {
      color: theme.text.primary,
      fontSize: 13,
      lineHeight: 15,
      textAlign: 'center',
    },
    sortPickerItem: {
      maxWidth: 280,
      minHeight: 30,
      borderRadius: 15,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: 'rgba(62, 63, 86, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortPickerItemActive: {
      backgroundColor: 'rgba(62, 63, 86, 0.3)',
    },
    sortPickerItemText: {
      textAlign: 'center',
      color: theme.text.primary,
      fontSize: 14,
      lineHeight: 18,
    },
    sortPickerItemTextActive: {
      fontWeight: 'bold',
    },
    helperButtonRow: {
      paddingTop: 6,
      paddingLeft: 16,
    },
    helperButton: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.button.primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    helperButtonText: {
      color: theme.text.onLight,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateButton: {
      alignItems: 'center',
    },
    emptyStateButtonDisabled: {
      opacity: 0.5,
    },
    emptyStateButtonIcon: {
      width: 20,
      height: 20,
      marginBottom: 20,
    },
    emptyStateButtonText: {
      fontSize: 16,
      color: theme.text.primary,
    },
    cityGroup: {
      borderBottomColor: theme.surface.button.subtleStrong,
      borderBottomWidth: 2,
    },
    cityGroupDragging: {
      backgroundColor: theme.surface.cardStrong,
    },
    cityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 17,
      backgroundColor: theme.surface.cardSoft,
      marginBottom: 1,
    },
    dragHandle: {
      padding: 4,
      marginRight: 8,
    },
    dragHandleText: {
      fontSize: 18,
      color: theme.text.primary,
    },
    cityName: {
      flex: 1,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: 'bold',
      color: theme.text.primary,
      paddingHorizontal: 2,
    },
    cityHeaderTime: {
      fontSize: 20,
      lineHeight: 26,
      color: theme.text.primary,
      marginLeft: 12
    },
    deleteCityButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.text.warning,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    deleteButtonIcon: {},
    notificationItem: {
      paddingTop: 17,
      paddingBottom: 22,
      paddingHorizontal: 20,
      backgroundColor: theme.surface.cardSoft,
    },
    notificationItemEven: {
      backgroundColor: theme.surface.cardAlt,
    },
    notificationDetails: {
      flexDirection: 'column',
      gap: 4,
      marginBottom: 18,
      paddingHorizontal: 2,
    },
    notificationParentCity: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '600',
      color: theme.text.secondary,
      marginBottom: 2,
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
      textDecorationLine: 'underline',
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
      gap: 5,
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
      flexDirection: 'row',
      gap: 3,
    },
    notificationLocalTimeLabel: {
      fontSize: 13,
      color: theme.text.secondary,
    },
    notificationLocalTimeText: {
      fontSize: 13,
      color: theme.text.primary,
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
      gap: 5,
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
    },
    notificationLocalDateLabel: {
      fontSize: 13,
      color: theme.text.secondary,
    },
    notificationLocalDateText: {
      fontSize: 13,
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
