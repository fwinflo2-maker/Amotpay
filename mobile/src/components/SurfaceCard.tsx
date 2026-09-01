import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow, spacing } from '../theme/designTokens';

export function SurfaceCard({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSubtle,
        },
        shadow('card', theme.isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
});
