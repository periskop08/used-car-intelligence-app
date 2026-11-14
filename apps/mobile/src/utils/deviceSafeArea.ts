import { Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Universal device-adaptive safe area & viewport metrics hook.
 * Guarantees that headers, close ('X') buttons, bottom bars, and modals
 * never overlap the iOS Notch / Dynamic Island / Status Bar, Android camera
 * cutout / status bar, or bottom gesture / navigation bars on any phone model.
 */
export function useDeviceSafeArea() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Hardware top inset with guaranteed minimum for iOS Notch/Dynamic Island & Android StatusBar
  const safeTopInset = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 28)
  );

  // Hardware bottom inset with guaranteed minimum for Home Indicator / Android nav bar
  const safeBottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 24 : 16
  );

  // Maximum safe height for bottom sheets & dialogs so they never collide with the top status bar
  const maxSheetHeight = Math.max(320, screenHeight - safeTopInset - 16);

  return {
    insets,
    safeTopInset,
    safeBottomInset,
    screenWidth,
    screenHeight,
    maxSheetHeight,
    isCompactPhone: screenWidth < 375,
    isShortPhone: screenHeight < 700,
  };
}
