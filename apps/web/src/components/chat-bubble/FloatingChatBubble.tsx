'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Hash, Maximize2, MessageCircle, Minimize2, Search, Sparkles, Users, X } from 'lucide-react';
import { useConversations, useStartConversation, useUnreadMessageCount } from '@/hooks/useInbox';
import { useDirectorySearch } from '@/hooks/useChatBubbleData';
import { useChatSocket, useSocketEvent } from '@/hooks/useChatSocket';
import type { CallType, SocketMessage } from '@/hooks/useChatSocket';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { useSession } from '@/lib/session/SessionContext';
import { Avatar } from '@/components/ui/Avatar';
import { ChatsTab } from './ChatsTab';
import { ChannelsTab } from './ChannelsTab';
import { ContactsTab } from './ContactsTab';
import { CopilotTab } from './CopilotTab';
import { CallOverlay } from './CallOverlay';

type UiState = 'minimized' | 'panel' | 'fullscreen';
type TabKey = 'chats' | 'channels' | 'contacts' | 'copilot';

// Module-level bus so a page can ask the single globally-mounted FloatingChatBubble (rendered
// once in app/(workspace)/layout.tsx) to open, without spawning a second instance. Used by the
// /app/chat-bubble demo page to show the bubble expanded on load.
const openRequestListeners = new Set<(state: UiState) => void>();
export function requestChatBubbleOpen(state: UiState = 'panel') {
  openRequestListeners.forEach((fn) => fn(state));
}

const TABS: Array<{ key: TabKey; label: string; icon: typeof MessageCircle }> = [
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'channels', label: 'Channels', icon: Hash },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'copilot', label: 'Copilot', icon: Sparkles },
];

