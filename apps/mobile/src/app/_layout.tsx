import React from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f172a', // Slate 900
          },
          headerTintColor: '#f8fafc', // Slate 50
          headerTitleStyle: {
            fontWeight: '900',
          },
          contentStyle: {
            backgroundColor: '#0f172a',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Giriş Yap', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="register" options={{ title: 'Kayıt Ol', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="vehicle-query" options={{ title: 'Araç Sorgula', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="vehicle-report" options={{ title: 'Araç Raporu', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="comparison" options={{ title: 'Araç Karşılaştır', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="add-vehicle" options={{ title: 'Araç Öner', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="listings/create" options={{ title: 'İlan Ver', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="listings/[id]" options={{ title: 'İlan Detayı', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="messages/[id]" options={{ title: 'Mesajlaşma', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="profile/favorites" options={{ title: 'Favorilerim', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="profile/admin" options={{ title: 'Admin Paneli', headerBackTitle: 'Geri' }} />
        <Stack.Screen name="ilan-akisi" options={{ title: 'İlan Akışı', headerBackTitle: 'Geri', headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
