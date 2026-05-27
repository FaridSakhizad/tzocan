import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import type { UiTheme } from '@/constants/ui-theme.types';
import type { SupportProductId } from '@/constants/support-products';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';

type SupportProductRow = {
  id: SupportProductId;
  label: string;
  tier: 'standard' | 'future';
  price: string | null;
  isPurchased: boolean;
  isPurchasing: boolean;
  isDisabled: boolean;
};

type SupportModalProps = {
  visible: boolean;
  onClose: () => void;
  products: SupportProductRow[];
  isLoading: boolean;
  isUnavailable: boolean;
  onPurchase: (productId: SupportProductId) => void;
};

export function SupportModal({
  visible,
  onClose,
  products,
  isLoading,
  isUnavailable,
  onPurchase,
}: SupportModalProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);
  const [isShowingFutureDevelopment, setIsShowingFutureDevelopment] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsShowingFutureDevelopment(false);
    }
  }, [visible]);

  const standardProducts = products.filter((product) => product.tier === 'standard');
  const futureProducts = products.filter((product) => product.tier === 'future');
  const visibleProducts = isShowingFutureDevelopment ? futureProducts : standardProducts;

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      style={styles.supportModal}
    >
      <Animated.View style={[styles.modalRoot, { opacity }]}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            pointerEvents="box-none"
          >
            <View style={styles.modalPad} />

            <Pressable style={styles.overlayCloseButton} onPress={onClose}>
              <IconCancelOutlined fill={theme.text.primary} />
            </Pressable>

            <ImageBackground
              source={theme.image.modalBackgroundSource}
              style={styles.backgroundImage}
              imageStyle={styles.backgroundImageAsset}
              resizeMode="cover"
            >
              <View style={styles.modalContent}>
                <View style={styles.menuCard}>
                  {!isShowingFutureDevelopment ? (
                    <Text style={styles.descriptionText}>{t('support.description')}</Text>
                  ) : null}

                  {isLoading ? (
                    <Text style={styles.stateText}>{t('common.loading')}</Text>
                  ) : null}

                  {!isLoading && isUnavailable ? (
                    <Text style={styles.stateText}>{t('support.unavailable')}</Text>
                  ) : null}

                  {!isLoading ? (
                    visibleProducts.map((product) => (
                      <Pressable
                        key={product.id}
                        style={[styles.menuButton, product.isDisabled && styles.menuButtonDisabled]}
                        onPress={() => {
                          onPurchase(product.id);
                        }}
                        disabled={product.isDisabled}
                      >
                        <Text style={styles.menuButtonText}>{product.label}</Text>
                        {product.price ? (
                          <Text style={styles.menuButtonPrice}>{product.price}</Text>
                        ) : null}
                      </Pressable>
                    ))
                  ) : null}

                  {!isLoading && !isShowingFutureDevelopment ? (
                    <Pressable
                      style={styles.menuButton}
                      onPress={() => {
                        setIsShowingFutureDevelopment(true);
                      }}
                    >
                      <Text style={styles.menuButtonText}>{t('support.futureDevelopment')}</Text>
                    </Pressable>
                  ) : null}

                  {!isLoading && isShowingFutureDevelopment ? (
                    <Pressable
                      style={styles.menuButton}
                      onPress={() => {
                        setIsShowingFutureDevelopment(false);
                      }}
                    >
                      <Text style={styles.menuButtonText}>{t('common.goBack')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </ImageBackground>

            <View style={styles.modalPad} />
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  const isContrastBlack = theme.name === 'contrastBlack';

  return StyleSheet.create({
    supportModal: {},
    modalRoot: { flex: 1 },
    modalContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-evenly',
      backgroundColor: theme.overlay.strong,
      padding: theme.spacing.modalX,
    },
    modalPad: {
      flex: 1,
    },
    overlayCloseButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 10,
    },
    backgroundImage: {
      display: 'flex',
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
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
      backgroundColor: theme.surface.transparent,
      borderRadius: theme.radius.xl,
      paddingVertical: 15,
      paddingHorizontal: 23,
      gap: theme.spacing.sectionGap,
    },
    menuCard: {
      flexDirection: 'column',
    },
    descriptionText: {
      fontSize: theme.typography.body.fontSize,
      lineHeight: 20,
      color: theme.text.primary,
      marginBottom: 8,
    },
    menuButton: {
      height: 50,
      justifyContent: 'space-between',
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    menuButtonDisabled: {
      opacity: 0.5,
    },
    menuButtonText: {
      fontSize: theme.typography.titleLg.fontSize,
      color: theme.text.primary,
    },
    menuButtonPrice: {
      fontSize: theme.typography.titleLg.fontSize,
      color: theme.text.primary,
    },
    stateText: {
      fontSize: theme.typography.body.fontSize,
      lineHeight: 20,
      color: theme.text.primary,
      minHeight: 24,
      marginBottom: 8,
      textAlignVertical: 'center',
    },
  });
}
