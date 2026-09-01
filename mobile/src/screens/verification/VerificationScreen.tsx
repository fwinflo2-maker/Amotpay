import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../api';
import type { KycStatus } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { isSumsubNativeAvailable, launchSumsubVerification } from '../../features/kyc/sumsubLauncher';
import { spacing } from '../../theme/designTokens';

export function VerificationScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nativeSdk = isSumsubNativeAvailable();

  const load = useCallback(async () => {
    try {
      setError(null);
      setKyc(await api.kycStatus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('states.errorHint'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const session = await api.kycStart();
      if (nativeSdk && session.access_token) {
        const outcome = await launchSumsubVerification(session);
        if (outcome === 'unavailable') {
          setError(t('verification.sdkUnavailable'));
        }
      }
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('states.errorHint');
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('verification.title'),
      headerStyle: { backgroundColor: theme.colors.backgroundElevated },
      headerTintColor: theme.colors.text,
    });
  }, [navigation, t, theme]);

  const statusLabel = (() => {
    if (!kyc) return '';
    if (kyc.verified) return t('verification.verified');
    if (kyc.action_required) return t('verification.actionRequired');
    if (kyc.status === 'PENDING' || kyc.status === 'IN_REVIEW') return t('verification.inProgress');
    return t('verification.notStarted');
  })();

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {loading ? <LoadingState /> : null}

      {!loading && kyc ? (
        <SurfaceCard>
          <Text style={theme.type.label}>{t('verification.title')}</Text>
          <Text style={[theme.type.title, { marginTop: spacing.sm }]}>{statusLabel}</Text>
          <Text style={[theme.type.caption, { marginTop: spacing.sm }]}>{kyc.display_status}</Text>

          {!kyc.verified && (kyc.status === 'PENDING' || kyc.status === 'IN_REVIEW') ? (
            <Text style={[theme.type.body, { marginTop: spacing.lg }]}>{t('verification.submittedHint')}</Text>
          ) : null}

          {!kyc.verified && kyc.status !== 'PENDING' && kyc.status !== 'IN_REVIEW' ? (
            <PrimaryButton
              title={t('verification.start')}
              onPress={onStart}
              loading={starting}
              style={{ marginTop: spacing.lg }}
            />
          ) : null}
        </SurfaceCard>
      ) : null}

      {error ? (
        <View style={{ marginTop: spacing.lg }}>
          <ErrorState message={error} onRetry={kyc ? onStart : load} />
        </View>
      ) : null}

      <Text style={[theme.type.caption, { marginTop: spacing.xl, textAlign: 'center' }]}>
        {nativeSdk ? t('verification.sdkReady') : t('verification.sdkBuildRequired')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
});
