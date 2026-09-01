import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api, Transfer } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, radius, shadow, spacing, typography } from '../theme';

const COUNTRY_FLAGS: Record<string, string> = {
  CM: '🇨🇲', CI: '🇨🇮', GH: '🇬🇭', SN: '🇸🇳', BJ: '🇧🇯',
};

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setTransfers(await api.transfers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activités indisponibles.');
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

  const totalSent = transfers.reduce((sum, t) => sum + Number(t.source_amount || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <LinearGradient colors={gradients.hero} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.patternA} />
        <View style={styles.patternB} />
        <View style={styles.topRow}>
          <View>
            <Text style={typography.subtitle}>Bonjour 👋</Text>
            <Text style={typography.title}>{user?.first_name ?? 'Utilisateur'}</Text>
          </View>
          <View style={styles.flagBadge}>
            <Text style={styles.flagEmoji}>{COUNTRY_FLAGS[user?.country_code ?? ''] ?? '🌍'}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Volume envoyé</Text>
          <Text style={styles.balanceValue}>
            {totalSent.toLocaleString('fr-FR')} <Text style={styles.balanceCurrency}>{user?.currency}</Text>
          </Text>
          <View style={styles.balanceFooter}>
            <Ionicons name="shield-checkmark" size={13} color={colors.sand} />
            <Text style={styles.balanceFooterText}>Transferts fiat sécurisés · {user?.country_code}</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="paper-plane" label="Envoyer" onPress={() => navigation.navigate('Send')} primary />
          <QuickAction icon="time-outline" label="Historique" onPress={() => navigation.navigate('History')} />
          <QuickAction icon="person-outline" label="Profil" onPress={() => navigation.navigate('Profile')} />
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <Button title="ENVOYER DE L'ARGENT" onPress={() => navigation.navigate('Send')} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernières activités</Text>
          {transfers.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.sectionLink}>Tout voir</Text>
            </TouchableOpacity>
          )}
        </View>
        <Card style={{ padding: transfers.length ? spacing.xs : spacing.lg }}>
          {loading ? <ActivityIndicator color={colors.deepGreen} style={styles.loader} /> : null}
          {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && transfers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="paper-plane-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyText}>Aucun transfert pour le moment</Text>
            </View>
          ) : null}
          {!loading && !error && transfers.slice(0, 3).map((transfer, idx) => (
            <View key={transfer.id} style={[styles.transferRow, idx === 0 && styles.transferRowFirst]}>
              <View style={styles.transferIconWrap}>
                <Ionicons name="arrow-up-circle" size={22} color={colors.forest} />
              </View>
              <View style={styles.transferInfo}>
                <Text style={styles.reference}>{transfer.reference}</Text>
                <Text style={styles.meta}>
                  {COUNTRY_FLAGS[transfer.destination_country] ?? ''} {transfer.destination_country} · {Number(transfer.destination_amount).toLocaleString('fr-FR')} {transfer.destination_currency}
                </Text>
              </View>
              <StatusBadge status={transfer.status} />
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      {primary ? (
        <LinearGradient colors={gradients.gold} style={styles.quickIconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon} size={20} color={colors.deepGreenDark} />
        </LinearGradient>
      ) : (
        <View style={[styles.quickIconCircle, styles.quickIconCircleGhost]}>
          <Ionicons name={icon} size={20} color={colors.offWhite} />
        </View>
      )}
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    padding: spacing.lg, paddingTop: spacing.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  patternA: { position: 'absolute', top: -50, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(212, 175, 55, 0.12)' },
  patternB: { position: 'absolute', bottom: -60, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  flagBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  flagEmoji: { fontSize: 20 },
  balanceCard: {
    marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing.md,
  },
  balanceLabel: { color: colors.sand, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  balanceValue: { color: colors.offWhite, fontSize: 30, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  balanceCurrency: { fontSize: 16, fontWeight: '700', color: colors.sand },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  balanceFooterText: { color: colors.sand, fontSize: 12, marginLeft: 6 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  quickAction: { alignItems: 'center', width: 76 },
  quickIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...shadow.button },
  quickIconCircleGhost: { backgroundColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0, elevation: 0 },
  quickLabel: { color: colors.offWhite, fontSize: 11.5, fontWeight: '600', marginTop: 8 },
  actions: { padding: spacing.lg, marginTop: -spacing.sm },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.anthracite },
  sectionLink: { fontSize: 13, fontWeight: '700', color: colors.forest },
  loader: { paddingVertical: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyText: { color: colors.muted, marginTop: spacing.sm },
  error: { color: colors.error, textAlign: 'center', padding: spacing.md },
  transferRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  transferRowFirst: { borderTopWidth: 0 },
  transferIconWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.successBg,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  transferInfo: { flex: 1, marginRight: spacing.sm },
  reference: { fontWeight: '700', color: colors.anthracite, fontSize: 13.5 },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
