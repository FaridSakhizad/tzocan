import type { UiTheme } from '@/constants/ui-theme.types';

import { StyleSheet } from 'react-native';

import { TIMELINE_CELL_WIDTH } from './constants';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    container: {
      flex: 1,
    },
    timelineContent: {
      flex: 1,
      position: 'relative',
      zIndex: 10,
    },
    referenceRow: {
      backgroundColor: theme.surface.elevatedMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.muted,
      paddingBottom: 10,
      paddingTop: 3,
      position: 'relative',
      zIndex: 100,
    },
    referenceRowHeader: {
      paddingHorizontal: 22,
      paddingBottom: 3,
      flexDirection: 'row',
      alignItems: 'center',
    },
    referenceRowTitle: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text.primary,
    },
    referenceRowCurrentTime: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.text.primary,
      textAlign: 'right',
    },
    listContentContainer: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 20,
      elevation: 20,
    },
    listContent: {
      position: 'relative',
      zIndex: 20,
      elevation: 20,
      paddingTop: 0,
      paddingBottom: 0
    },
    middleMarker: {
      position: 'absolute',
      zIndex: 1,
      elevation: 1,
      top: 21,
      bottom: 0,
      width: TIMELINE_CELL_WIDTH,
      backgroundColor: theme.surface.elevatedSoft,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    listItem: {
      paddingTop: 11,
    },
    listItemDragging: {
      backgroundColor: theme.surface.elevatedSoft,
    },
    listItemHeader: {
      paddingHorizontal: 22,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dragHandle: {
      marginRight: 10,
    },
    dragHandleText: {
      fontSize: 20,
      lineHeight: 20,
      color: theme.text.secondary,
    },
    deleteButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: theme.text.warning,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    deleteButtonIcon: {},
    listItemTitle: {
      flex: 1,
    },
    listItemTitleCity: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: 'bold',
      color: theme.text.primary,
    },
    listItemTitleTimeOffset: {
      fontSize: 16,
      lineHeight: 20,
      flex: 1,
      color: theme.text.primary,
    },
    listItemCurrentTime: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text.primary,
      textAlign: 'right',
    },
    timelineRowContainer: {
      position: 'relative',
    },
    resetBar: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    resetButton: {
      width: 46,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      marginRight: 'auto',
    },
    resetButtonBg: {
      width: 36,
      height: 28,
      borderRadius: 14,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.subtle,
    },
    resetButtonIcon: {
      width: 12,
      height: 12,
    },
    selectDayButton: {
      width: 46,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginLeft: 'auto',
    },
    selectDayButtonBg: {
      width: 36,
      height: 28,
      borderRadius: 14,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.subtle,
    },
    selectDayButtonIcon: {
      width: 14,
      height: 14,
    },
    daySelectorBar: {
      height: 60,
      borderTopWidth: 1,
      borderColor: theme.border.muted,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center'
    },
    daySwitchButton: {
      width: 56,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySwitchButtonBg: {
      width: 46,
      height: 28,
      borderRadius: 14,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.subtle,
    },
    daySelectorButtonIcon: {
      width: 7,
      height: 12,
    },
    daySelectorButtonIconRight: {
      transform: [{ rotate: '180deg'}],
    },
    daySelectorCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      width: 126,
    },
    daySelectorWeekdayText: {
      color: theme.text.primary,
      fontSize: 14,
      lineHeight: 18,
    },
    daySelectorDateText: {
      color: theme.text.primary,
      fontSize: 18,
      lineHeight: 18,
    },
    daySelectorYearText: {
      color: theme.text.primary,
      fontSize: 14,
      lineHeight: 18,
    },
    datePicker: {
      height: 140,
    },
  });
}
