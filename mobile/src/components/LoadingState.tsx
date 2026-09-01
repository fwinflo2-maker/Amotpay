import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';

export function LoadingState({ label }: { label?: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={[theme.type.caption, styles.label]}>{label ?? t('states.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  label: { marginTop: spacing.md },
});
