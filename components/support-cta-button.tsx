import { Pressable, StyleSheet, Text } from 'react-native';
import { useMemo } from 'react';

import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';

type SupportCtaButtonProps = {
  onPress: () => void;
};

export function SupportCtaButton({ onPress }: SupportCtaButtonProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{t('common.sayThanks')}</Text>
    </Pressable>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    button: {
      alignSelf: 'stretch',
      backgroundColor: theme.surface.cardAlt,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    buttonText: {
      color: theme.text.primary,
      fontSize: 16,
      textAlign: 'center',
    },
  });
}
