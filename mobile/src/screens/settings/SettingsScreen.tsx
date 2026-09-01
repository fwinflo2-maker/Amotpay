import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { AppearanceMode } from '../../context/ThemeContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { spacing } from '../../theme/designTokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const LANGS = ['en', 'fr', 'es', 'pt', 'de', 'ar'] as const;

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: t('settings.title'),
      headerStyle: { backgroundColor: theme.colors.backgroundElevated },
      headerTintColor: theme.colors.text,
    });
  }, [navigation, t, theme]);

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <SurfaceCard style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.accentMuted }]}>
          <Text style={[theme.type.heading, { color: theme.colors.accent }]}>{initials}</Text>
        </View>
        <Text style={theme.type.heading}>{user?.first_name} {user?.last_name}</Text>
        <Text style={theme.type.caption}>{user?.phone}</Text>
      </SurfaceCard>

      <MenuSection title={t('settings.profile')}>
        <MenuRow icon="shield-checkmark-outline" label={t('settings.security')} />
        <MenuRow icon="finger-print-outline" label={t('settings.verification')} onPress={() => navigation.navigate('Verification')} />
        <MenuRow icon="notifications-outline" label={t('settings.notifications')} last />
      </MenuSection>

      <MenuSection title={t('settings.appearance')}>
        {(
          [
            ['system', t('settings.appearanceSystem')],
            ['light', t('settings.appearanceLight')],
            ['dark', t('settings.appearanceDark')],
          ] as const
        ).map(([m, label], idx, arr) => (
          <MenuRow
            key={m}
            icon={m === 'dark' ? 'moon-outline' : m === 'light' ? 'sunny-outline' : 'phone-portrait-outline'}
            label={label}
            trailing={mode === m ? '✓' : undefined}
            onPress={() => void setMode(m as AppearanceMode)}
            last={idx === arr.length - 1}
          />
        ))}
      </MenuSection>

      <MenuSection title={t('settings.language')}>
        {LANGS.map((lang, idx) => (
          <MenuRow
            key={lang}
            icon="language-outline"
            label={lang.toUpperCase()}
            trailing={i18n.language.startsWith(lang) ? '✓' : undefined}
            onPress={() => void i18n.changeLanguage(lang)}
            last={idx === LANGS.length - 1}
          />
        ))}
      </MenuSection>

      <PrimaryButton title={t('settings.logout')} onPress={() => void logout()} variant="outline" style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[theme.type.label, styles.sectionTitle]}>{title}</Text>
      <SurfaceCard style={{ paddingVertical: spacing.xs }}>{children}</SurfaceCard>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  trailing,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  trailing?: string;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const content = (
    <>
      <Ionicons name={icon} size={20} color={theme.colors.accent} style={styles.menuIcon} />
      <Text style={[theme.type.body, { flex: 1 }]}>{label}</Text>
      {trailing ? <Text style={theme.type.caption}>{trailing}</Text> : null}
      {onPress && !trailing ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} /> : null}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.menuRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profile: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  menuIcon: { marginRight: spacing.md },
});
