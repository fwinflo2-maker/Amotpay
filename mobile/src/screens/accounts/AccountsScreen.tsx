import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, isFeatureAvailable } from '../../api';
import type { Eligibility } from '../../api/types';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/designTokens';

export function AccountsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setEligibility(await api.eligibility());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const usd = eligibility?.features.usd_account;
  const eur = eligibility?.features.eur_account;
  const hasAny = (usd && isFeatureAvailable(usd)) || (eur && isFeatureAvailable(eur));

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={theme.type.display}>{t('accounts.title')}</Text>
      <Text style={[theme.type.caption, { marginTop: spacing.sm, marginBottom: spacing.lg }]}>{t('accounts.subtitle')}</Text>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState onRetry={load} /> : null}

      {!loading && !error && !hasAny ? (
        <EmptyState title={t('accounts.empty')} message={t('accounts.emptyHint')} icon="wallet-outline" />
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          <AccountCard label={t('accounts.usd')} feature={usd} />
          <AccountCard label={t('accounts.eur')} feature={eur} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function AccountCard({ label, feature }: { label: string; feature?: { status: string; reason: string | null } }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const available = feature && isFeatureAvailable(feature);
  const status = available ? t('home.pendingProvider') : t('home.unavailable');

  return (
    <SurfaceCard style={styles.card}>
      <Text style={theme.type.heading}>{label}</Text>
      <Text style={[theme.type.caption, { marginTop: spacing.xs }]}>{status}</Text>
      {feature?.reason && !available ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted, marginTop: spacing.xs }]}>{feature.reason}</Text>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  list: { gap: spacing.md },
  card: { marginBottom: spacing.sm },
});
