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
    headerButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: theme.surface.transparent,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.faint,
      paddingHorizontal: theme.spacing.screenX,
    },
    headerButton: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
    },
    headerButtonEditCitiesList: {
      marginLeft: 0,
      marginRight: 'auto'
    },
    headerButtonSettings: {
      marginLeft: 'auto',
      marginRight: 0
    },
    headerButtonSort: {
      width: 'auto',
      minWidth: 44,
      paddingHorizontal: 8,
      marginHorizontal: 8,
    },
    headerButtonSortText: {
      color: theme.text.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    headerButtonDelete: {
      marginLeft: 'auto',
      marginRight: 0
    },
    headerButtonBack: {
      marginLeft: 0,
      marginRight: 'auto'
    },
    headerButtonDisabled: {
      opacity: 0.5,
    },
    headerButtonIcon: {
      width: 30,
      height: 30,
    },
    headerButtonActive: {
      borderColor: theme.border.field,
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
    }
  });
}
