import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';
import { TICK_WIDTH } from '@/features/Cities/constants';

export function createStyles(theme: UiTheme, screenWidth: number) {
  return StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: theme.border.faint,
      backgroundColor: theme.surface.transparent,
    },
    resetButton: {
      width: 40,
      height: 40,
      position: 'absolute',
      top: -20,
      left: screenWidth / 2 - 20,
      zIndex: 20,
    },
    resetButtonPressable: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButtonIconBox: {
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
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      paddingBottom: 3,
      paddingHorizontal: 16,
      backgroundColor: theme.surface.transparent,
      position: 'relative',
      zIndex: 1,
      marginBottom: -38,
    },
    localTimeContainer: {
      alignItems: 'center',
    },
    sideText: {
      fontSize: 18,
      lineHeight: 22,
      color: theme.text.secondary,
      minWidth: 70,
      textAlign: 'center',
      fontWeight: '300'
    },
    localTimeText: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '500',
      color: theme.text.primary,
    },
    rulerContainer: {
      height: 83,
      position: 'relative',
      overflowX: 'hidden',
      zIndex: 10,
    },
    rulerTrack: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      height: 83,
      backgroundColor: 'transparent',
    },
    tickDummy: {
      width: TICK_WIDTH,
      height: 83,
    },
    tickContainer: {
      width: TICK_WIDTH,
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingTop: 38,
      height: 83,
    },
    tick: {
      width: 4,
      height: 4,
      marginRight: -2,
      backgroundColor: theme.border.field,
      borderRadius: 3,
    },
    hourTick: {
      height: 6,
      width: 6,
      marginRight: -3,
      backgroundColor: theme.border.field,
      borderRadius: 5,
    },
    zeroTick: {
      height: 13,
      backgroundColor: theme.surface.button.primary,
      width: 6,
      marginRight: -3,
      borderRadius: 6,
    },
    centerIndicator: {
      position: 'absolute',
      left: screenWidth / 2 - 3,
      top: 45,
      width: 1,
      height: 0,
      borderLeftWidth: 3,
      borderRightWidth: 3,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: theme.surface.button.primary,
    },
  });
}
