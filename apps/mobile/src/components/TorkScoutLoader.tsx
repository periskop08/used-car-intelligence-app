import React, { useState, useEffect } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  G,
  Line,
  Circle,
} from 'react-native-svg';

interface TorkScoutLoaderProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact animated TorkScout "T + Speedometer Gauge" loader.
 * Drop-in replacement for ActivityIndicator on screen/section loading states.
 */
export default function TorkScoutLoader({
  size = 'large',
  style,
}: TorkScoutLoaderProps) {
  const [needleAngle, setNeedleAngle] = useState(-30);

  useEffect(() => {
    const startTime = Date.now();
    let animFrameId: number;

    const animateNeedle = () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const progress = (Math.sin((elapsedSec * Math.PI) / 1.1) + 1) / 2;
      const angle = -30 + progress * 90;
      setNeedleAngle(angle);
      animFrameId = requestAnimationFrame(animateNeedle);
    };

    animFrameId = requestAnimationFrame(animateNeedle);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  const width =
    typeof size === 'number' ? size : size === 'small' ? 34 : 58;
  const height = Math.round(width * (170 / 235));

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height} viewBox="-45 25 235 165">
        <Defs>
          <LinearGradient id="ts-loader-t-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00d2ff" />
            <Stop offset="100%" stopColor="#0052d4" />
          </LinearGradient>

          <LinearGradient id="ts-loader-lines-grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#0052d4" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#00d2ff" stopOpacity="0.95" />
          </LinearGradient>

          <LinearGradient id="ts-loader-arc-grad" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0%" stopColor="#0052d4" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#00d2ff" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Speed Lines */}
        <Rect x="-25" y="75" width="75" height="7" rx="3.5" fill="url(#ts-loader-lines-grad)" />
        <Rect x="-42" y="95" width="97" height="7" rx="3.5" fill="url(#ts-loader-lines-grad)" />
        <Rect x="-20" y="115" width="65" height="7" rx="3.5" fill="url(#ts-loader-lines-grad)" />

        {/* Inner Dashed Speedometer Arc */}
        <Path
          d="M 110 155 A 60 60 0 0 0 160 75"
          fill="none"
          stroke="url(#ts-loader-arc-grad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeDasharray="2 6"
        />

        {/* Outer Solid Speedometer Arc */}
        <Path
          d="M 100 165 A 72 72 0 0 0 167 68"
          fill="none"
          stroke="url(#ts-loader-t-grad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* Slanted "T" Lettermark */}
        <Path
          d="M 53 55 L 142 55 L 130 71 L 106 71 L 83 165 L 66 165 L 89 71 L 65 71 Z"
          fill="url(#ts-loader-t-grad)"
        />

        {/* Smooth 60 FPS Animated Speedometer Needle */}
        <G origin="130, 115" rotation={needleAngle}>
          <Line
            x1="130"
            y1="115"
            x2="165"
            y2="115"
            stroke="#00c6ff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </G>

        {/* Speedometer Hub Center Circle */}
        <Circle cx="130" cy="115" r="6.5" fill="#00c6ff" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
