import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar } from './Avatar';
import { colors, radius, spacing } from '../lib/theme';
import { useComments, useCreateComment, useReactToPost, useRemoveReaction, useSharePost, type FeedPostData } from '../lib/useFeed';

export function FeedPostCard({ post }: { post: FeedPostData }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const react = useReactToPost();
  const unreact = useRemoveReaction();
  const share = useSharePost();

  function toggleLike() {
    if (post.myReaction) unreact.mutate({ postId: post.id });
    else react.mutate({ postId: post.id, reactionType: 'like' });
  }

  const images = post.attachments?.filter((a) => a.type === 'image') ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author?.name || 'Unknown'} size={40} />
        <View style={styles.headerText}>
          <Text style={styles.authorName}>{post.author?.name}</Text>
          <Text style={styles.meta}>
            {post.author?.headline ? `${post.author.headline} · ` : ''}
            {formatDistanceToNowStrict(new Date(post.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </View>

      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

      {images.length > 0 && (
        <View style={styles.mediaRow}>
          {images.slice(0, 4).map((img, i) => (
            <Image key={img.id ?? `${img.url}-${i}`} source={{ uri: img.url }} style={styles.mediaImage} resizeMode="cover" />
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{post.likeCount > 0 ? `${post.likeCount} reaction${post.likeCount === 1 ? '' : 's'}` : ''}</Text>
        <Text style={styles.statsText}>
          {[
            post.commentCount > 0 ? `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}` : '',
            post.shareCount > 0 ? `${post.shareCount} share${post.shareCount === 1 ? '' : 's'}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Text style={[styles.actionText, post.myReaction && styles.actionTextActive]}>👍 Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentsOpen((v) => !v)}>
          <Text style={styles.actionText}>💬 Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} disabled={share.isPending} onPress={() => share.mutate({ postId: post.id })}>
          <Text style={styles.actionText}>{'\u{1F501}'} Share</Text>
        </TouchableOpacity>
      </View>

      {commentsOpen && <CommentSection postId={post.id} />}
    </View>
  );
}

function CommentSection({ postId }: { postId: string }) {
  const { data: comments, isLoading } = useComments(postId, true);
  const createComment = useCreateComment(postId);
  const [draft, setDraft] = useState('');

  async function submit() {
    if (!draft.trim()) return;
    await createComment.mutateAsync(draft);
    setDraft('');
  }

  return (
    <View style={styles.commentSection}>
      {isLoading && <ActivityIndicator color={colors.ink400} />}
      {comments?.map((c) => (
        <View key={c.id} style={styles.commentRow}>
          <Avatar name={c.author?.name || 'Unknown'} size={28} />
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>{c.author?.name}</Text>
            <Text style={styles.commentBody}>{c.body}</Text>
          </View>
        </View>
      ))}
      <View style={styles.commentInputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment..."
          placeholderTextColor={colors.ink400}
          style={styles.commentInput}
        />
        <TouchableOpacity onPress={submit} disabled={!draft.trim()}>
          <Text style={[styles.postCommentBtn, !draft.trim() && { opacity: 0.4 }]}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink100 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { marginLeft: spacing.sm, flex: 1 },
  authorName: { fontWeight: '700', color: colors.ink900, fontSize: 14 },
  meta: { color: colors.ink400, fontSize: 12, marginTop: 1 },
  body: { color: colors.ink800, fontSize: 15, marginTop: spacing.sm, lineHeight: 21 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  mediaImage: { width: '48%', aspectRatio: 1.3, borderRadius: radius.md, backgroundColor: colors.ink100 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  statsText: { color: colors.ink400, fontSize: 12 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.ink100, marginTop: spacing.sm, paddingTop: spacing.xs },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  actionText: { color: colors.ink500, fontSize: 13, fontWeight: '600' },
  actionTextActive: { color: colors.brand600 },
  commentSection: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.ink100, paddingTop: spacing.sm },
  commentRow: { flexDirection: 'row', marginBottom: spacing.sm },
  commentBubble: { backgroundColor: colors.ink50, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginLeft: spacing.sm, flex: 1 },
  commentAuthor: { fontWeight: '700', fontSize: 12, color: colors.ink900 },
  commentBody: { fontSize: 13, color: colors.ink800 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  commentInput: { flex: 1, borderWidth: 1, borderColor: colors.ink200, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 13, color: colors.ink900 },
  postCommentBtn: { color: colors.brand600, fontWeight: '700', marginLeft: spacing.sm, fontSize: 13 },
});
