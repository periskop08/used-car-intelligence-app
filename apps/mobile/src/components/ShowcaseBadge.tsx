import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ShowcaseBadgeProps {
  size?: 'xs' | 'small' | 'sm' | 'medium' | 'md' | 'lg';
}

export default function ShowcaseBadge({ size = 'small' }: ShowcaseBadgeProps) {
  const isXs = size === 'xs';
  const isMd = size === 'medium' || size === 'md';
  const isLg = size === 'lg';

  const dimension = isXs ? 18 : isMd ? 28 : isLg ? 34 : 22;
  const iconSize = isXs ? 11 : isMd ? 16 : isLg ? 19 : 13;
  const radius = isXs ? 4 : isMd ? 7 : isLg ? 8 : 5.5;

  return (
    <View
      accessible={true}
      accessibilityLabel="Vitrin İlan"
      accessibilityRole="text"
      style={[
        styles.badgeContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
        },
      ]}
    >
      <Ionicons name="star" size={iconSize} color="#451a03" />
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.9)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
});
