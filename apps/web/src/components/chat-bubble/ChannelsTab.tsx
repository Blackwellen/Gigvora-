'use client';

import { useState } from 'react';
import { Compass, Globe2, Hash, Loader2, Lock, Plus, X } from 'lucide-react';
import { useConversations } from '@/hooks/useInbox';
import { useJoinedChannels, usePublicChannels, useJoinChannel, useCreateChannel } from '@/hooks/useChatBubbleData';
import { MessageThread } from './MessageThread';
import type { CallType } from '@/hooks/useChatSocket';

export function ChannelsTab({
  onStartCall,
  activeId: controlledActiveId,
  onActiveIdChange,
}: {
  onStartCall: (conversationId: string, targetUserId: string, type: CallType, peerName: string) => void;
  activeId?: string | null;
  onActiveIdChange?: (id: string | null) => void;
}) {
  const { data: channels, isLoading } = useJoinedChannels();
  const { data: conversations } = useConversations();
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;
  const setActiveId = onActiveIdChange || setInternalActiveId;
  const [view, setView] = useState<'joined' | 'browse'>('joined');
  const [showCreate, setShowCreate] = useState(false);

  const active = conversations?.find((c) => c.id === activeId) || null;

  if (activeId && active) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button type="button" onClick={() => setActiveId(null)} className="border-b border-ink-100 px-3.5 py-2 text-left text-xs font-semibold text-brand-600 dark:border-ink-800 dark:text-brand-400">
          ← Back to channels
        </button>
        <MessageThread
          conversationId={active.id}
          title={active.title}
          participantsById={Object.fromEntries(active.participants.map((p) => [p.id, p.name]))}
          onStartCall={(type) => {
            const target = active.participants[0];
            if (target) onStartCall(active.id, target.id, type, active.title);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-ink-100 p-2.5 dark:border-ink-800">
        <button
          type="button"
          onClick={() => setView('joined')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${view === 'joined' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'}`}
        >
          Joined
        </button>
        <button
          type="button"
          onClick={() => setView('browse')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${view === 'browse' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'}`}
        >
          <Compass className="h-3.5 w-3.5" /> Browse
        </button>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
          aria-label="Create channel"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {view === 'joined' ? (
          <JoinedList channels={channels} isLoading={isLoading} onOpen={setActiveId} />
        ) : (
          <BrowseList onJoined={setActiveId} />
        )}
      </div>

      {showCreate && <CreateChannelModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); setActiveId(id); }} />}
    </div>
  );
}

function JoinedList({ channels, isLoading, onOpen }: { channels: ReturnType<typeof useJoinedChannels>['data']; isLoading: boolean; onOpen: (id: string) => void }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }
  if (!channels.length) {
    return (
      <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
        <p className="font-semibold text-ink-600 dark:text-ink-300">No channels yet</p>
        <p>Browse public channels or create your own.</p>
      </div>
    );
  }
  return (
    <>
      {channels.map((ch) => (
        <button key={ch.id} type="button" onClick={() => onOpen(ch.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            <Hash className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{ch.title}</span>
            {ch.topic && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{ch.topic}</span>}
          </span>
        </button>
      ))}
    </>
  );
}

function BrowseList({ onJoined }: { onJoined: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const { data: publicChannels, isLoading } = usePublicChannels(search);
  const joinChannel = useJoinChannel();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function join(id: string) {
    setJoiningId(id);
    try {
      await joinChannel.mutateAsync(id);
      onJoined(id);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search public channels..."
        className="mb-2 h-8 w-full rounded-lg border border-ink-200 px-2.5 text-xs outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
        </div>
      )}
      {!isLoading && !publicChannels?.length && (
        <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
          <p className="font-semibold text-ink-600 dark:text-ink-300">No public channels found</p>
          <p className="text-xs">Channel discovery is being wired up on the backend — check back soon, or create the first one.</p>
        </div>
      )}
      {publicChannels?.map((ch) => (
        <div key={ch.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            {ch.isPublic ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{ch.title}</span>
            {ch.topic && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{ch.topic}</span>}
          </span>
          <button
            type="button"
            disabled={joiningId === ch.id}
            onClick={() => join(ch.id)}
            className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40 dark:bg-brand-500/10 dark:text-brand-400"
          >
            {joiningId === ch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Join'}
          </button>
        </div>
      ))}
    </div>
  );
}

function CreateChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const createChannel = useCreateChannel();
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setError(null);
    try {
      const result = await createChannel.mutateAsync({ title: title.trim(), topic: topic.trim() || undefined, isPublic });
      const id = 'id' in result ? (result as { id: string }).id : (result as { conversationId: string }).conversationId;
      onCreated(id);
    } catch {
      setError('Channel creation isn’t available yet — this endpoint is pending on the backend.');
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-sm font-bold text-ink-900 dark:text-white">Create a channel</p>
        <button type="button" onClick={onClose} aria-label="Close">
          <X className="h-4.5 w-4.5 text-ink-400" />
        </button>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. product-launch"
            className="h-9 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Topic (optional)</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What's this channel about?"
            className="h-9 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
          <span className="text-sm font-medium text-ink-700 dark:text-ink-200">Public — anyone can find and join</span>
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className={`h-5 w-9 rounded-full transition ${isPublic ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}
            aria-pressed={isPublic}
          >
            <span className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition ${isPublic ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
      <div className="border-t border-ink-100 p-3.5 dark:border-ink-800">
        <button
          type="button"
          disabled={!title.trim() || createChannel.isPending}
          onClick={submit}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {createChannel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create channel'}
        </button>
      </div>
    </div>
  );
}
