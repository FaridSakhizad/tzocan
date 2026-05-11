import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { LocalReferenceStrip } from '@/features/Timeline/LocalReferenceStrip';
import { useAppTheme } from '@/contexts/app-theme-context';

import { createStyles } from './LocalReferenceRow.styles';

type LocalReferenceRowProps = {
  x: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  locale: string;
  sidePad: number;
  hourIndices: number[];
  timelineWidth: number;
  timeFormat: string;
  width: number;
  currentTimeText: string;
  title: string;
  timezone: string;
  onUserInteraction?: () => void;
  onScrollSettled?: (focusedHourIndex: number) => void;
  onNavigateDayBackward: () => void;
  onNavigateDayForward: () => void;
};

export function LocalReferenceRow({
  x,
  minX,
  maxX,
  enabled,
  locale,
  sidePad,
  hourIndices,
  timelineWidth,
  timeFormat,
  width,
  currentTimeText,
  title,
  timezone,
  onUserInteraction,
  onScrollSettled,
  onNavigateDayBackward,
  onNavigateDayForward,
}: LocalReferenceRowProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.referenceRow}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          <Text style={styles.titleText}>{title}</Text>
        </Text>

        <Text style={styles.currentTime} numberOfLines={1}>
          {currentTimeText}
        </Text>
      </View>

      <View style={styles.timelineRowContainer}>
        <LocalReferenceStrip
          x={x}
          minX={minX}
          maxX={maxX}
          enabled={enabled}
          locale={locale}
          sidePad={sidePad}
          hourIndices={hourIndices}
          timelineWidth={timelineWidth}
          timeFormat={timeFormat}
          timezone={timezone}
          width={width}
          onUserInteraction={onUserInteraction}
          onScrollSettled={onScrollSettled}
          onNavigateDayBackward={onNavigateDayBackward}
          onNavigateDayForward={onNavigateDayForward}
        />
      </View>
    </View>
  );
}
