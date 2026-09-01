import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, gradients, radius, shadow, spacing, typography } from '../theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={gradients.hero} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.avatarRing}>
          <LinearGradient colors={gradients.gold} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.countryPill}>
          <Text style={styles.countryText}>{user?.country_code} · {user?.currency}</Text>
        </View>
      </LinearGradient>

      <Card style={styles.menuCard}>
        <MenuRow icon="shield-checkmark-outline" label="Sécurité du compte" />
        <MenuRow icon="notifications-outline" label="Notifications" />
        <MenuRow icon="help-circle-outline" label="Centre d'aide" />
        <MenuRow icon="document-text-outline" label="Conditions & confidentialité" last />
      </Card>

      <Button title="DÉCONNEXION" onPress={handleLogout} variant="outline" style={styles.logoutBtn} />
    </ScrollView>
  );
}

function MenuRow({ icon, label, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; last?: boolean }) {
  return (
    <View style={[styles.menuRow, !last && styles.menuRowBorder]}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={colors.deepGreen} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </View>
  );
}

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (mode === 'login') {
        await login(phone, password);
      } else {
        await register({
          phone, password, first_name: firstName, last_name: lastName, country_code: 'CM',
        });
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.hero} style={styles.authBg} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoBadge}>
              <LinearGradient colors={gradients.gold} style={styles.logoBadgeInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="paper-plane" size={26} color={colors.deepGreenDark} />
              </LinearGradient>
            </View>
            <Text style={styles.logo}>AmotPay</Text>
            <Text style={styles.tagline}>Transferts d'argent rapides et sécurisés vers l'Afrique</Text>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.segment}>
              <SegmentButton label="Connexion" active={mode === 'login'} onPress={() => setMode('login')} />
              <SegmentButton label="Inscription" active={mode === 'register'} onPress={() => setMode('register')} />
            </View>

            {mode === 'register' && (
              <>
                <InputField icon="person-outline" placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
                <InputField icon="person-outline" placeholder="Nom" value={lastName} onChangeText={setLastName} />
              </>
            )}
            <InputField icon="call-outline" placeholder="Téléphone (+237...)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <InputField icon="lock-closed-outline" placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

            <Button
              title={mode === 'login' ? 'SE CONNECTER' : "CRÉER MON COMPTE"}
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />
          </View>

          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark" size={14} color={colors.sand} />
            <Text style={styles.trustText}>Paiements chiffrés de bout en bout</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
    >
      {label}
    </Text>
  );
}

function InputField(props: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'phone-pad' | 'default';
}) {
  const { icon, ...rest } = props;
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={colors.sand} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholderTextColor="rgba(248,245,240,0.45)"
        autoCapitalize={props.icon === 'call-outline' ? 'none' : 'words'}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  content: { paddingBottom: spacing.xxl },
  hero: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: 'rgba(212,175,55,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.deepGreenDark },
  name: { ...typography.title, marginTop: spacing.md },
  phone: { color: colors.sand, marginTop: 4, fontSize: 14 },
  countryPill: {
    marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill,
  },
  countryText: { color: colors.offWhite, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5 },
  menuCard: { marginHorizontal: spacing.lg, marginTop: -spacing.lg, padding: spacing.xs },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.sm },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.successBg,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  menuLabel: { flex: 1, color: colors.anthracite, fontSize: 14.5, fontWeight: '600' },
  logoutBtn: { marginHorizontal: spacing.lg, marginTop: spacing.xl },

  authBg: { flex: 1 },
  loginContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: spacing.xl },
  logoBadge: { marginBottom: spacing.md, ...shadow.button },
  logoBadgeInner: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '800', color: colors.offWhite, letterSpacing: -0.5 },
  tagline: { color: colors.sand, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 20 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.lg,
  },
  segment: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.pill,
    padding: 4, marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1, textAlign: 'center', paddingVertical: 10, borderRadius: radius.pill,
    color: colors.mutedLight, fontWeight: '700', fontSize: 13, overflow: 'hidden',
  },
  segmentBtnActive: { backgroundColor: colors.gold, color: colors.deepGreenDark },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.offWhite, paddingVertical: 14, fontSize: 15 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  trustText: { color: colors.sand, fontSize: 12, marginLeft: 6 },
});
