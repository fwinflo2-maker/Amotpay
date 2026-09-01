import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import type { Transfer } from '../../api/types';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/designTokens';

const FILTERS = ['ALL', 'SUCCESS', 'PENDING'] as const;

function dayKey(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (start.getTime() - day.getTime()) / 86400000;
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return 'earlier';
}

export function ActivityScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const load = useCallback(async () => {
    try {
      setError(false);
      setTransfers(await api.transfers());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === 'ALL') return transfers;
    return transfers.filter((tr) => tr.status === filter || (filter === 'PENDING' && tr.status === 'PROCESSING'));
  }, [transfers, filter]);

  const grouped = useMemo(() => {
    const map: Record<string, Transfer[]> = { today: [], yesterday: [], earlier: [] };
    filtered.forEach((tr) => map[dayKey(tr.created_at)].push(tr));
    return map;
  }, [filtered]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
    >
      <Text style={theme.type.display}>{t('activity.title')}</Text>

      <View style={styles.filters}>
        {FILTERS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.chip, filter === key && { backgroundColor: theme.colors.accentMuted, borderColor: theme.colors.accent }]}
          >
            <Text style={[theme.type.caption, filter === key && { color: theme.colors.accent }]}>
              {t(`activity.filters.${key === 'ALL' ? 'all' : key === 'SUCCESS' ? 'success' : 'pending'}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState onRetry={load} /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState title={t('activity.empty')} icon="time-outline" />
      ) : null}

      {(['today', 'yesterday', 'earlier'] as const).map((section) =>
        grouped[section].length > 0 ? (
          <View key={section}>
            <Text style={[theme.type.label, styles.section]}>{t(`activity.${section}`)}</Text>
            <SurfaceCard style={{ paddingVertical: spacing.xs }}>
              {grouped[section].map((tr, idx) => (
                <View
                  key={tr.id}
                  style={[styles.row, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle }]}
                >
                  <View style={[styles.icon, { backgroundColor: theme.colors.successBg }]}>
                    <Ionicons name="arrow-up" size={18} color={theme.colors.success} />
                  </View>
                  <View style={styles.info}>
                    <Text style={theme.type.subtitle}>{tr.recipient_first_name} {tr.recipient_last_name}</Text>
                    <Text style={theme.type.caption}>
                      {Number(tr.source_amount).toLocaleString()} {tr.source_currency} → {Number(tr.destination_amount).toLocaleString()} {tr.destination_currency}
                    </Text>
                  </View>
                  <StatusBadge status={tr.status} />
                </View>
              ))}
            </SurfaceCard>
          </View>
        ) : null,
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  filters: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  section: { marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  info: { flex: 1, marginRight: spacing.sm },
});
