import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBrandLogoUrl, getBrandMonogram } from '../constants/brandLogos';

export interface BrandLogoProps {
  brandName?: string;
  isMotorcycle?: boolean;
  size?: number;
  boxStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  lightTheme?: boolean;
}

/**
 * Premium unified BrandLogo component with zero text overflow and graceful fallback
 */
export function BrandLogo({
  brandName,
  isMotorcycle = false,
  size = 40,
  boxStyle,
  imageStyle,
  lightTheme = false,
}: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getBrandLogoUrl(brandName, isMotorcycle ? 'MOTORCYCLE' : 'CAR');
  const monogram = getBrandMonogram(brandName);

  if (logoUrl && !hasError) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size },
          lightTheme ? styles.containerLight : styles.containerDark,
          boxStyle,
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={[
            {
              width: size * 0.8,
              height: size * 0.8,
            },
            imageStyle,
          ]}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  // Premium fallback monogram badge (for unmapped local brands or when offline)
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        lightTheme ? styles.fallbackBoxLight : styles.fallbackBoxDark,
        boxStyle,
      ]}
    >
      <Text
        style={[
          styles.monogramText,
          { fontSize: Math.max(10, size * 0.36) },
          lightTheme ? styles.monogramTextLight : styles.monogramTextDark,
        ]}
        numberOfLines={1}
      >
        {monogram}
      </Text>
      <Ionicons
        name={isMotorcycle ? 'bicycle-outline' : 'car-sport-outline'}
        size={Math.max(8, size * 0.22)}
        color={lightTheme ? '#64748b' : '#f97316'}
        style={styles.subIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  fallbackBoxDark: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  fallbackBoxLight: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  monogramText: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  monogramTextDark: {
    color: '#f8fafc',
  },
  monogramTextLight: {
    color: '#0f172a',
  },
  subIcon: {
    marginTop: -2,
    opacity: 0.8,
  },
});

export default BrandLogo;
