'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Repeat2, MessageSquareQuote, Send, Link as LinkIcon, Check } from 'lucide-react';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSharePost } from '@/hooks/useFeed';

export function PostShareMenu({ postId, open, onClose }: { postId: string; open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'comment'>('menu');
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const share = useSharePost();
  const router = useRouter();

  function close() {
    setMode('menu');
    setComment('');
    onClose();
  }

  async function repost() {
    await share.mutateAsync({ postId, shareType: 'repost' });
    close();
  }

  async function repostWithComment() {
    await share.mutateAsync({ postId, shareType: 'repost_with_comment', comment });
    close();
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/app/post-detail/${postId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={close} className="max-w-sm" labelledBy="modal-title">
      <ModalHeader title="Share post" onClose={close} />
      {mode === 'menu' ? (
        <div className="space-y-0.5 p-2">
          <ShareOption icon={Repeat2} label="Repost" description="Instantly share to your network" onClick={repost} />
          <ShareOption icon={MessageSquareQuote} label="Repost with your thoughts" description="Add a comment before sharing" onClick={() => setMode('comment')} />
          <ShareOption
            icon={Send}
            label="Send via Inbox"
            description="Share this post in a direct message"
            onClick={() => {
              close();
              router.push(`/app/chat-bubble?sharePost=${postId}`);
            }}
          />
          <ShareOption icon={copied ? Check : LinkIcon} label={copied ? 'Link copied' : 'Copy link'} description="Copy a direct link to this post" onClick={copyLink} />
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <textarea
            id="repost-comment"
            name="repostComment"
            autoFocus
            data-autofocus
            aria-label="Your thoughts on this repost"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Add your thoughts..."
            className="w-full resize-none rounded-lg border border-ink-200 dark:border-ink-700 p-2.5 text-sm focus:border-brand-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMode('menu')}>
              Back
            </Button>
            <Button onClick={repostWithComment} loading={share.isPending}>
              Repost
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ShareOption({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof Repeat2;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-900 dark:text-white">{label}</span>
        <span className="block text-xs text-ink-500 dark:text-ink-400">{description}</span>
      </span>
    </button>
  );
}
