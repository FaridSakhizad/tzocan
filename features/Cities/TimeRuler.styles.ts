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
    resetButtonContainer: {
      alignSelf: 'flex-start',
      minWidth: 70,
      alignItems: 'center',
    },
    resetButton: {
      borderRadius: 10,
      width: 20,
      height: 20,
      backgroundColor: theme.surface.button.primary,
      position: 'absolute',
      top: -10,
      left: screenWidth / 2 - 10,
    },
    resetButtonPressable: {
      width: '100%',
      height: '100%',
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
      paddingTop: 10,
      paddingBottom: 5,
      paddingHorizontal: 16,
      backgroundColor: theme.surface.transparent,
    },
    localTimeContainer: {
      alignItems: 'center',
    },
    sideText: {
      fontSize: 18,
      color: theme.text.secondary,
      minWidth: 70,
      textAlign: 'center',
      fontWeight: '300'
    },
    localTimeText: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.text.primary,
    },
    rulerContainer: {
      height: 45,
      position: 'relative',
    },
    scrollContent: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 45,
      backgroundColor: 'transparent',
    },
    tickDummy: {
      width: TICK_WIDTH,
      height: 45,
    },
    tickContainer: {
      width: TICK_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      height: 45,
    },
    tick: {
      width: 3,
      height: 3,
      backgroundColor: theme.border.field,
      borderRadius: 3,
    },
    hourTick: {
      height: 5,
      width: 5,
      backgroundColor: theme.border.field,
      borderRadius: 5,
    },
    zeroTick: {
      height: 13,
      backgroundColor: theme.surface.button.primary,
      width: 5,
      borderRadius: 5,
    },
    centerIndicator: {
      position: 'absolute',
      left: screenWidth / 2 - 3,
      top: 7,
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
