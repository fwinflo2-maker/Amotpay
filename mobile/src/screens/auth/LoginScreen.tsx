import React, { useState } from 'react';
import {
  Alert,
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
import { AuthInput } from '../../components/auth/AuthInput';
import { FlowMark } from '../../components/FlowMark';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ApiError } from '../../api';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/designTokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      setLoading(true);
      await login(phone.trim(), password);
    } catch (e) {
      const msg = e instanceof ApiError ? mapAuthError(e, t) : t('states.errorHint');
      setError(msg);
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <FlowMark size={44} />
          <Text style={[theme.type.display, { marginTop: spacing.lg }]}>{t('auth.welcomeBack')}</Text>
          <Text style={[theme.type.caption, { marginTop: spacing.sm }]}>{t('auth.tagline')}</Text>
        </View>

        <AuthInput
          label={t('auth.phone')}
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+237..."
        />
        <AuthInput
          label={t('auth.password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {error ? <Text style={{ color: theme.colors.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <PrimaryButton title={t('auth.signIn')} onPress={submit} loading={loading} />

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
          <Text style={[theme.type.subtitle, { color: theme.colors.accent }]}>{t('auth.forgotPassword')}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={theme.type.caption}>{t('auth.noAccount')}</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={[theme.type.subtitle, { color: theme.colors.accent, marginLeft: 6 }]}>{t('auth.signUp')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function mapAuthError(e: ApiError, t: (k: string) => string): string {
  if (e.code === 'NETWORK') return t('states.offlineHint');
  if (e.code === 'AUTH') return t('auth.invalidCredentials');
  return t('states.errorHint');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  header: { marginBottom: spacing.xl },
  link: { alignItems: 'center', marginTop: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
