import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme/designTokens';

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | `${number}%`; height?: number; style?: ViewStyle }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, backgroundColor: theme.colors.skeleton, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={28} width="65%" style={styles.gap} />
      <Skeleton height={12} width="50%" style={styles.gap} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm },
  card: { gap: 0 },
  gap: { marginTop: 12 },
});
