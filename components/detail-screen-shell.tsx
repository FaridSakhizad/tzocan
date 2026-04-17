import { ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';

type DetailScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
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
    contactSection: {
      paddingTop: 22,
      paddingHorizontal: 20,
    },
    aboutSection: {
      paddingTop: 22,
      paddingHorizontal: 20,
    },
    section: {},
    card: {
      paddingHorizontal: 20,
      paddingTop: 19,
      paddingBottom: 22,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.2)'
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
    settingInfo: {},
    settingInfoNoMargin: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 20,
      color: theme.text.primary,
      marginBottom: 8,
    },
    settingHint: {
      fontSize: theme.typography.helper.fontSize,
      color: theme.text.primary,
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
      flexWrap: 'wrap',
      gap: 15,
    },
    optionButton: {
      borderRadius: 15,
      height: 30,
      paddingHorizontal: 15,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 95,
    },
    optionButtonActive: {
      backgroundColor: 'rgba(62, 63, 86, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.75)',
    },
    optionButtonText: {
      color: theme.text.primary,
      fontSize: 15
    },
    optionButtonTextActive: {
      fontWeight: 'bold',
    },
  });
}

export function useDetailScreenStyles() {
  const { theme } = useAppTheme();

  return useMemo(() => createDetailScreenStyles(theme), [theme]);
}
