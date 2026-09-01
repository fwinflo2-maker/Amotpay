import React, { useRef } from 'react';
import { Animated, Text, StyleSheet, ActivityIndicator, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadow, spacing } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ title, onPress, loading, variant = 'primary', style, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animateTo = (value: number) => {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.deepGreenDark : colors.white} />
  ) : (
    <Text
      style={[
        styles.text,
        variant === 'primary' ? styles.textPrimary : variant === 'outline' ? styles.textOutline : styles.textSecondary,
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
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        {variant === 'primary' ? (
          <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, shadow.button]}>
            {content}
          </LinearGradient>
        ) : variant === 'secondary' ? (
          <LinearGradient colors={gradients.emerald} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, shadow.card]}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={[styles.btn, styles.outline]}>{content}</Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  disabled: { opacity: 0.45 },
  text: { fontSize: 15.5, fontWeight: '800', letterSpacing: 0.6 },
  textPrimary: { color: colors.deepGreenDark },
  textSecondary: { color: colors.white },
  textOutline: { color: colors.gold },
});
