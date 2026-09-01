import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/designTokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentMuted }]}>
        <Ionicons name="key-outline" size={28} color={theme.colors.accent} />
      </View>
      <Text style={theme.type.display}>{t('auth.forgotTitle')}</Text>
      <Text style={[theme.type.body, { color: theme.colors.textSecondary, marginTop: spacing.md }]}>{t('auth.forgotBody')}</Text>

      <SurfaceCard style={{ marginTop: spacing.xl }}>
        <Text style={theme.type.caption}>{t('auth.forgotNote')}</Text>
      </SurfaceCard>

      <PrimaryButton title={t('auth.backToSignIn')} onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
});
