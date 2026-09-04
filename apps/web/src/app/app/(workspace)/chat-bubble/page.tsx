'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { requestChatBubbleOpen } from '@/components/chat-bubble/FloatingChatBubble';
import { PageContainer } from '@/components/ui/PageContainer';

/**
 * Demo route for reference 10.02 ("Chat Bubble"): a normal dashboard-style page with the
 * floating chat bubble (mounted once, globally, in app/(workspace)/layout.tsx) forced open in
 * its panel state so visiting this route shows the bubble expanded over the page. This page no
 * longer owns its own inbox implementation — MessageThread (via FloatingChatBubble > ChatsTab)
 * is the single source of truth for thread rendering across the app.
 *
 * The old `?sharePost=<id>` / `?new=1` query handling that used to auto-open a private
 * new-conversation modal on this page no longer has a matching UI here (that modal was part of
 * the deleted duplicate ConversationPane). Sharing a post into a conversation is still fully
 * supported through the global bubble's own "New group"/search flow and the Inbox page's "New
 * conversation" modal — this route only demonstrates the floating panel, so those params are
 * left for the caller to route to /app/inbox?... in a future pass rather than faking support here.
 */
export default function ChatBubbleDemoPage() {
  return (
    <Suspense fallback={null}>
      <ChatBubbleDemoPageInner />
    </Suspense>
  );
}

function ChatBubbleDemoPageInner() {
  const searchParams = useSearchParams();
  const sharePostId = searchParams.get('sharePost');

  useEffect(() => {
    requestChatBubbleOpen('panel');
  }, []);

  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          This page demonstrates the floating chat bubble — it opens automatically here. Use the launcher in the bottom-right corner on any page.
        </p>
        {sharePostId && (
          <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            To share a post into a conversation, open{' '}
            <Link href="/app/inbox" className="font-semibold underline">
              the full inbox
            </Link>{' '}
            and start a new conversation from there.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Connections', value: '—' },
          { icon: TrendingUp, label: 'Profile views', value: '—' },
          { icon: BarChart3, label: 'Opportunities', value: '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-panel border border-ink-100/80 bg-white p-5 shadow-surface dark:border-ink-800/80 dark:bg-ink-900">
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">{value}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-panel border border-dashed border-ink-200 bg-white/60 p-8 text-center text-sm text-ink-400 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-500">
        <MessageCircle className="mx-auto mb-2 h-6 w-6 text-ink-300 dark:text-ink-700" />
        This is a representative background page. Real dashboard content lives at{' '}
        <Link href="/app/live-feed" className="font-semibold text-brand-600 hover:underline">
          /app/live-feed
        </Link>
        .
      </div>
    </PageContainer>
  );
}
