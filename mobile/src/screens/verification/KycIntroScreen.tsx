import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { markKycPromptShown } from '../../context/session';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/designTokens';

type Props = NativeStackScreenProps<RootStackParamList, 'KycIntro'>;

export function KycIntroScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const continueToApp = async () => {
    await markKycPromptShown();
    navigation.replace('Main');
  };

  const startVerification = async () => {
    await markKycPromptShown();
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Verification' }],
    });
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentMuted }]}>
        <Ionicons name="shield-checkmark-outline" size={32} color={theme.colors.accent} />
      </View>
      <Text style={theme.type.display}>{t('kycIntro.title')}</Text>
      <Text style={[theme.type.body, { color: theme.colors.textSecondary, marginTop: spacing.md }]}>{t('kycIntro.subtitle')}</Text>

      <SurfaceCard style={{ marginTop: spacing.xl }}>
        <Bullet text={t('kycIntro.need1')} theme={theme} />
        <Bullet text={t('kycIntro.need2')} theme={theme} />
        <Bullet text={t('kycIntro.need3')} theme={theme} />
      </SurfaceCard>

      <Text style={[theme.type.caption, { marginTop: spacing.lg, textAlign: 'center' }]}>{t('kycIntro.secure')}</Text>

      <PrimaryButton title={t('kycIntro.start')} onPress={startVerification} style={{ marginTop: spacing.xl }} />
      <PrimaryButton title={t('kycIntro.later')} onPress={continueToApp} variant="ghost" style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function Bullet({ text, theme }: { text: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
      <Text style={[theme.type.body, { flex: 1, marginLeft: spacing.sm }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
});
