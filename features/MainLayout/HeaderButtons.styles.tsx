import type { UiTheme } from '@/constants/ui-theme.types';
import { StyleSheet } from 'react-native';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
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
    headerButtonAddNotification: {
      marginLeft: 'auto'
    },
    headerButtonAddCity: {
      marginRight: 'auto'
    },
    headerButtonEditCitiesList: {
      marginLeft: 0,
      marginRight: 'auto'
    },
    headerButtonSort: {
      marginLeft: 'auto',
      marginRight: 0,
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
  });
}
