import React from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
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
        <Stack.Screen name="login" options={{ title: 'Giriş Yap', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="register" options={{ title: 'Kayıt Ol', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="vehicle-query" options={{ title: 'Araç Sorgula', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="vehicle-report" options={{ headerShown: false }} />
        <Stack.Screen name="comparison" options={{ headerShown: false }} />
        <Stack.Screen name="listings/create" options={{ title: 'İlan Ver', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="listings/[id]" options={{ title: 'İlan Detayı', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="messages/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/favorites" options={{ headerShown: false }} />
        <Stack.Screen name="profile/admin" options={{ headerShown: false }} />
        <Stack.Screen name="profile/my-listings" options={{ headerShown: false }} />
        <Stack.Screen name="profile/subscription" options={{ headerShown: false }} />
        <Stack.Screen name="profile/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile/personal-info" options={{ headerShown: false }} />
        <Stack.Screen name="ilan-akisi" options={{ title: 'İlan Akışı', headerBackTitle: 'Geri', headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
