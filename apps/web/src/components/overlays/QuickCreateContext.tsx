'use client';

import { createContext, useContext, useState } from 'react';
import { QuickCreate } from './QuickCreate';

type Ctx = { isOpen: boolean; open: () => void; close: () => void };
const Context = createContext<Ctx | null>(null);

export function QuickCreateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Context.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <QuickCreate open={isOpen} onClose={() => setIsOpen(false)} />
    </Context.Provider>
  );
}

export function useQuickCreate() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useQuickCreate must be used within QuickCreateProvider');
  return ctx;
}
