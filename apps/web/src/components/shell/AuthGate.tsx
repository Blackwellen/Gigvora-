'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session/SessionContext';
import { clearSession } from '@/lib/api';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isError } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isError) {
      clearSession();
      router.replace('/sign-in');
    }
  }, [isError, router]);

  if (isLoading || (!user && !isError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-ink-900">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (isError) return null;

  return <>{children}</>;
}
