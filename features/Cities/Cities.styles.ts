import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    mainView: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: theme.surface.transparent,
    },
    listContainer: {
      flex: 1,
    },
    supportButtonRow: {},
    citiesList: {
      paddingHorizontal: 20,
      paddingVertical: 0,
    },
    timeRulerDisabled: {
      opacity: 0.6,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateButton: {
      alignItems: 'center',
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
    addCityFooterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 18,
      marginTop: 2,
      marginBottom: 12,
      borderTopWidth: 1,
      borderColor: theme.surface.fieldStrong,
    },
    addCityFooterIconBox: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    addCityFooterIcon: {
      width: 18,
      height: 18,
    },
    addCityFooterText: {
      fontSize: 16,
      color: theme.text.primary,
    },
    cityItem: {
      paddingVertical: 16,
      paddingHorizontal: 2,
      borderRadius: 5,
      backgroundColor: theme.surface.transparent,
      borderBottomWidth: 1,
      borderBottomColor: theme.surface.fieldStrong,
    },
    cityItemLast: {
      borderBottomColor: theme.border.transparent,
    },
    cityItemDragging: {
      backgroundColor: theme.surface.elevatedMuted,
      borderBottomColor: theme.border.transparent,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 1,
    },
    cityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    },
    deleteButtonBox: {
      position: 'absolute',
      top: 'auto',
      bottom: 'auto',
      right: 0,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.overlay.medium,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.surface.button.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonIcon: {
      width: 14,
      height: 14,
      color: theme.text.onLight,
    },
    cityInfo: {
      flex: 1,
    },
    cityItemTimePeriodIcon: {
      width: 20,
      height: 20,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cityItemTimePeriodIconSvg: {
      width: 18,
      height: 18,
    },
    cityName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text.primary,
    },
    cityOriginalName: {
      fontSize: 16,
      color: theme.text.primary,
      marginTop: 2,
    },
    cityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    cityTimezone: {
      fontSize: 14,
      color: theme.text.primary,
    },
    cityNotifications: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cityRelativeDayLabel: {
      backgroundColor: theme.surface.button.primary,
      borderRadius: 65536,
      minHeight: 14,
      lineHeight: 14,
      fontSize: 10,
      color: theme.text.onLight,
      paddingHorizontal: 5,
      marginTop: -2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cityNotificationIcon: {
      width: 13,
      height: 13,
    },
    cityMultipleNotificationsIcon: {
      width: 19,
      height: 13,
    },
    cityNotificationCount: {
      fontSize: 14,
      color: theme.text.primary,
      paddingLeft: 3,
    },
    cityTime: {
      fontSize: 43,
      fontWeight: '300',
      marginLeft: 12,
      color: theme.text.primary,
    },
    dragHandle: {
      paddingVertical: 8,
      paddingLeft: 4,
      paddingRight: 8,
    },
    dragHandleReveal: {
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dragHandleText: {
      fontSize: 20,
      color: theme.text.primary,
    },
  });
}
