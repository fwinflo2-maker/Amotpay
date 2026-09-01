import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError, isFeatureAvailable } from '../../api';
import type { Country, PaymentMethod } from '../../api/types';
import type { V2Quote, V2Transfer } from '../../api/transfersV2';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/designTokens';
import { normalizePhone } from '../../utils/transfer';
import type { Person } from './people';
import { loadPeople, toggleFavorite, upsertPerson } from './peopleStorage';
import { RecipientStep } from './RecipientStep';
import { mapTransferStatus } from './transferStatus';

const STEPS = ['recipient', 'amount', 'destination', 'method', 'review', 'confirm'] as const;
type Step = (typeof STEPS)[number];

function idempotencyKey() {
  return `amot-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/\s/g, '').replace(/,/g, ''));
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

export function UniversalSendScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('recipient');
  const [countries, setCountries] = useState<Country[]>([]);
  const [destinations, setDestinations] = useState<Country[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eligible, setEligible] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [quote, setQuote] = useState<V2Quote | null>(null);
  const [result, setResult] = useState<V2Transfer | null>(null);
  const [idemKey] = useState(idempotencyKey);

  const stepIndex = STEPS.indexOf(step);
  const destMeta = destinations.find((c) => c.code === destCountry) ?? countries.find((c) => c.code === destCountry);

  const loadBootstrap = useCallback(async () => {
    try {
      setError('');
      const [countryList, corridorList, eligibility, savedPeople] = await Promise.all([
        api.countries(),
        api.corridors(),
        api.eligibility(),
        loadPeople(),
      ]);
      setCountries(countryList);
      setPeople(savedPeople);
      const destCodes = new Set(corridorList.map((c) => c.destination_country));
      const available = countryList.filter((c) => destCodes.has(c.code));
      setDestinations(available);
      const transfer = eligibility.features.international_transfer;
      setEligible(isFeatureAvailable(transfer));
      if (!isFeatureAvailable(transfer)) {
        setError(transfer.reason ?? t('send.unavailable'));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('states.errorHint'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!destCountry) return;
    setMethods([]);
    setPaymentMethod('');
    setQuote(null);
    api.paymentMethods(destCountry, 'CASHRAMP')
      .then((m: PaymentMethod[]) => {
        setMethods(m);
        setPaymentMethod(m[0]?.provider_code ?? '');
      })
      .catch(() => setMethods([]));
  }, [destCountry]);

  useEffect(() => {
    setQuote(null);
  }, [amount, paymentMethod]);

  const formatArrival = (expiresAt?: string) => {
    if (!expiresAt) return '—';
    try {
      return new Date(expiresAt).toLocaleString();
    } catch {
      return expiresAt;
    }
  };

  const selectPerson = (p: Person) => {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setPhone(p.phone);
    if (p.countryCode) setDestCountry(p.countryCode);
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
    setPeople(await loadPeople());
  };

  const fetchQuote = async () => {
    setBusy(true);
    setError('');
    try {
      await api.ensureCashrampCustomer();
      const q = await api.quote({
        source_amount: parseAmount(amount),
        source_currency: user?.currency ?? 'XAF',
        destination_country: destCountry,
        destination_currency: destMeta?.currency ?? 'XOF',
        payment_method: paymentMethod,
        payout_method: paymentMethod,
      });
      setQuote(q);
      setStep('confirm');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(t('states.errorHint'), 'UNKNOWN');
      if (err.code === 'QUOTE_EXPIRED') setError(t('send.quoteExpired'));
      else if (err.code === 'KYC_REQUIRED' || err.code === 'TRANSFER_NOT_ELIGIBLE') setError(t('send.kycRequired'));
      else if (err.code === 'PROVIDER_UNAVAILABLE' || err.code === 'PROVIDER_NOT_CONFIGURED') setError(t('send.providerUnavailable'));
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmTransfer = async () => {
    if (!quote) return;
    const prefix = destMeta?.phone_prefix ?? '';
    const normalized = normalizePhone(phone, prefix);
    if (!normalized.value) {
      setError(normalized.error ?? t('send.invalidPhone'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const transfer = await api.create(
        {
          quote_id: quote.quote_id,
          payout_method: paymentMethod,
          recipient: {
            phone: normalized.value,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            country_code: destCountry,
          },
        },
        idemKey,
      );
      await upsertPerson({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalized.value,
        countryCode: destCountry,
      });
      setPeople(await loadPeople());
      setResult(transfer);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('send.transferFailed'));
    } finally {
      setBusy(false);
    }
  };

  const canNext = useMemo(() => {
    if (step === 'recipient') return firstName.trim() && lastName.trim() && phone.trim();
    if (step === 'amount') return parseAmount(amount) > 0;
    if (step === 'destination') return !!destCountry;
    if (step === 'method') return !!paymentMethod;
    return true;
  }, [step, firstName, lastName, phone, amount, destCountry, paymentMethod]);

  const goNext = () => {
    if (step === 'review') {
      void fetchQuote();
      return;
    }
    if (step === 'confirm') {
      void confirmTransfer();
      return;
    }
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };

  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const statusKey = result ? mapTransferStatus(result.status) : 'unknown';
  const statusLabel = t(`send.statusLabels.${statusKey}`);

  if (loading) return <LoadingState />;

  if (result) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background, padding: spacing.lg }]}>
        <View style={[styles.successIcon, { backgroundColor: theme.colors.successBg }]}>
          <Ionicons name={statusKey === 'failed' ? 'close' : 'checkmark'} size={36} color={statusKey === 'failed' ? theme.colors.error : theme.colors.success} />
        </View>
        <Text style={theme.type.display}>{statusKey === 'failed' ? t('send.failedTitle') : t('send.successTitle')}</Text>
        <Text style={[theme.type.caption, { marginTop: spacing.sm }]}>
          {statusKey === 'failed' ? t('send.transferFailed') : t('send.successHint')}
        </Text>
        <SurfaceCard style={{ marginTop: spacing.lg }}>
          <Row label={t('send.reference')} value={result.reference} theme={theme} />
          <Row label={t('send.status')} value={statusLabel} theme={theme} />
        </SurfaceCard>
        <PrimaryButton
          title={t('send.newTransfer')}
          onPress={() => {
            setResult(null);
            setStep('recipient');
            setQuote(null);
            setAmount('');
          }}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    );
  }

  if (!eligible && !error) {
    return <ErrorState title={t('send.unavailable')} message={t('send.unavailableHint')} />;
  }

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={theme.type.label}>{t('send.step', { current: stepIndex + 1, total: STEPS.length })}</Text>
      <Text style={[theme.type.title, { marginTop: spacing.xs }]}>{t(`send.steps.${step}`)}</Text>

      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressDot, { backgroundColor: i <= stepIndex ? theme.colors.accent : theme.colors.border }]} />
        ))}
      </View>

      {step === 'recipient' && (
        <RecipientStep
          people={people}
          firstName={firstName}
          lastName={lastName}
          phone={phone}
          onSelect={selectPerson}
          onToggleFavorite={handleToggleFavorite}
          onChangeFirstName={setFirstName}
          onChangeLastName={setLastName}
          onChangePhone={setPhone}
        />
      )}

      {step === 'amount' && (
        <SurfaceCard>
          <TextInput
            style={[theme.type.financial, styles.amountInput, { color: theme.colors.text }]}
            value={amount}
            onChangeText={(v) => setAmount(formatAmountInput(v))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={[theme.type.caption, { textAlign: 'center' }]}>{user?.currency}</Text>
        </SurfaceCard>
      )}

      {step === 'destination' && (
        <View style={styles.chips}>
          {destinations.length === 0 ? (
            <Text style={theme.type.caption}>{t('send.noDestinations')}</Text>
          ) : (
            destinations.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setDestCountry(c.code)}
                style={[styles.chip, { borderColor: destCountry === c.code ? theme.colors.accent : theme.colors.border, backgroundColor: destCountry === c.code ? theme.colors.accentMuted : theme.colors.surface }]}
              >
                <Text style={theme.type.subtitle}>{c.name}</Text>
                <Text style={theme.type.caption}>{c.currency}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      {step === 'method' && (
        <View style={styles.chips}>
          {methods.length === 0 ? (
            <Text style={theme.type.caption}>{t('send.noMethods')}</Text>
          ) : (
            methods.map((m) => (
              <Pressable
                key={m.provider_code}
                onPress={() => setPaymentMethod(m.provider_code)}
                style={[styles.chip, { borderColor: paymentMethod === m.provider_code ? theme.colors.accent : theme.colors.border, backgroundColor: paymentMethod === m.provider_code ? theme.colors.accentMuted : theme.colors.surface }]}
              >
                <Text style={theme.type.subtitle}>{m.name}</Text>
                <Text style={theme.type.caption}>{m.type}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      {step === 'review' && (
        <SurfaceCard>
          <Row label={t('send.youSend')} value={`${amount || '0'} ${user?.currency}`} theme={theme} />
          <Row label={t('send.recipient')} value={`${firstName} ${lastName}`} theme={theme} />
          <Row label={t('send.destination')} value={destMeta?.name ?? destCountry} theme={theme} />
          <Row label={t('send.method')} value={methods.find((m) => m.provider_code === paymentMethod)?.name ?? paymentMethod} theme={theme} />
          <Text style={[theme.type.caption, { marginTop: spacing.sm }]}>{t('send.reviewHint')}</Text>
        </SurfaceCard>
      )}

      {step === 'confirm' && quote && (
        <SurfaceCard>
          <Row label={t('send.youSend')} value={`${quote.you_send.amount} ${quote.you_send.currency}`} theme={theme} />
          <Row label={t('send.recipientGets')} value={`${quote.recipient_gets.amount} ${quote.recipient_gets.currency}`} theme={theme} />
          <Row label={t('send.fee')} value={`${quote.fee.total ?? '0'} ${quote.fee.currency}`} theme={theme} />
          <Row label={t('send.rate')} value={quote.exchange_rate} theme={theme} />
          <Row label={t('send.arrival')} value={formatArrival(quote.expires_at)} theme={theme} />
        </SurfaceCard>
      )}

      {error ? <Text style={{ color: theme.colors.error, marginTop: spacing.md }}>{error}</Text> : null}

      <View style={styles.actions}>
        {stepIndex > 0 && step !== 'confirm' ? (
          <PrimaryButton title={t('send.back')} onPress={goBack} variant="ghost" style={styles.actionBtn} />
        ) : null}
        <PrimaryButton
          title={step === 'review' ? t('send.getQuote') : step === 'confirm' ? t('send.confirmTransfer') : t('send.continue')}
          onPress={goNext}
          loading={busy}
          disabled={!canNext || busy}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={styles.row}>
      <Text style={theme.type.caption}>{label}</Text>
      <Text style={theme.type.subtitle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  progress: { flexDirection: 'row', gap: 6, marginVertical: spacing.md },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  chips: { gap: spacing.sm, marginTop: spacing.md },
  chip: { padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  amountInput: { fontSize: 40, textAlign: 'center', marginVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  actionBtn: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
});
