import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function FlowMark({ size = 48 }: { size?: number }) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(travel, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(travel, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, travel]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const particleX = travel.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.55] });
  const particleOpacity = travel.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });

  const dot = size * 0.18;
  const lineW = size * 0.55;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityLabel="AMOTPay flow">
      <View style={[styles.line, { width: lineW, backgroundColor: theme.colors.flowLine, top: size / 2 - 1 }]} />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: theme.colors.flowDot,
            left: 0,
            top: size / 2 - dot / 2,
            transform: [{ scale: dotScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dot * 0.7,
            height: dot * 0.7,
            borderRadius: dot * 0.35,
            backgroundColor: theme.colors.accent,
            left: lineW - dot * 0.35,
            top: size / 2 - dot * 0.35,
            opacity: 0.85,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            width: dot * 0.45,
            height: dot * 0.45,
            borderRadius: dot * 0.225,
            backgroundColor: theme.colors.accent,
            top: size / 2 - dot * 0.225,
            opacity: particleOpacity,
            transform: [{ translateX: particleX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  line: { position: 'absolute', left: 0, height: 2, borderRadius: 1 },
  dot: { position: 'absolute' },
  particle: { position: 'absolute', left: 0 },
});
