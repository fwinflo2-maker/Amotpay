import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { gradients, radius, shadow, spacing } from '../theme/designTokens';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, loading, variant = 'primary', style, disabled }: Props) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animate = (v: number) => {
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 5 }).start();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? theme.colors.accentContrast : theme.colors.accent} />
  ) : (
    <Text
      style={[
        styles.text,
        variant === 'primary'
          ? { color: theme.colors.accentContrast }
          : variant === 'outline'
            ? { color: theme.colors.accent }
            : { color: theme.colors.text },
      ]}
    >
      {title}
    </Text>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, isDisabled && styles.disabled, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        accessibilityRole="button"
      >
        {variant === 'primary' ? (
          <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, shadow('button', theme.isDark)]}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              styles.btn,
              variant === 'outline' && { borderWidth: 1.5, borderColor: theme.colors.accent, backgroundColor: 'transparent' },
              variant === 'ghost' && { backgroundColor: theme.colors.surfaceMuted },
            ]}
          >
            {content}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.45 },
});
