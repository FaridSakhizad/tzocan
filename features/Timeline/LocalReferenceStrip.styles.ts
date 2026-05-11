import { StyleSheet } from 'react-native';

import type { UiTheme } from '@/constants/ui-theme.types';
import { TIMELINE_CELL_WIDTH } from '@/utils/timeline-core';

export function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    timelineViewport: {
      overflow: 'hidden',
    },
    timelineContent: {
      flexDirection: 'row',
    },
    hourBox: {
      width: TIMELINE_CELL_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourBlock: {
      width: 64,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBlock: {},
    navArrow: {
      width: 16,
      height: 16,
    },
    navArrowLeft: {
      transform: [{ rotate: '180deg' }],
    },
    hourLabelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    hourBlockHour: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
    },
    hourBlockAmPm: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'uppercase',
    },
    hourBlockMidnight: {},
    midnightWeekday: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    midnightMonthDay: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
  });
}
