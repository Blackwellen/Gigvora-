'use client';

import { QueryProvider } from '@/lib/query-provider';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { SessionProvider } from '@/lib/session/SessionContext';
import { WorkspaceProvider } from '@/lib/workspace/WorkspaceContext';
import { CommandPaletteProvider } from '@/components/overlays/CommandPaletteContext';
import { QuickCreateProvider } from '@/components/overlays/QuickCreateContext';
import { UniversalSearchProvider } from '@/components/overlays/UniversalSearchContext';
import { ProductTourProvider } from '@/components/overlays/ProductTourContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SessionProvider>
          <WorkspaceProvider>
            <CommandPaletteProvider>
              <QuickCreateProvider>
                <UniversalSearchProvider>
                  <ProductTourProvider>{children}</ProductTourProvider>
                </UniversalSearchProvider>
              </QuickCreateProvider>
            </CommandPaletteProvider>
          </WorkspaceProvider>
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
