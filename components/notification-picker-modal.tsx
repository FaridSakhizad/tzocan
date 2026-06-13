import { ReactNode, useMemo } from 'react';
import { Animated, Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, ImageBackground } from 'react-native';

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
  showHeader?: boolean;
  showClose?: boolean;
  showApply?: boolean;
  closeByOverlayTap?: boolean;
  children: ReactNode;
  closeActionType?: string | null;
  customWindowStyle?: StyleProp<ViewStyle>
};

export function NotificationPickerModal({
  visible,
  title,
  onClose,
  onApply,
  showHeader = true,
  showClose = true,
  showApply = true,
  closeByOverlayTap = true,
  children,
  closeActionType = null,
  customWindowStyle = {},
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
        {closeByOverlayTap && <Pressable style={styles.overlay} onPress={onClose} />}

        <View
          style={[
            styles.cardFrame,
            {
              paddingTop: insets.top + 20,
              paddingBottom: 20,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable onPress={() => undefined}>
          <ImageBackground
            source={theme.image.modalBackgroundSource}
            style={[
              styles.backgroundImage,
              customWindowStyle
            ]}
            imageStyle={styles.backgroundImageAsset}
            resizeMode="cover"
          >
            <View style={styles.container}>
              {showHeader && (
                <View style={styles.header}>
                  {showClose ? (
                    <Pressable style={styles.headerButton} onPress={onClose}>
                      {closeActionType === 'back' ? <IconBackOutlined fill={theme.text.primary} /> : <IconCancelOutlined fill={theme.text.primary} />}
                    </Pressable>
                  ) : (
                    <View style={styles.headerButtonPlaceholder} />
                  )}

                  <Text style={styles.title}>{title}</Text>

                  {showApply ? (
                    <Pressable style={styles.headerButton} onPress={onApply}>
                      <IconConfirmOutlined fill={theme.text.primary} />
                    </Pressable>
                  ) : (
                    <View style={styles.headerButtonPlaceholder} />
                  )}
                </View>
              )}

              <View style={styles.body}>
                {children}
              </View>
            </View>
          </ImageBackground>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  const isContrastBlack = theme.name === 'contrastBlack';

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.overlay.strong,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    cardFrame: {
      flex: 1,
      width: '100%',
      paddingHorizontal: theme.spacing.screenX,
      justifyContent: 'center',
    },
    backgroundImage: {
      borderTopLeftRadius: theme.radius.panelTop,
      borderTopRightRadius: theme.radius.panelTop,
      borderBottomLeftRadius: theme.radius.panelBottom,
      borderBottomRightRadius: theme.radius.panelBottom,
      overflow: 'hidden',
      minWidth: 280,
      maxHeight: '100%',
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
      backgroundColor: theme.overlay.medium,
      maxHeight: '100%',
      minHeight: 0,
    },
    body: {
      flexShrink: 1,
      minHeight: 0,
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
    headerButtonPlaceholder: {
      width: 50,
      height: 50,
    },
    title: {
      color: theme.text.primary,
      fontSize: theme.typography.titleSm.fontSize,
      margin: 'auto',
    },
  });
}
