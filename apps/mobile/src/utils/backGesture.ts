import { Dimensions, GestureResponderEvent } from 'react-native';

interface SwipeTrackState {
  startX: number;
  startY: number;
  handled: boolean;
}

/**
 * Universal non-intrusive left/right edge swipe detector for iOS & Android modals and screens.
 * Does not block vertical ScrollViews or inner TouchableOpacity presses.
 */
export function createEdgeSwipeDismissHandlers(
  onBack: () => void,
  options?: { edgeWidth?: number; minDistance?: number; allowFullLeftSwipe?: boolean }
) {
  const edgeWidth = options?.edgeWidth ?? 52;
  const minDistance = options?.minDistance ?? 48;
  const allowFullLeftSwipe = options?.allowFullLeftSwipe ?? false;
  let state: SwipeTrackState | null = null;

  const checkAndTrigger = (pageX: number, pageY: number, threshold: number) => {
    if (!state || state.handled) return;
    const dx = pageX - state.startX;
    const dy = pageY - state.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < threshold || absDx < absDy * 1.4) return;

    const screenWidth = Dimensions.get('window').width || 390;
    const isLeftSwipe =
      (state.startX <= edgeWidth || allowFullLeftSwipe) && dx >= threshold;
    const isRightSwipe =
      state.startX >= screenWidth - edgeWidth && dx <= -threshold;

    if (isLeftSwipe || isRightSwipe) {
      state.handled = true;
      onBack();
    }
  };

  return {
    onTouchStart: (e: GestureResponderEvent) => {
      const t = e.nativeEvent;
      state = {
        startX: t.pageX,
        startY: t.pageY,
        handled: false,
      };
    },
    onTouchMove: (e: GestureResponderEvent) => {
      const t = e.nativeEvent;
      checkAndTrigger(t.pageX, t.pageY, minDistance + 6);
    },
    onTouchEnd: (e: GestureResponderEvent) => {
      const t = e.nativeEvent;
      checkAndTrigger(t.pageX, t.pageY, minDistance);
      state = null;
    },
  };
}
