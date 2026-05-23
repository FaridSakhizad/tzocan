import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { MODAL_ANIMATION_DURATION_MS } from '@/constants/app-config';

export function useModalVisibilityAnimation(visible: boolean) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    opacity.stopAnimation();

    if (visible) {
      setIsMounted(true);
      opacity.setValue(0);

      Animated.timing(opacity, {
        toValue: 1,
        duration: MODAL_ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }).start();

      return;
    }

    if (!isMounted) {
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: MODAL_ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [isMounted, opacity, visible]);

  return {
    isMounted,
    opacity,
  };
}
