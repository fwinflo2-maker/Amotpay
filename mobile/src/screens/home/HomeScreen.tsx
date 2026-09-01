import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useHomeData } from '../../hooks/useHomeData';
import { isFeatureAvailable } from '../../api';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { FlowMark } from '../../components/FlowMark';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SkeletonCard } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { gradients, radius, spacing } from '../../theme/designTokens';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function HomeScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const { eligibility, kyc, transfers, loading, error, offline, reload, hasDigital, digitalTotal, showKycBanner } = useHomeData();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const heroColors = theme.isDark ? gradients.heroDark : gradients.heroLight;
  const usd = eligibility?.features.usd_account;
  const eur = eligibility?.features.eur_account;
  const transferOk = eligibility ? isFeatureAvailable(eligibility.features.international_transfer) : false;

  const formatMoney = (amount: number, currency = 'USD') => {
    if (!balanceVisible) return t('home.balanceHidden');
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={heroColors} style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[theme.type.caption, { color: theme.colors.textInverse, opacity: 0.75 }]}>
              {t(`greeting.${greetingKey()}`)}
            </Text>
            <Text style={theme.type.titleInverse}>{user?.first_name ?? t('brand')}</Text>
          </View>
          <View style={styles.heroActions}>
            <FlowMark size={40} />
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={styles.iconBtn}
              accessibilityLabel={t('settings.title')}
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.textInverse} />
            </Pressable>
          </View>
        </View>

        <SurfaceCard style={[styles.balanceCard, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }]}>
          <View style={styles.balanceHeader}>
            <Text style={[theme.type.label, { color: 'rgba(255,255,255,0.7)' }]}>{t('home.totalBalance')}</Text>
            <Pressable onPress={() => setBalanceVisible((v) => !v)} hitSlop={12} accessibilityLabel="Toggle balance">
              <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
          {loading ? (
            <SkeletonCard />
          ) : hasDigital ? (
            <Text style={theme.type.numericInverse}>{formatMoney(digitalTotal)}</Text>
          ) : (
            <Text style={[theme.type.subtitle, { color: 'rgba(255,255,255,0.75)', marginTop: spacing.sm }]}>
              {t('home.unavailable')}
            </Text>
          )}
        </SurfaceCard>

        <View style={styles.ctaRow}>
          <PrimaryButton
            title={t('home.send')}
            onPress={() => navigation.navigate('Send')}
            style={styles.cta}
            disabled={!transferOk && !loading}
          />
          <PrimaryButton title={t('home.receive')} onPress={() => {}} variant="outline" style={styles.cta} disabled />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {showKycBanner ? (
          <Pressable onPress={() => navigation.navigate('Verification')}>
            <SurfaceCard style={[styles.kycBanner, { backgroundColor: theme.colors.accentMuted }]}>
              <Text style={theme.type.heading}>{t('kycBanner.title')}</Text>
              <Text style={[theme.type.caption, { marginTop: 4 }]}>{t('kycBanner.body')}</Text>
              <Text style={[theme.type.subtitle, { color: theme.colors.accent, marginTop: spacing.sm }]}>
                {t('kycBanner.cta')} →
              </Text>
            </SurfaceCard>
          </Pressable>
        ) : null}

        {offline ? (
          <ErrorState title={t('states.offline')} message={t('states.offlineHint')} onRetry={reload} icon="cloud-offline-outline" />
        ) : error && !eligibility ? (
          <ErrorState message={t('states.errorHint')} onRetry={reload} />
        ) : null}

        <Text style={[theme.type.label, styles.sectionLabel]}>{t('home.yourMoney')}</Text>
        <SurfaceCard>
          <MoneyRow
            label={t('accounts.usd')}
            value={usd && isFeatureAvailable(usd) ? t('home.pendingProvider') : t('home.unavailable')}
            themeMuted={theme.colors.textMuted}
            hidden={!balanceVisible}
          />
          <MoneyRow
            label={t('accounts.eur')}
            value={eur && isFeatureAvailable(eur) ? t('home.pendingProvider') : t('home.unavailable')}
            themeMuted={theme.colors.textMuted}
            hidden={!balanceVisible}
            last
          />
        </SurfaceCard>

        <Text style={[theme.type.label, styles.sectionLabel]}>{t('home.digitalAssets')}</Text>
        <SurfaceCard>
          {loading ? (
            <SkeletonCard />
          ) : hasDigital ? (
            <Text style={theme.type.financial}>{formatMoney(digitalTotal)}</Text>
          ) : (
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {eligibility && !isFeatureAvailable(eligibility.features.crypto)
                ? t('home.verifyToUnlock')
                : t('wallet.emptyHint')}
            </Text>
          )}
        </SurfaceCard>

        <View style={styles.sectionHeader}>
          <Text style={theme.type.heading}>{t('home.recentActivity')}</Text>
          {transfers.length > 3 ? (
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={[theme.type.subtitle, { color: theme.colors.accent }]}>{t('home.seeAll')}</Text>
            </Pressable>
          ) : null}
        </View>

        <SurfaceCard style={{ paddingVertical: spacing.xs }}>
          {loading ? <SkeletonCard /> : null}
          {!loading && transfers.length === 0 ? (
            <EmptyState title={t('home.noActivity')} message={t('home.noActivityHint')} icon="swap-horizontal-outline" />
          ) : null}
          {!loading &&
            transfers.slice(0, 3).map((tr, idx) => (
              <View key={tr.id} style={[styles.activityRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle }]}>
                <View style={[styles.activityIcon, { backgroundColor: theme.colors.successBg }]}>
                  <Ionicons name="arrow-up" size={18} color={theme.colors.success} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={theme.type.subtitle}>{tr.reference}</Text>
                  <Text style={theme.type.caption}>
                    {tr.destination_country} · {Number(tr.destination_amount).toLocaleString()} {tr.destination_currency}
                  </Text>
                </View>
                <StatusBadge status={tr.status} />
              </View>
            ))}
        </SurfaceCard>

        {kyc ? (
          <Text style={[theme.type.caption, styles.kycFoot]}>
            {t('verification.title')}: {kyc.display_status}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function MoneyRow({
  label,
  value,
  themeMuted,
  hidden,
  last,
}: {
  label: string;
  value: string;
  themeMuted: string;
  hidden: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.moneyRow, !last && styles.moneyRowBorder]}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: themeMuted }}>{hidden ? '••••' : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: spacing.sm, marginLeft: spacing.sm },
  balanceCard: { marginTop: spacing.lg },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cta: { flex: 1 },
  body: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { marginTop: spacing.md, marginBottom: spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  kycBanner: { marginBottom: spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  activityIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  activityInfo: { flex: 1 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  moneyRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  kycFoot: { textAlign: 'center', marginTop: spacing.md },
});
