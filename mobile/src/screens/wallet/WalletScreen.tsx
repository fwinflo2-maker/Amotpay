import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, isFeatureAvailable } from '../../api';
import type { Eligibility, Wallet } from '../../api/types';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/designTokens';

export function WalletScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [e, w] = await Promise.all([api.eligibility(), api.wallets().catch(() => [])]);
      setEligibility(e);
      setWallets(w);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const cryptoOn = eligibility ? isFeatureAvailable(eligibility.features.crypto) : false;

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={theme.type.display}>{t('wallet.title')}</Text>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          <Text style={[theme.type.label, styles.section]}>{t('wallet.digitalAssets')}</Text>
          {!cryptoOn || wallets.length === 0 ? (
            <EmptyState
              title={t('wallet.empty')}
              message={cryptoOn ? t('wallet.emptyHint') : t('home.verifyToUnlock')}
              icon="logo-bitcoin"
            />
          ) : (
            wallets.map((w) => (
              <SurfaceCard key={`${w.asset}-${w.network}`} style={styles.card}>
                <Text style={theme.type.heading}>{w.asset}</Text>
                <Text style={[theme.type.caption, { marginTop: 4 }]}>{w.network}</Text>
                <Text style={[theme.type.financial, { marginTop: spacing.sm }]}>
                  {Number(w.available_balance).toLocaleString()} {w.asset}
                </Text>
              </SurfaceCard>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { marginBottom: spacing.md },
});
