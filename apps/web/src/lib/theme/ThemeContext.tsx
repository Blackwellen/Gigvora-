'use client';

import { createContext, useContext } from 'react';

// Dark mode has been removed from the product — the app is light-only.
// This context is kept as a stable no-op so existing consumers (useTheme())
// don't need per-file changes; setTheme is a no-op and resolvedTheme is
// always 'light'.
type Theme = 'light' | 'dark' | 'system';
type Ctx = { theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (t: Theme) => void };

const FIXED_VALUE: Ctx = { theme: 'light', resolvedTheme: 'light', setTheme: () => {} };

const ThemeCtx = createContext<Ctx>(FIXED_VALUE);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeCtx.Provider value={FIXED_VALUE}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
