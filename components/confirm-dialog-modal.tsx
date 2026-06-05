import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';
import { useMemo } from 'react';

import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';

type ConfirmDialogModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmDialogModal({
  visible,
  title,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogModalProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);
  const resolvedConfirmLabel = confirmLabel ?? t('common.delete');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalWrapper, { opacity }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ImageBackground
            source={theme.image.modalBackgroundSource}
            style={styles.backgroundImage}
            imageStyle={styles.backgroundImageAsset}
            resizeMode="cover"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalHeaderText}>{title}</Text>

              <View style={styles.actions}>
                <Pressable style={[styles.dialogButton, styles.dialogButtonDelete]} onPress={onConfirm}>
                  <Text style={[styles.dialogButtonText, styles.dialogButtonTextDelete]}>{resolvedConfirmLabel}</Text>
                </Pressable>
                <Pressable style={[styles.dialogButton, styles.dialogButtonSecondary]} onPress={onClose}>
                  <Text style={[styles.dialogButtonText, styles.dialogButtonTextSecondary]}>{resolvedCancelLabel}</Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  const isContrastBlack = theme.name === 'contrastBlack';

  return StyleSheet.create({
    modalWrapper: {
      flex: 1,
      backgroundColor: theme.overlay.strong,
    },
    modalContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backgroundImage: {
      borderRadius: 36,
      overflow: 'hidden',
      width: 295,
      shadowColor: isContrastBlack ? '#ffffff' : '#000000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: isContrastBlack ? 0.28 : 0.16,
      shadowRadius: isContrastBlack ? 24 : 18,
      elevation: 16,
    },
    backgroundImageAsset: {
      transform: [{ scale: theme.image.modalBackgroundScale }],
    },
    modalContent: {
      width: 295,
      backgroundColor: theme.surface.elevated,
      borderRadius: 36,
      paddingVertical: 20,
      paddingHorizontal: 23,
    },
    modalHeaderText: {
      textAlign: 'center',
      fontSize: theme.typography.titleSm.fontSize,
      lineHeight: 26,
      color: theme.text.primary,
      minHeight: 100,
      paddingVertical: 12,
      paddingBottom: 24,
    },
    actions: {
      gap: 10,
    },
    dialogButton: {
      height: 40,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.surface.button.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogButtonText: {
      fontSize: theme.typography.control.fontSize,
      color: theme.text.primary,
    },
    dialogButtonDelete: {
      backgroundColor: theme.surface.button.subtleStrong,
    },
    dialogButtonTextDelete: {
      color: theme.text.warning,
    },
    dialogButtonSecondary: {
      backgroundColor: theme.surface.button.subtleWeak,
    },
    dialogButtonTextSecondary: {
      color: theme.text.secondary,
    },
  });
}
