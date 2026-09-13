import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface UrgentBadgeProps {
  size?: 'xs' | 'small' | 'sm' | 'medium' | 'md' | 'lg';
  animated?: boolean;
}

export default function UrgentBadge({ size = 'small', animated = true }: UrgentBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 750,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim, glowAnim, animated]);

  const isXs = size === 'xs';
  const isMd = size === 'medium' || size === 'md';
  const isLg = size === 'lg';

  const dimension = isXs ? 18 : isMd ? 28 : isLg ? 34 : 22;
  const iconSize = isXs ? 12 : isMd ? 18 : isLg ? 22 : 14;
  const radius = isXs ? 4 : isMd ? 7 : isLg ? 8 : 5.5;

  return (
    <Animated.View
      accessible={true}
      accessibilityLabel="Acil İlan"
      accessibilityRole="alert"
      style={[
        styles.badgeContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
          transform: [{ scale: pulseAnim }],
          shadowOpacity: animated ? glowAnim : 0.4,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="alarm-light"
        size={iconSize}
        color="#ffffff"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.7)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
});
