import { ReactNode, useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, ScrollView, Text, View, ImageBackground } from 'react-native';

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';
import IconBackOutlined from '@/assets/images/icon--arrow-2--outlined.svg';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NotificationPickerModalProps = {
  visible: boolean;
  title: string | null;
  onClose: () => void;
  onApply?: () => void;
  showActions?: boolean;
  children: ReactNode;
  closeActionType?: string | null;
};

export function NotificationPickerModal({
  visible,
  title,
  onClose,
  onApply,
  showActions = true,
  children,
  closeActionType = null
}: NotificationPickerModalProps) {
  const insets = useSafeAreaInsets();

  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);

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
      <Animated.View style={[styles.wrapper, { opacity }]}>
        <ScrollView style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContentContainer,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
            }
          ]}
        >
          <Pressable style={styles.overlay} onPress={onClose} />
          <Pressable onPress={() => undefined}>
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
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  const isContrastBlack = theme.name === 'contrastBlack';

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.overlay.strong,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    scrollContainer: {
      flex: 1,
      width: '100%',
    },
    scrollContentContainer: {
      padding: theme.spacing.screenX,
      minHeight: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backgroundImage: {
      borderTopLeftRadius: theme.radius.panelTop,
      borderTopRightRadius: theme.radius.panelTop,
      borderBottomLeftRadius: theme.radius.panelBottom,
      borderBottomRightRadius: theme.radius.panelBottom,
      overflow: 'hidden',
      minWidth: 280,
      alignSelf: 'center',
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
