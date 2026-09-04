import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Avatar } from '../../src/components/Avatar';
import { useSession } from '../../src/lib/SessionContext';
import { WEB_URL } from '../../src/lib/apiClient';
import { colors, radius, spacing } from '../../src/lib/theme';

type MenuItem = { icon: string; label: string; onPress: () => void };

export default function MenuModal() {
  const { user, logout } = useSession();
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  function goTo(path: Parameters<typeof router.push>[0]) {
    router.back();
    router.push(path);
  }

  function openWeb(path: string) {
    Linking.openURL(`${WEB_URL}${path}`);
  }

  const inApp: MenuItem[] = [
    { icon: '\u{1F3E0}', label: 'Live Feed', onPress: () => goTo('/(app)/(tabs)/live-feed') },
    { icon: '\u{1F514}', label: 'Notifications', onPress: () => goTo('/(app)/(tabs)/notifications') },
    { icon: '\u{1F4AC}', label: 'Messages', onPress: () => goTo('/(app)/(tabs)/chat') },
    { icon: '\u{1F464}', label: 'Profile', onPress: () => goTo('/(app)/(tabs)/profile') },
  ];

  // These sections exist on the web app but don't have a native screen yet
  // in this phase-1 pass — opening them in the browser keeps the menu fully
  // functional (not a dead-end stub) while the native versions are built out.
  const onWeb: MenuItem[] = [
    { icon: '\u{1F4BC}', label: 'Jobs Marketplace', onPress: () => openWeb('/jobs-marketplace') },
    { icon: '\u{2728}', label: 'Gigs Marketplace', onPress: () => openWeb('/gigs-marketplace') },
    { icon: '\u{1F465}', label: 'My Network', onPress: () => openWeb('/network') },
    { icon: '\u{1F3E2}', label: 'Company Directory', onPress: () => openWeb('/company-directory') },
    { icon: '\u{2699}', label: 'Account Settings', onPress: () => openWeb('/app/account-settings') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {user && (
          <View style={styles.profileRow}>
            <Avatar name={fullName} uri={user.avatarUrl} size={48} />
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{fullName}</Text>
              {user.headline ? <Text style={styles.profileHeadline}>{user.headline}</Text> : null}
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Jump to</Text>
        <View style={styles.card}>
          {inApp.map((item, i) => (
            <MenuRow key={item.label} item={item} last={i === inApp.length - 1} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>More on Gigvora</Text>
        <View style={styles.card}>
          {onWeb.map((item, i) => (
            <MenuRow key={item.label} item={item} last={i === onWeb.length - 1} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => {
            router.back();
            logout();
          }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ item, last }: { item: MenuItem; last: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={item.onPress}>
      <Text style={styles.rowIcon}>{item.icon}</Text>
      <Text style={styles.rowLabel}>{item.label}</Text>
      <Text style={styles.rowChevron}>{'›'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink900 },
  close: { color: colors.brand600, fontWeight: '700', fontSize: 14 },
  content: { padding: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  profileText: { marginLeft: spacing.md },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.ink900 },
  profileHeadline: { fontSize: 13, color: colors.ink500, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink400,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: { backgroundColor: colors.ink50, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  rowIcon: { fontSize: 18, width: 28 },
  rowLabel: { flex: 1, fontSize: 15, color: colors.ink800, fontWeight: '600' },
  rowChevron: { fontSize: 18, color: colors.ink300 },
  signOutBtn: { marginTop: spacing.xl, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.red50 },
  signOutText: { color: colors.red500, fontWeight: '700', fontSize: 14 },
});
