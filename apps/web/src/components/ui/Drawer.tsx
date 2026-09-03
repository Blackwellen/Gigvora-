'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export function Drawer({
  open,
  onClose,
  children,
  side = 'right',
  width = 'w-[420px]',
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
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
    (autofocusTarget ?? panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="fixed inset-0 animate-fade-in bg-ink-950/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'fixed top-0 flex h-full flex-col bg-white shadow-floating animate-slide-up dark:bg-ink-900',
          side === 'right' ? 'right-0' : 'left-0',
          width
        )}
        style={{ animationName: 'slide-up' }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
