import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  SUCCESS: { label: 'Réussi', color: colors.success, bg: colors.successBg },
  COMPLETED: { label: 'Réussi', color: colors.success, bg: colors.successBg },
  PENDING: { label: 'En cours', color: colors.warning, bg: colors.warningBg },
  PROCESSING: { label: 'En cours', color: colors.warning, bg: colors.warningBg },
  FAILED: { label: 'Échoué', color: colors.error, bg: colors.errorBg },
  CANCELLED: { label: 'Annulé', color: colors.error, bg: colors.errorBg },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status?.toUpperCase()] ?? { label: status, color: colors.muted, bg: 'rgba(122,139,133,0.12)' };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
