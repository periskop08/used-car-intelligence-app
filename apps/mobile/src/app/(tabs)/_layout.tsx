import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          height: Platform.OS === 'ios' ? 88 : 72,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: '#ea580c',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kesfet"
        options={{
          title: 'Keşfet',
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          headerShown: false,
          tabBarLabel: 'İlanlar',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.centerTabBadge}>
              <Ionicons name="car-sport" size={24} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="aracini-bul"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="vehicle-guide"
        options={{
          title: 'Araç Rehberi',
          href: null,
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          headerShown: false,
          tabBarLabel: 'Paketler',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'gift' : 'gift-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="club"
        options={{
          headerShown: false,
          tabBarLabel: 'Club',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilim & Hesabım',
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});
