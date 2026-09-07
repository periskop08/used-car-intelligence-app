import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ShowcaseBadgeProps {
  size?: 'small' | 'medium';
}

export default function ShowcaseBadge({ size = 'small' }: ShowcaseBadgeProps) {
  const isMedium = size === 'medium';

  return (
    <View style={[styles.badgeContainer, isMedium && styles.badgeContainerMedium]}>
      <Ionicons name="star" size={isMedium ? 12 : 10} color="#0f172a" />
      <Text style={[styles.badgeText, isMedium && styles.badgeTextMedium]}>
        VİTRİN
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeContainerMedium: {
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 8,
    gap: 4.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badgeTextMedium: {
    fontSize: 10.5,
  },
});
