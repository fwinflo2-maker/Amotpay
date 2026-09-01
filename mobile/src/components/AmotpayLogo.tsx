import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FlowMark } from './FlowMark';
import { spacing } from '../theme/designTokens';

type Props = {
  size?: number;
  showWordmark?: boolean;
  style?: ViewStyle;
  inverse?: boolean;
};

export function AmotpayLogo({ size = 44, showWordmark = true, style, inverse = false }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel="AMOTPay">
      <FlowMark size={size} />
      {showWordmark ? (
        <Text
          style={[
            styles.wordmark,
            {
              fontSize: size * 0.38,
              color: inverse ? theme.colors.textInverse : theme.colors.text,
            },
          ]}
        >
          AMOTPay
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontWeight: '800', letterSpacing: 1.2 },
});
