import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNowStrict } from 'date-fns';
import { router } from 'expo-router';
import { useMarkNotificationRead, useNotifications, type NotificationData } from '../../../src/lib/useNotifications';
import { colors, radius, spacing } from '../../../src/lib/theme';

const TYPE_LABEL: Record<string, (p: Record<string, unknown>) => string> = {
  'post.reaction': (p) => `${p.actorName} reacted to your post`,
  'post.comment': (p) => `${p.actorName} commented on your post`,
  'comment.reply': (p) => `${p.actorName} replied to your comment`,
  'connection.request': (p) => `${p.actorName} sent you a connection request`,
};

export default function NotificationsScreen() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  function open(n: NotificationData) {
    if (!n.is_read) markRead.mutate(n.id);
    // Deep-linking into the feed's post detail is a web-only view for now
    // (mobile has no comparable route yet) — surface it as an in-app toast
    // seam via console for now rather than crashing on an unknown route.
    const postId = (n.payload as { postId?: string }).postId;
    if (postId) router.push('/(app)/(tabs)/live-feed');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand600} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>You&rsquo;re all caught up.</Text>}
          renderItem={({ item }) => {
            const label = TYPE_LABEL[item.type]?.(item.payload) || item.type;
            return (
              <TouchableOpacity style={[styles.row, !item.is_read && styles.rowUnread]} onPress={() => open(item)}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowMeta}>{formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink900 },
  listContent: { paddingVertical: spacing.xs },
  loader: { marginTop: spacing.xl },
  empty: { textAlign: 'center', color: colors.ink400, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink50 },
  rowUnread: { backgroundColor: colors.brand50 },
  rowText: { flex: 1 },
  rowLabel: { color: colors.ink800, fontSize: 14 },
  rowMeta: { color: colors.ink400, fontSize: 12, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.brand600 },
});
