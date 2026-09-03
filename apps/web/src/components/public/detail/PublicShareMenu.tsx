'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

/**
 * Reusable "Share" action for public detail pages. Copies the current page's
 * canonical URL to the clipboard and shows a brief confirmation — no external
 * share SDK, no fabricated share-count. Works for anonymous visitors since
 * clipboard copy needs no auth.
 */
export function PublicShareMenu({ className, label = 'Share' }: { className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for browsers without async clipboard support.
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — fail silently, no crash.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleShare}
      className={cn('relative', className)}
      aria-live="polite"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Link copied' : label}
    </Button>
  );
}
