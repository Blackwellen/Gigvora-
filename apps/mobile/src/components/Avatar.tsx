import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, style]} />;
  }
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name) || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.ink100 },
  fallback: { backgroundColor: colors.brand100, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.brand700, fontWeight: '700' },
});
