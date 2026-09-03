'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CommandPalette } from './CommandPalette';

type Ctx = { isOpen: boolean; open: () => void; close: () => void };
const PaletteCtx = createContext<Ctx | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteCtx.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <CommandPalette open={isOpen} onClose={() => setIsOpen(false)} />
    </PaletteCtx.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(PaletteCtx);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}
