'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerElRef = useRef<HTMLElement | null>(null);
  // Keep a ref to the latest onClose so the effect below can stay keyed on
  // `open` alone — callers commonly pass an inline closure that gets a new
  // identity every render, and re-running this effect on every such render
  // (while the modal is open) would re-capture the wrong "opener" element
  // and re-run the autofocus, stealing focus back from whatever the user is
  // doing inside the modal.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    // Remember whatever had focus before the modal opened so it can be
    // restored when the modal closes (e.g. the button that triggered it).
    triggerElRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
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
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const autofocusTarget = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    (autofocusTarget || panelRef.current?.querySelector<HTMLElement>('a[href],button:not([disabled]),textarea,input,select'))?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      triggerElRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-[8vh]">
      <div className="fixed inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn('relative z-10 w-full animate-slide-up rounded-overlay border border-ink-100/80 bg-white shadow-floating dark:border-ink-800/80 dark:bg-ink-900', className)}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
      <h2 id="modal-title" className="font-display text-base font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
        aria-label="Close"
      >
        <X className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
