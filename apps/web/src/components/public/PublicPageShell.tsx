'use client';

import { useEffect } from 'react';
import { PublicFooter } from './PublicFooter';
import { TechnicalContextFooter } from './TechnicalContextFooter';
import type { PublicPageId } from '@/lib/publicPageRegistry';

// Canonical body wrapper for every Domain 02 public page. PublicHeader is
// mounted once in the (public)/(marketing) route-group layouts so it never
// drifts between pages; this wraps page content + footer + the QA-only
// technical-context strip.
export function PublicPageShell({ pageId, children }: { pageId: PublicPageId; children: React.ReactNode }) {
  // These marketing/public pages are designed light-only. Shared UI
  // primitives (Card, Tabs, Modal, etc.) carry `dark:` variants for the
  // signed-in app shell, and Tailwind's `dark` class is toggled globally
  // based on the visitor's OS colour-scheme preference. Without this guard,
  // a visitor with system dark mode enabled sees a broken mix of dark
  // primitives on an otherwise light public page. Force light while a
  // public page is mounted; restore whatever was there on unmount so the
  // signed-in app's own theme toggle is unaffected.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    const enforceLight = () => {
      if (root.classList.contains('dark')) root.classList.remove('dark');
    };
    enforceLight();
    // ThemeProvider (mounted above this shell) applies the visitor's system
    // colour-scheme preference asynchronously and reacts to OS-level
    // changes, so a one-time removal can be overwritten after this effect
    // runs. Watch the class attribute for as long as a public page is
    // mounted and keep forcing it back to light.
    const observer = new MutationObserver(enforceLight);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (hadDark) root.classList.add('dark');
    };
  }, []);

  return (
    <>
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <PublicFooter />
      <TechnicalContextFooter pageId={pageId} />
    </>
  );
}
