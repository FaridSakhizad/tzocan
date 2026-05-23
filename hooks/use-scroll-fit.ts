import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

const SCROLL_ENABLE_EPSILON = 1;

export function useScrollFit() {
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  }, []);

  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  const scrollEnabled = useMemo(() => {
    if (containerHeight <= 0 || contentHeight <= 0) {
      return false;
    }

    return contentHeight > containerHeight + SCROLL_ENABLE_EPSILON;
  }, [containerHeight, contentHeight]);

  return {
    scrollEnabled,
    handleContainerLayout,
    handleContentSizeChange,
  };
}
