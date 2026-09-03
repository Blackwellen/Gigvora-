'use client';

import { createContext, useContext, useState } from 'react';
import { ProductTourOverlay } from './ProductTourOverlay';

type Ctx = { openTourKey: string | null; openTour: (tourKey: string) => void; closeTour: () => void };
const Context = createContext<Ctx | null>(null);

export function ProductTourProvider({ children }: { children: React.ReactNode }) {
  const [openTourKey, setOpenTourKey] = useState<string | null>(null);
  return (
    <Context.Provider value={{ openTourKey, openTour: setOpenTourKey, closeTour: () => setOpenTourKey(null) }}>
      {children}
      {openTourKey && <ProductTourOverlay tourKey={openTourKey} onClose={() => setOpenTourKey(null)} />}
    </Context.Provider>
  );
}

export function useProductTourController() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useProductTourController must be used within ProductTourProvider');
  return ctx;
}
