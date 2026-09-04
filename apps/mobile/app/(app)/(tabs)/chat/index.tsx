import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNowStrict } from 'date-fns';
import { router } from 'expo-router';
import { Avatar } from '../../../../src/components/Avatar';
import { useConversations } from '../../../../src/lib/useInbox';
import { colors, radius, spacing } from '../../../../src/lib/theme';

export default function InboxScreen() {
  const { data, isLoading } = useConversations();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Inbox</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand600} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/(app)/(tabs)/chat/[id]', params: { id: item.id, title: item.title } })}>
              <Avatar name={item.title} size={44} />
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  {item.lastMessage && <Text style={styles.rowTime}>{formatDistanceToNowStrict(new Date(item.lastMessage.createdAt))}</Text>}
                </View>
                <View style={styles.rowTop}>
                  <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage?.body || 'No messages yet'}</Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink900 },
  loader: { marginTop: spacing.xl },
  empty: { textAlign: 'center', color: colors.ink400, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink50 },
  rowText: { flex: 1, marginLeft: spacing.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontWeight: '700', color: colors.ink900, fontSize: 14, flex: 1 },
  rowTime: { color: colors.ink400, fontSize: 11 },
  rowPreview: { color: colors.ink500, fontSize: 13, flex: 1 },
  badge: { backgroundColor: colors.brand600, borderRadius: radius.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
