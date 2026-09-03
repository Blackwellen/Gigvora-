import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { useSession } from '../../src/lib/SessionContext';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useSession();
  if (!user) return null;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={fullName} uri={user.avatarUrl} size={72} />
          <Text style={styles.name}>{fullName}</Text>
          {user.headline && <Text style={styles.headline}>{user.headline}</Text>}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Connections" value={user.connectionCount} />
          <Stat label="Followers" value={user.followerCount} />
          <Stat label="Following" value={user.followingCount} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionNote}>
            Saved Items, Recent Activity, Copilot and the full Workspace Switcher are web-only for now — this mobile
            pass covers Live Feed, Notifications and Inbox end-to-end.
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink900, marginTop: spacing.sm },
  headline: { color: colors.ink500, fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.ink100 },
  stat: { alignItems: 'center' },
  statValue: { fontWeight: '800', fontSize: 16, color: colors.ink900 },
  statLabel: { color: colors.ink500, fontSize: 12, marginTop: 2 },
  section: { marginTop: spacing.lg, backgroundColor: colors.ink50, borderRadius: radius.md, padding: spacing.md },
  sectionNote: { color: colors.ink500, fontSize: 13, lineHeight: 18 },
  signOutBtn: { marginTop: spacing.xl, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.red50 },
  signOutText: { color: colors.red500, fontWeight: '700', fontSize: 14 },
});
