import { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { setHasOnboarded } from '../src/lib/onboarding';
import { colors, radius, spacing } from '../src/lib/theme';

// Copy mirrors the public marketing home page's value proposition
// (apps/web/src/app/(public)/home/page.tsx: "Work. Connect. Grow. All in one
// platform." + its capability cards) so first-time app users get the same
// pitch as the website, not an invented one.
const SLIDES = [
  {
    key: 'work',
    emoji: '\u{1F4BC}',
    title: 'Work.',
    body: 'Discover gigs, jobs, and projects from companies and recruiters actively hiring — all in one feed.',
  },
  {
    key: 'connect',
    emoji: '\u{1F91D}',
    title: 'Connect.',
    body: 'Build your network with professionals, businesses, and recruiters across 120+ countries.',
  },
  {
    key: 'grow',
    emoji: '\u{1F680}',
    title: 'Grow.',
    body: 'AI-powered matching and real-time collaboration help you find the right opportunity faster.',
  },
  {
    key: 'platform',
    emoji: '\u{2728}',
    title: 'All in one platform.',
    body: 'Everything you need to work, hire, and grow — enterprise-grade security built in.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await setHasOnboarded();
    router.replace('/(auth)/sign-in');
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== index) setIndex(next);
  }

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryBtnText}>{isLast ? 'Get started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skip: { color: colors.ink500, fontWeight: '600', fontSize: 14 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconEmoji: { fontSize: 44 },
  slideTitle: { fontSize: 28, fontWeight: '800', color: colors.ink900, textAlign: 'center' },
  slideBody: { fontSize: 15, color: colors.ink500, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink200 },
  dotActive: { backgroundColor: colors.brand600, width: 22 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.lg },
  primaryBtn: { backgroundColor: colors.brand600, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
