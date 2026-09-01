import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, Transfer } from '../api/client';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { colors, radius, spacing } from '../theme';

const COUNTRY_FLAGS: Record<string, string> = {
  CM: '🇨🇲', CI: '🇨🇮', GH: '🇬🇭', SN: '🇸🇳', BJ: '🇧🇯',
};

const FILTERS = [
  { key: 'ALL', label: 'Tous' },
  { key: 'SUCCESS', label: 'Réussis' },
  { key: 'PENDING', label: 'En cours' },
] as const;

export function HistoryScreen() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('ALL');

  const load = useCallback(async () => {
    try {
      setError('');
      setTransfers(await api.transfers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Historique indisponible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (filter === 'ALL') return transfers;
    if (filter === 'SUCCESS') return transfers.filter(t => ['SUCCESS', 'COMPLETED'].includes(t.status?.toUpperCase()));
    return transfers.filter(t => ['PENDING', 'PROCESSING'].includes(t.status?.toUpperCase()));
  }, [transfers, filter]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <Text style={styles.title}>Historique</Text>
      <Text style={styles.subtitle}>Suivez tous vos transferts en un coup d'œil</Text>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={{ padding: filtered.length ? spacing.xs : spacing.lg }}>
        {loading ? <ActivityIndicator color={colors.deepGreen} style={styles.loader} /> : null}
        {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={28} color={colors.muted} />
            <Text style={styles.empty}>Aucun transfert</Text>
          </View>
        ) : null}
        {!loading && !error && filtered.map((transfer, idx) => (
          <View key={transfer.id} style={[styles.row, idx === 0 && styles.rowFirst]}>
            <View style={styles.iconWrap}>
              <Text style={styles.flag}>{COUNTRY_FLAGS[transfer.destination_country] ?? '🌍'}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.ref}>{transfer.reference}</Text>
              <Text style={styles.meta}>{transfer.destination_country} · {Number(transfer.destination_amount).toLocaleString('fr-FR')} {transfer.destination_currency}</Text>
              <Text style={styles.date}>{new Date(transfer.created_at).toLocaleString('fr-FR')}</Text>
            </View>
            <StatusBadge status={transfer.status} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.anthracite },
  subtitle: { fontSize: 13.5, color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: '#EEF1EE', marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.deepGreen },
  filterText: { color: colors.muted, fontWeight: '700', fontSize: 12.5 },
  filterTextActive: { color: colors.white },
  loader: { paddingVertical: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg },
  empty: { color: colors.muted, marginTop: spacing.sm },
  error: { color: colors.error, textAlign: 'center', padding: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowFirst: { borderTopWidth: 0 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F4F1',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  flag: { fontSize: 18 },
  details: { flex: 1, marginRight: spacing.sm },
  ref: { fontWeight: '700', color: colors.anthracite, fontSize: 13.5 },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  date: { fontSize: 11, color: colors.mutedLight, marginTop: 3 },
});
