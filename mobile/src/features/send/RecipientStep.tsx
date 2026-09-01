import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/designTokens';
import type { Person, RecipientMode } from './people';
import { personLabel } from './people';
import { filterPeople } from './peopleStorage';

type Props = {
  people: Person[];
  firstName: string;
  lastName: string;
  phone: string;
  onSelect: (p: Person) => void;
  onToggleFavorite: (id: string) => void;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangePhone: (v: string) => void;
};

const MODES: RecipientMode[] = ['recent', 'favorites', 'search', 'phone', 'new'];

export function RecipientStep({
  people,
  firstName,
  lastName,
  phone,
  onSelect,
  onToggleFavorite,
  onChangeFirstName,
  onChangeLastName,
  onChangePhone,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<RecipientMode>('recent');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    if (mode === 'favorites') return people.filter((p) => p.favorite);
    if (mode === 'recent') return [...people].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    if (mode === 'search') return filterPeople(people, search);
    return [];
  }, [mode, people, search]);

  return (
    <View>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[
              styles.modeChip,
              {
                borderColor: mode === m ? theme.colors.accent : theme.colors.border,
                backgroundColor: mode === m ? theme.colors.accentMuted : theme.colors.surface,
              },
            ]}
          >
            <Text style={[theme.type.caption, { color: mode === m ? theme.colors.text : theme.colors.textMuted }]}>
              {t(`send.people.${m}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {(mode === 'recent' || mode === 'favorites' || mode === 'search') && (
        <View style={{ marginTop: spacing.md }}>
          {mode === 'search' ? (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('send.people.searchPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.search, { color: theme.colors.text, borderColor: theme.colors.border }]}
            />
          ) : null}
          {list.length === 0 ? (
            <Text style={[theme.type.caption, { marginTop: spacing.sm }]}>{t('send.people.empty')}</Text>
          ) : (
            list.map((p) => (
              <Pressable key={p.id} onPress={() => onSelect(p)} style={[styles.personRow, { borderColor: theme.colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={theme.type.subtitle}>{personLabel(p)}</Text>
                  <Text style={theme.type.caption}>{p.phone}</Text>
                </View>
                <Pressable onPress={() => onToggleFavorite(p.id)} hitSlop={8}>
                  <Ionicons name={p.favorite ? 'star' : 'star-outline'} size={20} color={theme.colors.accent} />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      )}

      {(mode === 'phone' || mode === 'new') && (
        <SurfaceCard style={{ marginTop: spacing.md }}>
          <Field label={t('send.firstName')} value={firstName} onChange={onChangeFirstName} theme={theme} />
          <Field label={t('send.lastName')} value={lastName} onChange={onChangeLastName} theme={theme} />
          <Field label={t('send.phone')} value={phone} onChange={onChangePhone} keyboardType="phone-pad" theme={theme} />
        </SurfaceCard>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  theme,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
  keyboardType?: 'phone-pad' | 'default';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[theme.type.caption, { marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={[styles.field, { color: theme.colors.text, borderColor: theme.colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  modeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1 },
  search: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: { borderWidth: 1, borderRadius: 12, padding: spacing.md, fontSize: 16 },
});