export function FloatingChatBubble({ defaultOpen }: { defaultOpen?: UiState } = {}) {
  const { user } = useSession();
  const [uiState, setUiState] = useState<UiState>(defaultOpen ?? 'minimized');
  const [activeTab, setActiveTab] = useState<TabKey>('chats');
  const [chatActiveId, setChatActiveId] = useState<string | null>(null);
  const [channelActiveId, setChannelActiveId] = useState<string | null>(null);
  const [headerQuery, setHeaderQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useUnreadMessageCount();
  const { data: conversations } = useConversations();
  const { status, joinConversation, leaveConversation } = useChatSocket();
  const call = useWebRTCCall(user?.id);
  const startConversation = useStartConversation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const listener = (state: UiState) => setUiState(state);
    openRequestListeners.add(listener);
    return () => {
      openRequestListeners.delete(listener);
    };
  }, []);

  // Join every conversation room (not just the one currently open) so the
  // unread badge and previews update in real time even while minimized —
  // message:new is room-scoped server-side (io.to(`conversation:${id}`)),
  // so a room the socket never joined would otherwise go silent until the
  // next unread-count poll.
  useEffect(() => {
    if (status !== 'connected' || !conversations) return;
    conversations.forEach((c) => joinConversation(c.id));
    return () => conversations.forEach((c) => leaveConversation(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, conversations?.map((c) => c.id).join(',')]);

  // A message arriving from someone else bumps the unread badge instantly
  // instead of waiting for the unread-count query's next poll.
  useSocketEvent<SocketMessage>('message:new', (msg) => {
    if (msg.sender_id === user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (uiState === 'fullscreen') setUiState('panel');
      else if (uiState === 'panel') setUiState('minimized');
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [uiState]);

  useEffect(() => {
    if (uiState !== 'fullscreen') return;
    document.body.style.overflow = 'hidden';
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
    focusables?.[0]?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', trap);
    };
  }, [uiState]);

  function startCall(conversationId: string, targetUserId: string, type: CallType, peerName: string) {
    call.startCall(conversationId, targetUserId, type, peerName);
  }

  const matchedConversations = useMemo(
    () => (headerQuery.trim().length >= 1 ? (conversations || []).filter((c) => c.title.toLowerCase().includes(headerQuery.toLowerCase())) : []),
    [conversations, headerQuery]
  );
  const { data: matchedPeople } = useDirectorySearch(headerQuery);

  function openConversationFromSearch(conversationId: string) {
    setActiveTab('chats');
    setChatActiveId(conversationId);
    setHeaderQuery('');
  }

  async function openPersonFromSearch(personId: string) {
    const conversationId = await startConversation.mutateAsync(personId);
    openConversationFromSearch(conversationId);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <CallOverlay call={call} />

      <AnimatePresence>
        {uiState === 'minimized' && (
          <motion.button
            key="bubble-fab"
            type="button"
            aria-label="Open chat"
            onClick={() => setUiState('panel')}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="fixed bottom-6 right-6 z-[150] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_40px_-8px_rgba(29,91,245,0.55)] ring-1 ring-white/20 hover:shadow-[0_14px_48px_-6px_rgba(29,91,245,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <MessageCircle className="h-6 w-6" />
            {status !== 'connected' && <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink-300" aria-label="Reconnecting" />}
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(uiState === 'panel' || uiState === 'fullscreen') && (
          <motion.div
            key="bubble-panel"
            ref={panelRef}
            role="dialog"
            aria-modal={uiState === 'fullscreen'}
            aria-label="Chat"
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={
              uiState === 'fullscreen'
                ? { opacity: 1, y: 0, scale: 1, inset: '5vh 5vw', width: '90vw', height: '90vh', borderRadius: 20 }
                : { opacity: 1, y: 0, scale: 1, width: 400, height: 600, borderRadius: 20 }
            }
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className={
              uiState === 'fullscreen'
                ? 'fixed z-[160] flex flex-col overflow-hidden border border-ink-100 bg-white shadow-floating dark:border-ink-800 dark:bg-ink-900'
                : 'fixed bottom-6 right-6 z-[160] flex flex-col overflow-hidden border border-ink-100 bg-white shadow-floating dark:border-ink-800 dark:bg-ink-900'
            }
          >
            {/* Header */}
            <div className="shrink-0 border-b border-ink-100 bg-white/80 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/80">
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <p className="mr-auto text-sm font-bold text-ink-900 dark:text-white">Messages</p>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-500'}`}
                  title={status}
                  aria-hidden
                />
                <Link
                  href="/app/message-requests"
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-500 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  Requests
                </Link>
                <Link
                  href="/app/inbox"
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-500 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Full inbox
                </Link>
                <button
                  type="button"
                  aria-label={uiState === 'fullscreen' ? 'Collapse' : 'Expand'}
                  onClick={() => setUiState(uiState === 'fullscreen' ? 'panel' : 'fullscreen')}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                >
                  {uiState === 'fullscreen' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Minimize"
                  onClick={() => setUiState('minimized')}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 px-2 pt-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                        active ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className={uiState === 'fullscreen' ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
                      {active && <motion.span layoutId="chat-bubble-tab-underline" className="absolute inset-x-1.5 -bottom-0.5 h-0.5 rounded-full bg-brand-600" />}
                    </button>
                  );
                })}
              </div>

              {activeTab !== 'copilot' && (
                <div className="relative px-3 py-2">
                  <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
                    <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
                    <input
                      value={headerQuery}
                      onChange={(e) => setHeaderQuery(e.target.value)}
                      placeholder="Search chats and people..."
                      className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
                    />
                    {headerQuery && (
                      <button type="button" onClick={() => setHeaderQuery('')} aria-label="Clear search">
                        <X className="h-3.5 w-3.5 text-ink-400" />
                      </button>
                    )}
                  </div>
                  {headerQuery.trim().length >= 1 && (matchedConversations.length > 0 || (matchedPeople && matchedPeople.length > 0)) && (
                    <div className="absolute inset-x-3 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-ink-100 bg-white p-1.5 shadow-popover dark:border-ink-800 dark:bg-ink-900">
                      {matchedConversations.map((c) => (
                        <button key={c.id} type="button" onClick={() => openConversationFromSearch(c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-50 dark:hover:bg-ink-800">
                          <Avatar name={c.title} size="xs" />
                          <span className="truncate font-medium text-ink-800 dark:text-ink-100">{c.title}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-ink-400">Chat</span>
                        </button>
                      ))}
                      {matchedPeople?.filter((p) => p.id !== user?.id).map((p) => (
                        <button key={p.id} type="button" onClick={() => openPersonFromSearch(p.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-50 dark:hover:bg-ink-800">
                          <Avatar name={`${p.first_name} ${p.last_name}`} size="xs" />
                          <span className="truncate font-medium text-ink-800 dark:text-ink-100">
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-ink-400">Person</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {activeTab === 'chats' && (
                <ChatsTab
                  onStartCall={startCall}
                  layout={uiState === 'fullscreen' ? 'split' : 'stacked'}
                  activeId={chatActiveId}
                  onActiveIdChange={setChatActiveId}
                />
              )}
              {activeTab === 'channels' && <ChannelsTab onStartCall={startCall} activeId={channelActiveId} onActiveIdChange={setChannelActiveId} />}
              {activeTab === 'contacts' && <ContactsTab onOpenChat={openConversationFromSearch} />}
              {activeTab === 'copilot' && <CopilotTab />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
