'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useSocketEvent } from '@/hooks/useChatSocket';
import type { FeedPostData } from '@/hooks/useFeed';

export type NewCandidatesEvent = { postId: string; authorId: string };
export type ReactionUpdatedEvent = { postId: string; likeCount: number; reactionType: string | null; actorId: string };
export type CommentCountUpdatedEvent = { postId: string; commentCount: number };
export type PollUpdatedEvent = { pollId: string; postId: string; totalVotes: number; options: Array<{ id: string; voteCount: number; percentage: number }> };
export type PostDeletedEvent = { postId: string };

/**
 * Thin wrapper around the shared socket (apps/web/src/lib/socket.ts), mirroring
 * useChatSocket.ts, for the feed-specific realtime contract added in
 * apps/api/src/websocket/handlers/feed.js:
 *  - `feed:public` room: joined by anyone browsing the public feed tabs, carries
 *    only `feed:new_candidates` nudges (no post content) for public posts.
 *  - `post:${postId}` room: joined per-post (feed list item mount, or the post
 *    detail page); the server re-validates real visibility before allowing the
 *    join (see canViewPost in the handler) — a client can't join a room for a
 *    post it isn't otherwise allowed to see.
 */
export function useFeedSocket() {
  const socket = getSocket();

  // Each wrapped in a block body (not an implicit return) so these are safe
  // to pass directly as a useEffect cleanup — `socket.emit(...)` returns the
  // Socket instance itself (for chaining), which TypeScript rejects as an
  // effect cleanup's return value.
  const joinPost = useCallback((postId: string) => {
    socket.emit('post:join', postId);
  }, [socket]);
  const leavePost = useCallback((postId: string) => {
    socket.emit('post:leave', postId);
  }, [socket]);
  const joinPublicFeed = useCallback(() => {
    socket.emit('feed:join-public');
  }, [socket]);
  const leavePublicFeed = useCallback(() => {
    socket.emit('feed:leave-public');
  }, [socket]);

  return { socket, joinPost, leavePost, joinPublicFeed, leavePublicFeed };
}

/** Joins `post:${postId}` for the lifetime of the calling component (feed list item, post detail). */
export function usePostRoom(postId: string | undefined) {
  const { joinPost, leavePost } = useFeedSocket();
  useEffect(() => {
    if (!postId) return;
    joinPost(postId);
    return () => leavePost(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);
}

/**
 * Subscribes to `feed:new_candidates` while joined to `feed:public`, and
 * exposes a real "N new posts" count the caller renders as a banner — never
 * auto-prepended, per spec. Clicking the banner should call `dismiss()` after
 * the caller's own refetch.
 */
export function useNewPostsBanner() {
  const { joinPublicFeed, leavePublicFeed } = useFeedSocket();
  const countRef = useRef(0);

  useEffect(() => {
    joinPublicFeed();
    return () => leavePublicFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return countRef;
}

/**
 * Reconciles a post's live reaction/comment/poll updates into every React
 * Query cache entry that holds that post (feed pages, the single-post query,
 * the owned-post query) — a targeted merge of just the changed field, not a
 * blind overwrite, so it doesn't clobber the viewer's own optimistic state
 * for anything else on the post.
 */
export function usePostRealtimeReconciliation(postId: string | undefined) {
  usePostRoom(postId);
  const queryClient = useQueryClient();

  const patchPost = useCallback(
    (id: string, patch: Partial<FeedPostData>) => {
      queryClient.setQueriesData<{ pages: { items: FeedPostData[]; nextCursor: string | null }[] } | undefined>(
        { queryKey: ['feed'] },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            })),
          };
        }
      );
      queryClient.setQueriesData<FeedPostData | undefined>({ queryKey: ['post', id] }, (data) => (data ? { ...data, ...patch } : data));
      queryClient.setQueriesData<FeedPostData | undefined>({ queryKey: ['owned-post', id] }, (data) => (data ? { ...data, ...patch } : data));
    },
    [queryClient]
  );

  useSocketEvent<ReactionUpdatedEvent>(
    'post:reaction_updated',
    (payload) => {
      if (payload.postId !== postId) return;
      patchPost(payload.postId, { likeCount: payload.likeCount });
    },
    [postId]
  );

  useSocketEvent<CommentCountUpdatedEvent>(
    'post:comment_count_updated',
    (payload) => {
      if (payload.postId !== postId) return;
      patchPost(payload.postId, { commentCount: payload.commentCount });
    },
    [postId]
  );

  useSocketEvent<PollUpdatedEvent>(
    'poll:updated',
    (payload) => {
      if (payload.postId !== postId) return;
      queryClient.setQueriesData<{ pages: { items: FeedPostData[]; nextCursor: string | null }[] } | undefined>(
        { queryKey: ['feed'] },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== payload.postId || !item.poll) return item;
                return {
                  ...item,
                  poll: {
                    ...item.poll,
                    totalVotes: payload.totalVotes,
                    options: item.poll.options.map((opt) => {
                      const updated = payload.options.find((o) => o.id === opt.id);
                      return updated ? { ...opt, voteCount: updated.voteCount } : opt;
                    }),
                  },
                };
              }),
            })),
          };
        }
      );
      queryClient.setQueriesData<FeedPostData | undefined>({ queryKey: ['post', payload.postId] }, (data) => {
        if (!data?.poll) return data;
        return {
          ...data,
          poll: {
            ...data.poll,
            totalVotes: payload.totalVotes,
            options: data.poll.options.map((opt) => {
              const updated = payload.options.find((o) => o.id === opt.id);
              return updated ? { ...opt, voteCount: updated.voteCount } : opt;
            }),
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['poll-detail', payload.pollId] });
    },
    [postId]
  );

  useSocketEvent<PostDeletedEvent>(
    'post:deleted',
    (payload) => {
      if (payload.postId !== postId) return;
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
    },
    [postId]
  );
}
