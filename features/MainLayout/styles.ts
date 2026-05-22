import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    bottomBarContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.border.faint,
      paddingTop: 40,
    },
    bottomBarContainerCitiesList: {
      paddingTop: 18,
      borderTopWidth: 0,
    },
    tabBarStyle: {
      backgroundColor: theme.surface.transparent,
      borderTopColor: theme.border.transparent,
      paddingHorizontal: 16,
    },
    tabBarDisabled: {
      opacity: 0.5,
    },
    iconBox: {
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      width: 40,
      height: 40
    },
  });
}
