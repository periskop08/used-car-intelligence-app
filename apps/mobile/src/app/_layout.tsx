import React, { useMemo, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { normalizeTabRoute } from '../utils/tabNavigation';
import { createEdgeSwipeDismissHandlers } from '../utils/backGesture';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const globalStackEdgeSwipe = useMemo(
    () =>
      createEdgeSwipeDismissHandlers((() => {
        const current = pathnameRef.current || '';
        // Tab routes and self-managed multi-step wizards handle their own edge swipes
        if (
          normalizeTabRoute(current) ||
          current.startsWith('/vehicle-query') ||
          current.startsWith('/create-listing') ||
          current.startsWith('/aracini-bul')
        ) {
          return;
        }
        if (router.canGoBack()) {
          router.back();
        }
      })),
    [router]
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View
          style={styles.container}
          {...(Platform.OS === 'android' ? globalStackEdgeSwipe : {})}
        >
        <Stack
        screenOptions={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#0f172a',
          headerTitleStyle: {
            fontWeight: '800',
          },
          contentStyle: {
            backgroundColor: '#f8fafc',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="isicepte" options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }} />
        <Stack.Screen name="vehicle-guide" options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }} />
        <Stack.Screen name="aracini-bul" options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="login" options={{ title: 'Giriş Yap', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="register" options={{ title: 'Kayıt Ol', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="vehicle-query" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="messages-list" options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }} />
        <Stack.Screen name="listings-browser" options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }} />
        <Stack.Screen name="vehicle-report" options={{ headerShown: false }} />
        <Stack.Screen name="comparison" options={{ headerShown: false }} />
        <Stack.Screen name="create-listing" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="edit-listing" options={{ headerShown: false }} />
        <Stack.Screen name="listings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="messages/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/favorites" options={{ headerShown: false }} />
        <Stack.Screen name="profile/admin" options={{ headerShown: false }} />
        <Stack.Screen name="profile/my-listings" options={{ headerShown: false }} />
        <Stack.Screen name="profile/subscription" options={{ headerShown: false }} />
        <Stack.Screen name="profile/package-rights" options={{ headerShown: false }} />
        <Stack.Screen name="profile/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile/personal-info" options={{ headerShown: false }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
        <Stack.Screen name="profile/support" options={{ headerShown: false }} />
        <Stack.Screen name="ilan-akisi" options={{ title: 'Akış', headerBackTitle: 'Geri', headerShown: false }} />
      </Stack>
    </View>
  </ErrorBoundary>
  </SafeAreaProvider>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
