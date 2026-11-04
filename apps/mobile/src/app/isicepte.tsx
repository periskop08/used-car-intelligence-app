import React from 'react';
import { View } from 'react-native';
import IsiCepteOneriyorScreen from './(tabs)/isicepte';
import { BottomTabBarFooter } from '../components/BottomTabBarFooter';

export default function IsiCepteStackScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ flex: 1 }}>
        <IsiCepteOneriyorScreen />
      </View>
      <BottomTabBarFooter />
    </View>
  );
}
