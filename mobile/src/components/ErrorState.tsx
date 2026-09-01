import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ErrorState({ title, message, onRetry, icon = 'alert-circle-outline' }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: theme.colors.errorBg }]}>
        <Ionicons name={icon} size={28} color={theme.colors.error} />
      </View>
      <Text style={[theme.type.heading, styles.title]}>{title ?? t('states.error')}</Text>
      <Text style={[theme.type.caption, styles.message]}>{message ?? t('states.errorHint')}</Text>
      {onRetry ? <PrimaryButton title={t('states.retry')} onPress={onRetry} variant="outline" style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: spacing.sm },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
