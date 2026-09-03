'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
};

const PopoverCtx = createContext<Ctx | null>(null);

export function Popover({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (controlledOpen === undefined) setInternalOpen(v);
  };

  return <PopoverCtx.Provider value={{ open, setOpen, triggerRef }}>
    <div className="relative inline-block">{children}</div>
  </PopoverCtx.Provider>;
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = useContext(PopoverCtx);
  if (!ctx) throw new Error('PopoverTrigger must be used inside Popover');
  void asChild;

  return (
    <span
      ref={ctx.triggerRef as React.RefObject<HTMLSpanElement>}
      onClick={() => ctx.setOpen(!ctx.open)}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
    >
      {children}
    </span>
  );
}

export function PopoverContent({
  children,
  align = 'end',
  className,
  width = 'w-72',
}: {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
  width?: string;
}) {
  const ctx = useContext(PopoverCtx);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx?.open) return;
    function focusables() {
      return ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
    }
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (ctx?.triggerRef.current?.contains(target)) return;
      ctx?.setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        ctx?.setOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        // Trap focus inside the open menu, matching the Modal primitive's behavior.
        const items = focusables();
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // Move focus into the menu for keyboard users, like a native menu would.
    focusables()?.[0]?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      // Restore focus to whatever opened the menu.
      ctx?.triggerRef.current?.querySelector<HTMLElement>('button,a,[tabindex]')?.focus();
    };
    // Deliberately keyed only on ctx?.open (not ctx itself): the context
    // object is a fresh literal every Popover render, but triggerRef/setOpen
    // stay referentially stable underneath it. Depending on ctx too would
    // re-run this effect (and re-steal focus) on every unrelated parent
    // re-render while the menu is open — e.g. a realtime reaction count
    // ticking on the post this popover belongs to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.open]);

  if (!ctx?.open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute z-50 mt-2 origin-top animate-scale-in rounded-sheet border border-ink-100/80 bg-white p-2 shadow-popover dark:border-ink-800/80 dark:bg-ink-900',
        align === 'end' && 'right-0',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        width,
        className
      )}
    >
      {children}
    </div>
  );
}

export function usePopoverClose() {
  const ctx = useContext(PopoverCtx);
  return () => ctx?.setOpen(false);
}
