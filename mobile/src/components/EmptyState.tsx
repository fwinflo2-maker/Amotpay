import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';

type Props = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({ title, message, icon = 'file-tray-outline' }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={32} color={theme.colors.textMuted} />
      <Text style={[theme.type.heading, styles.title]}>{title}</Text>
      {message ? <Text style={[theme.type.caption, styles.message]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  title: { marginTop: spacing.md, textAlign: 'center' },
  message: { marginTop: spacing.sm, textAlign: 'center' },
});
