import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedPostCard } from '../../src/components/FeedPostCard';
import { Avatar } from '../../src/components/Avatar';
import { useCreatePost, useFeed } from '../../src/lib/useFeed';
import { useSession } from '../../src/lib/SessionContext';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function LiveFeedScreen() {
  const { user } = useSession();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } = useFeed();
  const [draft, setDraft] = useState('');
  const createPost = useCreatePost();

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  async function submitPost() {
    if (!draft.trim()) return;
    await createPost.mutateAsync(draft);
    setDraft('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Live Feed</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand600} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.composer}>
            <View style={styles.composerRow}>
              <Avatar name={fullName} uri={user?.avatarUrl} size={36} />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Share an update, insight, or opportunity..."
                placeholderTextColor={colors.ink400}
                style={styles.composerInput}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[styles.postBtn, !draft.trim() && styles.postBtnDisabled]}
              disabled={!draft.trim() || createPost.isPending}
              onPress={submitPost}
            >
              <Text style={styles.postBtnText}>{createPost.isPending ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.brand600} />
          ) : (
            <Text style={styles.empty}>Be the first to share something with your network.</Text>
          )
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.ink400} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink50 },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink900 },
  listContent: { paddingVertical: spacing.md },
  composer: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink100 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  composerInput: { flex: 1, marginLeft: spacing.sm, fontSize: 15, color: colors.ink900, minHeight: 36 },
  postBtn: { alignSelf: 'flex-end', backgroundColor: colors.brand600, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 8, marginTop: spacing.sm },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  loader: { marginTop: spacing.xl },
  empty: { textAlign: 'center', color: colors.ink400, marginTop: spacing.xl, paddingHorizontal: spacing.xl },
});
