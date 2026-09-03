'use client';

import { useState } from 'react';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useDirectorySearch, useSuggestedContacts, usePresence, type DirectoryPerson } from '@/hooks/useChatBubbleData';
import { useStartConversation } from '@/hooks/useInbox';
import { useSession } from '@/lib/session/SessionContext';

export function ContactsTab({ onOpenChat }: { onOpenChat: (conversationId: string) => void }) {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const { data: searchResults, isFetching } = useDirectorySearch(query);
  const { data: suggested, isLoading: suggestedLoading } = useSuggestedContacts();
  const { isOnline } = usePresence();
  const startConversation = useStartConversation();
  const [startingId, setStartingId] = useState<string | null>(null);

  const people: DirectoryPerson[] = (query.trim().length >= 2 ? searchResults : suggested)?.filter((p) => p.id !== user?.id) || [];
  const loading = query.trim().length >= 2 ? isFetching : suggestedLoading;

  async function startChat(personId: string) {
    setStartingId(personId);
    try {
      const conversationId = await startConversation.mutateAsync(personId);
      onOpenChat(conversationId);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-ink-100 p-3 dark:border-ink-800">
        <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
          <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts..."
            className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}
        {!loading && people.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
            <p className="font-semibold text-ink-600 dark:text-ink-300">No contacts found</p>
            <p>Try a different name or headline.</p>
          </div>
        )}
        {people.map((person) => (
          <div key={person.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
            <Avatar name={`${person.first_name} ${person.last_name}`} size="sm" online={isOnline(person.id)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                {person.first_name} {person.last_name}
              </span>
              {person.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{person.headline}</span>}
            </span>
            <button
              type="button"
              aria-label={`Message ${person.first_name}`}
              disabled={startingId === person.id}
              onClick={() => startChat(person.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-brand-500/10"
            >
              {startingId === person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
