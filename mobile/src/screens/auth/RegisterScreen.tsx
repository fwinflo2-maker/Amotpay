import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../../api';
import type { Country } from '../../api/types';
import { AuthInput } from '../../components/auth/AuthInput';
import { AmotpayLogo } from '../../components/AmotpayLogo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/designTokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [countries, setCountries] = useState<Country[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.countries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const submit = async () => {
    setError('');
    try {
      setLoading(true);
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        password,
        country_code: countryCode,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('states.errorHint'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <AmotpayLogo size={40} style={{ marginBottom: spacing.lg }} />
        <Text style={theme.type.display}>{t('auth.createAccount')}</Text>
        <Text style={[theme.type.caption, { marginTop: spacing.sm, marginBottom: spacing.lg }]}>{t('auth.createSubtitle')}</Text>

        <AuthInput label={t('auth.firstName')} icon="person-outline" value={firstName} onChangeText={setFirstName} autoComplete="name-given" />
        <AuthInput label={t('auth.lastName')} icon="person-outline" value={lastName} onChangeText={setLastName} autoComplete="name-family" />
        <AuthInput label={t('auth.emailOptional')} icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <AuthInput label={t('auth.phone')} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+237..." />
        <AuthInput label={t('auth.password')} icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={[theme.type.caption, { marginBottom: spacing.lg, marginTop: -spacing.sm }]}>{t('auth.passwordHint')}</Text>

        <Text style={[theme.type.label, { marginBottom: spacing.sm }]}>{t('auth.country')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
          {(countries.length ? countries : [{ code: 'CM', name: 'Cameroon', currency: 'XAF', phone_prefix: '+237' }]).map((c) => (
            <Pressable
              key={c.code}
              onPress={() => setCountryCode(c.code)}
              style={[
                styles.chip,
                {
                  backgroundColor: countryCode === c.code ? theme.colors.accentMuted : theme.colors.surfaceMuted,
                  borderColor: countryCode === c.code ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text style={theme.type.caption}>{c.code}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Text style={{ color: theme.colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <PrimaryButton title={t('auth.continue')} onPress={submit} loading={loading} style={{ marginTop: spacing.md }} />

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.footer}>
          <Text style={theme.type.caption}>{t('auth.haveAccount')}</Text>
          <Text style={[theme.type.subtitle, { color: theme.colors.accent, marginLeft: 6 }]}>{t('auth.signIn')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  countryRow: { marginBottom: spacing.lg, maxHeight: 44 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, marginRight: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
