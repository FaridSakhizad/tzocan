import type { UiTheme } from '@/constants/ui-theme.types';

import { StyleSheet } from 'react-native';

import {
  DAY_SELECTOR_HEIGHT,
  TIMELINE_CELL_WIDTH
} from './constants';

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
    },
    listContentContainer: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
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
      zIndex: 10,
      elevation: 10,
      top: 0,
      bottom: DAY_SELECTOR_HEIGHT,
      width: TIMELINE_CELL_WIDTH,
      height: 3000,
      backgroundColor: theme.surface.elevatedSoft,
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
    resetButtonPressable: {
      position: 'absolute',
      bottom: -10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButton: {
      borderRadius: 10,
      width: 20,
      height: 20,
      backgroundColor: theme.surface.button.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButtonIcon: {
      width: 12,
      height: 12,
    },
    daySelectorBar: {
      height: 60,
      borderTopWidth: 1,
      borderColor: theme.border.muted,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySelector: {
      width: 256,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    daySelectorButton: {
      width: 36,
      height: 28,
      borderRadius: 14,
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
    },
    daySelectorWeekdayText: {
      color: theme.text.primary,
      fontSize: 14,
    },
    daySelectorDateText: {
      color: theme.text.primary,
      fontSize: 18,
    },
  });
}
