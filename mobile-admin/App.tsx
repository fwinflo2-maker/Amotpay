import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, loadAdminToken, saveAdminToken, MagmaSetup } from './src/api';

const C = {
  green: '#0F3D2E',
  greenDark: '#081F18',
  forest: '#2F6F4E',
  gold: '#D4AF37',
  goldLight: '#F4D35E',
  goldDark: '#A9821E',
  bg: '#0B0F14',
  bgElevated: '#121821',
  card: '#161D28',
  cardBorder: '#232C39',
  text: '#F3F5F7',
  muted: '#8B98A8',
  success: '#2ECC71',
  successBg: 'rgba(46, 204, 113, 0.12)',
  error: '#F16063',
  errorBg: 'rgba(241, 96, 99, 0.12)',
};

const GOLD_GRADIENT = [C.goldLight, C.gold, C.goldDark] as const;
const HERO_GRADIENT = [C.greenDark, C.green, C.forest] as const;

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1600);
  };
  return { copiedKey, copy };
}

function SectionCard({ icon, title, subtitle, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={17} color={C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function CopyRow({ label, value, id, copiedKey, onCopy }: { label: string; value: string; id: string; copiedKey: string | null; onCopy: (id: string, value: string) => void }) {
  const copied = copiedKey === id;
  return (
    <View style={styles.copyRow}>
      <Text style={styles.copyLabel}>{label}</Text>
      <View style={styles.copyValueRow}>
        <Text style={styles.copyValue} selectable numberOfLines={1}>{value}</Text>
        <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={() => onCopy(id, value)}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color={copied ? C.success : C.gold} />
          <Text style={[styles.copyBtnText, copied && { color: C.success }]}>{copied ? 'COPIÉ' : 'COPIER'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  const [pin, setPin] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [magmaSetup, setMagmaSetup] = useState<MagmaSetup | null>(null);
  const [cashrampSetup, setCashrampSetup] = useState<any>(null);
  const { copiedKey, copy } = useCopy();

  const [form, setForm] = useState({
    MAGMA_API_URL: 'https://api.magmaonepay.com',
    MAGMA_PRIVATE_KEY: '',
    MAGMA_SECRET_KEY: '',
    MAGMA_WEBHOOK_SECRET: '',
    CASHRAMP_API_URL: 'https://staging.api.useaccrue.com/cashramp/api/graphql',
    CASHRAMP_SECRET_KEY: '',
    CASHRAMP_PUBLIC_KEY: '',
    CASHRAMP_WEBHOOK_TOKEN: '',
  });

  const load = async () => {
    const data = await adminApi.getProviders();
    setMagmaSetup(data.magma_setup);
    setCashrampSetup(data.cashramp_setup);
  };

  useEffect(() => {
    (async () => {
      await loadAdminToken();
      try {
        await load();
        setLoggedIn(true);
      } catch {
        setLoggedIn(false);
      }
      setLoading(false);
    })();
  }, []);

  const handleLogin = async () => {
    try {
      setSaving(true);
      const res = await adminApi.login(pin);
      await saveAdminToken(res.token);
      await load();
      setLoggedIn(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (form.MAGMA_SECRET_KEY.length > 0 && form.MAGMA_SECRET_KEY.length < 40) {
      Alert.alert('Magma', 'La clé secrète Magma doit faire au minimum 40 caractères.');
      return;
    }
    try {
      setSaving(true);
      const res = await adminApi.saveProviders(form);
      Alert.alert(
        'Enregistré',
        `Magma: ${res.health?.magma?.status ?? '?'}\nCashramp: ${res.health?.cashramp?.status ?? '?'}`
      );
      await load();
      setForm(f => ({
        ...f,
        MAGMA_PRIVATE_KEY: '',
        MAGMA_SECRET_KEY: '',
        MAGMA_WEBHOOK_SECRET: '',
        CASHRAMP_SECRET_KEY: '',
        CASHRAMP_PUBLIC_KEY: '',
        CASHRAMP_WEBHOOK_TOKEN: '',
      }));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <LinearGradient colors={HERO_GRADIENT} style={{ flex: 1 }} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style="light" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.loginBox}>
              <View style={styles.logoBadge}>
                <LinearGradient colors={GOLD_GRADIENT} style={styles.logoBadgeInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="shield-checkmark" size={28} color={C.greenDark} />
                </LinearGradient>
              </View>
              <Text style={styles.logo}>AmotPay Admin</Text>
              <Text style={styles.sub}>Configuration Magma & Cashramp</Text>

              <View style={styles.glassCard}>
                <View style={styles.inputWrap}>
                  <Ionicons name="key-outline" size={18} color={C.gold} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Code admin (PIN)"
                    placeholderTextColor="rgba(243,245,247,0.35)"
                    secureTextEntry
                    keyboardType="number-pad"
                    value={pin}
                    onChangeText={setPin}
                  />
                </View>
                <TouchableOpacity onPress={handleLogin} disabled={saving} activeOpacity={0.85}>
                  <LinearGradient colors={GOLD_GRADIENT} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {saving ? <ActivityIndicator color={C.greenDark} /> : <Text style={styles.primaryBtnText}>CONNEXION</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={13} color={C.muted} />
                <Text style={styles.hint}>Contactez l&apos;administrateur système pour obtenir le PIN.</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={HERO_GRADIENT} style={styles.topBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.topBarRow}>
          <View style={styles.topBarBadge}>
            <Ionicons name="shield-checkmark" size={18} color={C.gold} />
          </View>
          <View>
            <Text style={styles.topBarTitle}>AmotPay Admin</Text>
            <Text style={styles.topBarSubtitle}>Console de configuration</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionCard icon="link-outline" title="Magma OnePay — URLs à coller" subtitle="À utiliser lors de la création de clé sur le dashboard Magma">
          {magmaSetup && (
            <>
              <CopyRow id="webhook" label="URL Webhook" value={magmaSetup.webhook_url} copiedKey={copiedKey} onCopy={copy} />
              <CopyRow id="success" label="URL Succès" value={magmaSetup.success_url} copiedKey={copiedKey} onCopy={copy} />
              <CopyRow id="err" label="URL Erreur" value={magmaSetup.error_url} copiedKey={copiedKey} onCopy={copy} />
              {magmaSetup.server_outbound_ip && (
                <CopyRow id="ip" label="Adresse IP (whitelist)" value={magmaSetup.server_outbound_ip} copiedKey={copiedKey} onCopy={copy} />
              )}
              <View style={styles.noteBox}>
                <Ionicons name="information-circle" size={14} color={C.gold} />
                <Text style={styles.note}>
                  Clé secrète : min {magmaSetup.secret_key_rules.min_length} caractères, avec lettres, chiffres et
                  caractères spéciaux (@$!%*#?&-_). Expiration max {magmaSetup.key_expiry_max_days} jours.
                </Text>
              </View>
            </>
          )}
        </SectionCard>

        <SectionCard icon="key-outline" title="Clés Magma">
          <Field label="API URL" icon="globe-outline" value={form.MAGMA_API_URL} onChange={v => setForm({ ...form, MAGMA_API_URL: v })} />
          <Field label="Private Key (Bearer TOKEN)" icon="lock-closed-outline" value={form.MAGMA_PRIVATE_KEY} onChange={v => setForm({ ...form, MAGMA_PRIVATE_KEY: v })} secret />
          <Field label="User Secret (X-User-Secret, min 40)" icon="finger-print-outline" value={form.MAGMA_SECRET_KEY} onChange={v => setForm({ ...form, MAGMA_SECRET_KEY: v })} secret />
          <Field label="Webhook Secret" icon="shield-outline" value={form.MAGMA_WEBHOOK_SECRET} onChange={v => setForm({ ...form, MAGMA_WEBHOOK_SECRET: v })} secret last />
        </SectionCard>

        <SectionCard icon="link-outline" title="Cashramp — URLs">
          {cashrampSetup && (
            <>
              <CopyRow id="cr-webhook" label="Webhook URL" value={cashrampSetup.webhook_url} copiedKey={copiedKey} onCopy={copy} />
              <View style={styles.noteBox}>
                <Ionicons name="server-outline" size={14} color={C.gold} />
                <Text style={styles.note}>Staging: {cashrampSetup.staging_api}{'\n'}Production: {cashrampSetup.production_api}</Text>
              </View>
            </>
          )}
        </SectionCard>

        <SectionCard icon="key-outline" title="Clés Cashramp">
          <Field label="API GraphQL URL" icon="globe-outline" value={form.CASHRAMP_API_URL} onChange={v => setForm({ ...form, CASHRAMP_API_URL: v })} />
          <Field label="Secret Key (CSHRMP-SECK_...)" icon="lock-closed-outline" value={form.CASHRAMP_SECRET_KEY} onChange={v => setForm({ ...form, CASHRAMP_SECRET_KEY: v })} secret />
          <Field label="Public Key (CSHRMP-PUBK_...)" icon="key-outline" value={form.CASHRAMP_PUBLIC_KEY} onChange={v => setForm({ ...form, CASHRAMP_PUBLIC_KEY: v })} />
          <Field label="Webhook Token" icon="shield-outline" value={form.CASHRAMP_WEBHOOK_TOKEN} onChange={v => setForm({ ...form, CASHRAMP_WEBHOOK_TOKEN: v })} secret last />
        </SectionCard>

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 4 }}>
          <LinearGradient colors={GOLD_GRADIENT} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {saving ? (
              <ActivityIndicator color={C.greenDark} />
            ) : (
              <>
                <Ionicons name="save-outline" size={17} color={C.greenDark} style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>ENREGISTRER LES CLÉS</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, secret, icon, last }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean; icon: keyof typeof Ionicons.glyphMap; last?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.fieldWrap, !last && { marginBottom: 12 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapDark}>
        <Ionicons name={icon} size={16} color={C.muted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.inputInnerDark}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secret && !visible}
          placeholderTextColor={C.muted}
          autoCapitalize="none"
        />
        {secret && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={8}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: { paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBarRow: { flexDirection: 'row', alignItems: 'center' },
  topBarBadge: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  topBarTitle: { color: '#F8F5F0', fontSize: 18, fontWeight: '800' },
  topBarSubtitle: { color: '#C8D6CF', fontSize: 12, marginTop: 2 },

  scroll: { padding: 16, paddingBottom: 40 },

  loginBox: { flex: 1, justifyContent: 'center', padding: 24 },
  logoBadge: { alignSelf: 'center', marginBottom: 16 },
  logoBadgeInner: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 26, fontWeight: '800', color: '#F8F5F0', textAlign: 'center' },
  sub: { color: '#C8D6CF', textAlign: 'center', marginBottom: 24, marginTop: 6 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 18,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  hint: { color: C.muted, marginLeft: 6, fontSize: 12 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2,
  },
  cardTitle: { color: C.text, fontWeight: '800', fontSize: 15 },
  cardSubtitle: { color: C.muted, fontSize: 12, marginTop: 2 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, marginBottom: 16 },
  inputInner: { flex: 1, color: '#F8F5F0', paddingVertical: 14, fontSize: 15 },

  inputWrapDark: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12 },
  inputInnerDark: { flex: 1, color: C.text, paddingVertical: 12, fontSize: 14 },
  fieldWrap: {},
  fieldLabel: { color: C.muted, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },

  primaryBtn: { flexDirection: 'row', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: C.greenDark, fontWeight: '800', fontSize: 14.5, letterSpacing: 0.4 },

  copyRow: { marginBottom: 12 },
  copyLabel: { color: C.muted, fontSize: 10.5, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  copyValueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 },
  copyValue: { flex: 1, color: C.text, fontSize: 12.5, marginRight: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.12)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  copyBtnDone: { backgroundColor: C.successBg },
  copyBtnText: { color: C.gold, fontWeight: '800', fontSize: 10.5, marginLeft: 5 },

  noteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, padding: 10, marginTop: 4 },
  note: { color: C.muted, fontSize: 11.5, marginLeft: 8, flex: 1, lineHeight: 17 },
});
