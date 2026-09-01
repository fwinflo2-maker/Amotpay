import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../theme/designTokens';

type Props = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  error?: string;
};

export function AuthInput({ icon, label, error, style, ...props }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.textMuted} style={styles.icon} /> : null}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text }, style]}
          {...props}
        />
      </View>
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm },
  error: { fontSize: 12, marginTop: spacing.xs },
});
