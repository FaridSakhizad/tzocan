import { ReactNode, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';
import IconBackOutlined from '@/assets/images/icon--arrow-2--outlined.svg';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';

type NotificationPickerModalProps = {
  visible: boolean;
  title: string | null;
  onClose: () => void;
  onApply?: () => void;
  showActions?: boolean;
  wide?: boolean;
  children: ReactNode;
  closeActionType: string | null;
};

export function NotificationPickerModal({
  visible,
  title,
  onClose,
  onApply,
  showActions = true,
  wide = false,
  children,
  closeActionType = null
}: NotificationPickerModalProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, wide && styles.cardWide]} onPress={() => undefined}>
          <ImageBackground
            source={theme.image.modalBackgroundSource}
            style={styles.backgroundImage}
            imageStyle={styles.backgroundImageAsset}
            resizeMode="cover"
          >
            <View style={styles.container}>
              <View style={styles.header}>
                {showActions && (
                  <Pressable style={styles.headerButton} onPress={onClose}>
                    {closeActionType === 'back' ? <IconBackOutlined fill={theme.text.primary} /> : <IconCancelOutlined fill={theme.text.primary} />}
                  </Pressable>
                )}

                <Text style={styles.title}>{title}</Text>

                {showActions && (
                  <Pressable style={styles.headerButton} onPress={onApply}>
                    <IconConfirmOutlined fill={theme.text.primary} />
                  </Pressable>
                )}
              </View>

              {children}
            </View>
          </ImageBackground>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay.strong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: theme.surface.transparent,
    },
    cardWide: {
      maxHeight: '90%',
      width: '100%',
      paddingHorizontal: theme.spacing.screenX,
    },
    backgroundImage: {
      borderTopLeftRadius: theme.radius.panelTop,
      borderTopRightRadius: theme.radius.panelTop,
      borderBottomLeftRadius: theme.radius.panelBottom,
      borderBottomRightRadius: theme.radius.panelBottom,
      overflow: 'hidden',
      minWidth: 280,
    },
    backgroundImageAsset: {
      transform: [{ scale: theme.image.modalBackgroundScale }],
    },
    container: {
      backgroundColor: theme.surface.elevatedSoft,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    headerButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.text.primary,
      fontSize: theme.typography.titleSm.fontSize,
      margin: 'auto',
    },
  });
}
