import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, Country, FiatQuote, PaymentMethod, Transfer, TransferRequest } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { isBeneficiaryRejected, normalizePhone, validateAmount } from '../utils/transfer';

type Confirmation = Readonly<{
  payload: Readonly<TransferRequest>;
  quote: Readonly<FiatQuote>;
  idempotencyKey: string;
  countryName: string;
  methodName: string;
}>;

const money = (value: number, currency: string) => `${Number(value).toLocaleString('fr-FR')} ${currency}`;

const STEPS = ['Détails', 'Confirmation', 'Reçu'] as const;

function Stepper({ step }: { step: number }) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((label, idx) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, idx <= step && styles.stepDotActive]}>
              {idx < step ? (
                <Ionicons name="checkmark" size={13} color={colors.white} />
              ) : (
                <Text style={[styles.stepNumber, idx <= step && styles.stepNumberActive]}>{idx + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, idx === step && styles.stepLabelActive]}>{label}</Text>
          </View>
          {idx < STEPS.length - 1 && <View style={[styles.stepLine, idx < step && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

export function SendScreen() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [corridors, setCorridors] = useState<{ destination_country: string; provider: string }[]>([]);
  const [destCountry, setDestCountry] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [result, setResult] = useState<Transfer | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.countries(), api.corridors()])
      .then(([countryList, corridorList]) => {
        if (!active) return;
        const cashrampCorridors = corridorList.filter(c => c.provider.toUpperCase() === 'CASHRAMP');
        setCountries(countryList);
        setCorridors(cashrampCorridors);
        setDestCountry(cashrampCorridors[0]?.destination_country ?? '');
        setLoadError(cashrampCorridors.length ? '' : 'Aucun corridor de transfert disponible.');
      })
      .catch(e => active && setLoadError(e instanceof Error ? e.message : 'Chargement impossible.'))
      .finally(() => active && setInitialLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!destCountry) {
      setMethods([]);
      setPaymentMethod('');
      return;
    }
    let active = true;
    const provider = corridors.find(c => c.destination_country === destCountry)?.provider ?? 'CASHRAMP';
    setMethodsLoading(true);
    setPaymentMethod('');
    api.paymentMethods(destCountry, provider)
      .then(list => {
        if (!active) return;
        setMethods(list);
        setPaymentMethod(list[0]?.provider_code ?? '');
        setLoadError(list.length ? '' : 'Aucune méthode de paiement disponible pour ce corridor.');
      })
      .catch(e => {
        if (!active) return;
        setMethods([]);
        setLoadError(e instanceof Error ? e.message : 'Méthodes de paiement indisponibles.');
      })
      .finally(() => active && setMethodsLoading(false));
    return () => { active = false; };
  }, [corridors, destCountry]);

  const selectedCountry = countries.find(c => c.code === destCountry);
  const selectedMethod = methods.find(m => m.provider_code === paymentMethod);

  const handleQuote = async () => {
    if (!selectedCountry || !selectedMethod || !user) {
      Alert.alert('Indisponible', 'Sélectionnez un pays et une méthode de paiement disponibles.');
      return;
    }
    const amountResult = validateAmount(amount, Number(selectedMethod.min_amount), Number(selectedMethod.max_amount));
    if ('error' in amountResult) {
      Alert.alert('Montant invalide', amountResult.error);
      return;
    }
    const phoneResult = normalizePhone(phone, selectedCountry.phone_prefix);
    if ('error' in phoneResult) {
      Alert.alert('Téléphone invalide', phoneResult.error);
      return;
    }
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    if (!cleanFirstName || !cleanLastName) {
      Alert.alert('Bénéficiaire incomplet', 'Renseignez le prénom et le nom du bénéficiaire.');
      return;
    }

    const payload: TransferRequest = {
      destination_country: selectedCountry.code,
      payment_method: selectedMethod.provider_code,
      amount: amountResult.value,
      recipient_phone: phoneResult.value,
      recipient_first_name: cleanFirstName,
      recipient_last_name: cleanLastName,
      channel: selectedMethod.type,
    };

    try {
      setLoading(true);
      const account = await api.checkBeneficiary({
        phone_number: payload.recipient_phone,
        country_code: payload.destination_country,
        operator_code: payload.payment_method,
        payment_method: payload.payment_method,
        channel: payload.channel,
      });
      if (isBeneficiaryRejected(account)) throw new Error('Le compte bénéficiaire n’a pas été validé.');
      const quote = await api.fiatQuote(payload);
      setConfirmation(Object.freeze({
        payload: Object.freeze({ ...payload }),
        quote: Object.freeze({ ...quote }),
        idempotencyKey: `fiat-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        countryName: selectedCountry.name,
        methodName: selectedMethod.name,
      }));
    } catch (e) {
      Alert.alert('Vérification impossible', e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!confirmation) return;
    const expiration = new Date(confirmation.quote.expires_at).getTime();
    if (Number.isFinite(expiration) && expiration <= Date.now()) {
      setConfirmation(null);
      Alert.alert('Devis expiré', 'Le devis a expiré. Vérifiez à nouveau les informations.');
      return;
    }
    try {
      setLoading(true);
      setResult(await api.createTransfer(confirmation.payload, confirmation.idempotencyKey));
    } catch (e) {
      Alert.alert('Transfert non confirmé', `${e instanceof Error ? e.message : 'Une erreur est survenue.'}\nVous pouvez réessayer sans risque de doublon.`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setConfirmation(null);
    setResult(null);
    setPhone('');
    setFirstName('');
    setLastName('');
    setAmount('');
  };

  if (initialLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.gold} /></View>;
  }

  const step = result ? 2 : confirmation ? 1 : 0;

  if (result && confirmation) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stepper step={step} />
        <View style={styles.successIconWrap}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={36} color={colors.white} />
          </View>
        </View>
        <Text style={styles.successTitle}>Transfert enregistré</Text>
        <Text style={styles.successSubtitle}>Votre transfert a été soumis avec succès</Text>
        <Card style={{ marginTop: spacing.lg }}>
          <SummaryRow icon="pricetag-outline" label="Référence" value={result.reference} />
          <SummaryRow icon="pulse-outline" label="Statut" value={result.status} emphasized />
          <SummaryRow icon="person-outline" label="Bénéficiaire" value={`${confirmation.payload.recipient_first_name} ${confirmation.payload.recipient_last_name}`} />
          <SummaryRow icon="cash-outline" label="Montant reçu" value={money(Number(result.destination_amount), result.destination_currency)} last />
        </Card>
        <Button title="NOUVEAU TRANSFERT" onPress={reset} style={styles.button} />
      </ScrollView>
    );
  }

  if (confirmation) {
    const { payload, quote } = confirmation;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stepper step={step} />
        <Text style={styles.title}>Confirmer le transfert</Text>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark" size={16} color={colors.deepGreen} />
          <Text style={styles.noticeText}>Compte bénéficiaire vérifié. Ces informations sont figées pour cette confirmation.</Text>
        </View>
        <Card>
          <SummaryRow icon="person-outline" label="Bénéficiaire" value={`${payload.recipient_first_name} ${payload.recipient_last_name}`} />
          <SummaryRow icon="call-outline" label="Téléphone" value={payload.recipient_phone} />
          <SummaryRow icon="location-outline" label="Destination" value={confirmation.countryName} />
          <SummaryRow icon="card-outline" label="Réseau" value={confirmation.methodName} />
          <SummaryRow icon="arrow-up-circle-outline" label="Montant envoyé" value={money(Number(quote.source_amount), quote.source_currency)} />
          <SummaryRow icon="swap-horizontal-outline" label="Taux" value={`1 ${quote.source_currency} = ${Number(quote.exchange_rate).toLocaleString('fr-FR')} ${quote.destination_currency}`} />
          <SummaryRow icon="receipt-outline" label="Frais" value={money(Number(quote.provider_fee) + Number(quote.application_fee), quote.source_currency)} />
          <SummaryRow icon="wallet-outline" label="Total à payer" value={money(Number(quote.total_payable), quote.source_currency)} />
          <SummaryRow icon="arrow-down-circle-outline" label="Montant reçu" value={money(Number(quote.destination_amount), quote.destination_currency)} emphasized last />
        </Card>
        <Button title="CONFIRMER LE TRANSFERT" onPress={handleSend} loading={loading} style={styles.button} />
        <Button title="MODIFIER" onPress={() => setConfirmation(null)} variant="outline" style={styles.secondaryButton} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stepper step={step} />
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      <Card>
        <Text style={styles.label}>Depuis</Text>
        <Text style={styles.value}>{user?.country_code} · {user?.currency}</Text>
        <Text style={styles.label}>Vers</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {corridors.map(c => {
            const country = countries.find(item => item.code === c.destination_country);
            const active = destCountry === c.destination_country;
            return (
              <TouchableOpacity key={`${c.destination_country}-${c.provider}`} style={[styles.chip, active && styles.chipActive]} onPress={() => setDestCountry(c.destination_country)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{country?.name ?? c.destination_country}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.label}>Réseau de paiement</Text>
        {methodsLoading ? <ActivityIndicator color={colors.deepGreen} /> : methods.map(method => {
          const active = paymentMethod === method.provider_code;
          return (
            <TouchableOpacity key={method.provider_code} style={[styles.methodRow, active && styles.methodActive]} onPress={() => setPaymentMethod(method.provider_code)}>
              <View style={styles.methodIconWrap}>
                <Ionicons name="card" size={16} color={active ? colors.deepGreen : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodLimit}>{Number(method.min_amount).toLocaleString('fr-FR')} à {Number(method.max_amount).toLocaleString('fr-FR')} {method.currency}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.deepGreen} />}
            </TouchableOpacity>
          );
        })}
        <Text style={styles.label}>Bénéficiaire</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={16} color={colors.muted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder={`${selectedCountry?.phone_prefix ?? '+'} …`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={16} color={colors.muted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={16} color={colors.muted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        </View>
        <Text style={styles.label}>Montant ({user?.currency})</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="cash-outline" size={16} color={colors.muted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="100 000" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        </View>
      </Card>
      <Button title="VÉRIFIER ET CONTINUER" onPress={handleQuote} loading={loading} disabled={!paymentMethod || methodsLoading} style={styles.button} />
    </ScrollView>
  );
}

function SummaryRow({ icon, label, value, emphasized = false, last = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; emphasized?: boolean; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={15} color={emphasized ? colors.deepGreen : colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, emphasized && styles.emphasized]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },

  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#E3E7E3',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.deepGreen },
  stepNumber: { fontSize: 11, fontWeight: '800', color: colors.muted },
  stepNumberActive: { color: colors.white },
  stepLabel: { fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: '600' },
  stepLabelActive: { color: colors.deepGreen },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E3E7E3', marginHorizontal: 6, marginBottom: 16 },
  stepLineActive: { backgroundColor: colors.deepGreen },

  title: { fontSize: 22, fontWeight: '800', color: colors.anthracite, marginBottom: spacing.md },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.successBg,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  noticeText: { color: colors.deepGreen, marginLeft: spacing.sm, flex: 1, lineHeight: 19, fontSize: 13 },
  error: { color: colors.error, marginBottom: spacing.md },
  label: { fontSize: 11, color: colors.muted, marginTop: spacing.md, marginBottom: 6, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6 },
  value: { fontSize: 17, fontWeight: '700', color: colors.anthracite },
  chips: { flexDirection: 'row', marginVertical: spacing.xs },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: '#EEF1EE', marginRight: 8 },
  chipActive: { backgroundColor: colors.deepGreen },
  chipText: { color: colors.anthracite, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.white },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md,
    backgroundColor: '#F5F6F4', marginBottom: 8, borderWidth: 1, borderColor: 'transparent',
  },
  methodActive: { backgroundColor: colors.successBg, borderColor: colors.deepGreen },
  methodIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  methodName: { color: colors.anthracite, fontWeight: '700', fontSize: 13.5 },
  methodLimit: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F4', borderRadius: radius.md,
    paddingHorizontal: spacing.md, marginBottom: 8,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.anthracite, paddingVertical: 14, fontSize: 15 },
  button: { marginTop: spacing.lg },
  secondaryButton: { marginTop: spacing.sm },

  summaryRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryIconWrap: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: '#F2F4F1',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 1,
  },
  summaryLabel: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  summaryValue: { color: colors.anthracite, fontSize: 15.5, marginTop: 3, fontWeight: '600' },
  emphasized: { color: colors.deepGreen, fontWeight: '800' },

  successIconWrap: { alignItems: 'center', marginTop: spacing.md },
  successIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.anthracite, textAlign: 'center', marginTop: spacing.md },
  successSubtitle: { fontSize: 13.5, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
