import { ReactNode, useMemo } from 'react';
import { KeyboardShouldPersistTaps, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';

type DetailScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  keyboardShouldPersistTaps?: KeyboardShouldPersistTaps;
};

export function DetailScreenShell({
  title,
  subtitle,
  children,
  keyboardShouldPersistTaps,
}: DetailScreenShellProps) {
  const detailScreenStyles = useDetailScreenStyles();

  return (
    <ScrollView
      style={detailScreenStyles.container}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      <View style={detailScreenStyles.header}>
        <Text style={detailScreenStyles.title}>{title}</Text>
        <Text style={detailScreenStyles.subtitle}>{subtitle}</Text>
      </View>

      <View style={detailScreenStyles.section}>
        {children}
      </View>
    </ScrollView>
  );
}

function createDetailScreenStyles(theme: UiTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.screenHeaderTop,
      paddingBottom: theme.spacing.screenHeaderBottom,
    },
    title: {
      fontSize: theme.typography.screenTitle.fontSize,
      lineHeight: theme.typography.screenTitle.lineHeight,
      color: theme.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: theme.typography.screenSubtitle.fontSize,
      lineHeight: theme.typography.screenSubtitle.lineHeight,
      color: theme.text.secondary,
    },
    section: {
      paddingHorizontal: theme.spacing.screenX,
      paddingBottom: theme.spacing.screenBottom,
      gap: theme.spacing.sectionGap,
    },
    card: {
      backgroundColor: theme.surface.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.cardX,
      paddingVertical: theme.spacing.cardY,
    },
    cardWithGap: {
      gap: theme.spacing.sectionGap,
    },
    bodyText: {
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.lineHeight,
      color: theme.text.accentSoft,
    },
    input: {
      fontSize: theme.typography.control.fontSize,
      borderWidth: 1,
      borderColor: theme.border.field,
      backgroundColor: theme.surface.field,
      borderRadius: theme.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: theme.text.primary,
    },
    textArea: {
      minHeight: 180,
      fontSize: 15,
      borderWidth: 1,
      borderColor: theme.border.field,
      backgroundColor: theme.surface.field,
      borderRadius: theme.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: theme.text.primary,
    },
    helperText: {
      fontSize: theme.typography.helper.fontSize,
      lineHeight: theme.typography.helper.lineHeight,
      color: theme.text.helper,
      marginBottom: 12,
    },
    successText: {
      fontSize: theme.typography.helper.fontSize,
      lineHeight: theme.typography.helper.lineHeight,
      color: theme.text.warning,
      marginBottom: 12,
    },
    primaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.surface.button.primary,
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryButtonText: {
      color: theme.text.onLight,
      fontSize: theme.typography.control.fontSize,
      fontWeight: '600',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface.card,
      padding: 16,
      borderRadius: theme.radius.md,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingInfoNoMargin: {
      flex: 1,
    },
    settingLabel: {
      fontSize: theme.typography.control.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
    },
    settingHint: {
      fontSize: theme.typography.helper.fontSize,
      color: theme.text.muted,
      marginTop: 4,
    },
    secondaryActionButton: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.button.primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    secondaryActionButtonText: {
      color: theme.text.onLight,
      fontSize: 14,
      fontWeight: '600',
    },
    settingThemeOptions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    themeOptionButton: {
      flex: 1,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.button.subtleWeak,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeOptionButtonActive: {
      backgroundColor: theme.surface.button.primary,
    },
    themeOptionButtonText: {
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    themeOptionButtonTextActive: {
      color: theme.text.onLight,
    },
  });
}

export function useDetailScreenStyles() {
  const { theme } = useAppTheme();

  return useMemo(() => createDetailScreenStyles(theme), [theme]);
}
