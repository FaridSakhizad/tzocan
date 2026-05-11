import { StyleSheet } from 'react-native';

import type { UiTheme } from '@/constants/ui-theme.types';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    referenceRow: {
      backgroundColor: theme.surface.elevatedMuted,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.15)',
      paddingTop: 5,
      paddingBottom: 10,
    },
    header: {
      paddingHorizontal: 22,
      paddingBottom: 5,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    titleText: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
    },
    currentTime: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textAlign: 'right',
    },
    timelineRowContainer: {
      position: 'relative',
    },
  });
}
