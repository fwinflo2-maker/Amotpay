import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FlowMark } from '../../components/FlowMark';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useTheme } from '../../context/ThemeContext';
import { markOnboardingComplete } from '../../context/session';
import { radius, spacing } from '../../theme/designTokens';

const { width } = Dimensions.get('window');

type Slide = { key: string; title: string; body: string };

type Props = {
  onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    { key: '1', title: t('onboarding.slide1Title'), body: t('onboarding.slide1Body') },
    { key: '2', title: t('onboarding.slide2Title'), body: t('onboarding.slide2Body') },
    { key: '3', title: t('onboarding.slide3Title'), body: t('onboarding.slide3Body') },
    { key: '4', title: t('onboarding.slide4Title'), body: t('onboarding.slide4Body') },
  ];

  const finish = async () => {
    await markOnboardingComplete();
    onDone();
  };

  const next = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      void finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background, paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.brandRow}>
        <FlowMark size={36} />
        <Text style={[theme.type.heading, { marginLeft: spacing.sm }]}>{t('brand')}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={[theme.type.display, styles.title]}>{item.title}</Text>
            <Text style={[theme.type.body, { color: theme.colors.textSecondary, marginTop: spacing.md }]}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? theme.colors.accent : theme.colors.border,
                  width: i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          title={index === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          onPress={next}
        />
        {index < slides.length - 1 ? (
          <PrimaryButton title={t('onboarding.skip')} onPress={() => void finish()} variant="ghost" style={{ marginTop: spacing.sm }} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  slide: { paddingHorizontal: spacing.lg, justifyContent: 'center' },
  title: { lineHeight: 40 },
  footer: { paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg, justifyContent: 'center' },
  dot: { height: 8, borderRadius: radius.pill },
});
