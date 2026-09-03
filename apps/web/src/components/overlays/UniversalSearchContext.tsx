'use client';

import { createContext, useContext, useState } from 'react';
import { UniversalSearch } from './UniversalSearch';

type Ctx = { isOpen: boolean; open: () => void; close: () => void };
const Context = createContext<Ctx | null>(null);

export function UniversalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Context.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <UniversalSearch open={isOpen} onClose={() => setIsOpen(false)} />
    </Context.Provider>
  );
}

export function useUniversalSearch() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useUniversalSearch must be used within UniversalSearchProvider');
  return ctx;
}
